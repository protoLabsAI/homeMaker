import { createLogger } from '@protolabsai/utils';

import type { ServiceContainer } from '../server/services.js';

const logger = createLogger('Server:Wiring');

/**
 * Daily maintenance tick logic.
 *
 * For each configured project:
 * - Creates calendar events (type: 'maintenance') for schedules due within 7 days.
 * - Creates high-priority todo items for overdue schedules.
 * - Uses sourceId to prevent duplicate events/todos on repeated runs.
 * - Emits a notification for each overdue schedule.
 */
async function runMaintenanceTick(container: ServiceContainer): Promise<void> {
  const { settingsService, maintenanceService, calendarService, todoService, notificationService } =
    container;

  const globalSettings = await settingsService.getGlobalSettings();
  const projects = globalSettings.projects ?? [];

  const today = new Date().toISOString().slice(0, 10);

  for (const project of projects) {
    try {
      await processProjectMaintenance(project.path, today, {
        maintenanceService,
        calendarService,
        todoService,
        notificationService,
      });
    } catch (err) {
      logger.error('Maintenance tick failed for project', { projectPath: project.path, err });
    }
  }
}

interface MaintenanceDeps {
  maintenanceService: ServiceContainer['maintenanceService'];
  calendarService: ServiceContainer['calendarService'];
  todoService: ServiceContainer['todoService'];
  notificationService: ServiceContainer['notificationService'];
}

async function processProjectMaintenance(
  projectPath: string,
  today: string,
  deps: MaintenanceDeps
): Promise<void> {
  const { maintenanceService, calendarService, todoService, notificationService } = deps;

  // ── Upcoming schedules → calendar events ──────────────────────────────────

  const upcoming = maintenanceService.getUpcoming(7);

  // Fetch existing maintenance calendar events once for dedup check
  const existingCalendarEvents = await calendarService.listEvents(projectPath, {
    types: ['maintenance'],
  });
  const existingCalendarSourceIds = new Set(
    existingCalendarEvents.map((e) => e.sourceId).filter(Boolean)
  );

  for (const schedule of upcoming) {
    // sourceId encodes schedule + due date for idempotent dedup
    const sourceId = `maintenance:${schedule.id}:${schedule.nextDueAt}`;
    if (existingCalendarSourceIds.has(sourceId)) {
      continue; // already created for this run date
    }

    const descriptionParts: string[] = [];
    if (schedule.assetName) descriptionParts.push(`Asset: ${schedule.assetName}`);
    if (schedule.vendorName) {
      descriptionParts.push(`Vendor: ${schedule.vendorName}`);
    }
    if (schedule.estimatedCostUsd !== null) {
      descriptionParts.push(`Estimated cost: $${schedule.estimatedCostUsd.toFixed(2)}`);
    }
    if (schedule.description) descriptionParts.push(schedule.description);

    try {
      await calendarService.createEvent(projectPath, {
        title: schedule.title,
        date: schedule.nextDueAt.slice(0, 10),
        type: 'maintenance',
        allDay: true,
        sourceId,
        description: descriptionParts.join('\n') || undefined,
      });
      logger.info(
        `Created maintenance calendar event for "${schedule.title}" on ${schedule.nextDueAt}`
      );
    } catch (err) {
      logger.error(`Failed to create calendar event for schedule ${schedule.id}`, err);
    }
  }

  // ── Overdue schedules → todo items ────────────────────────────────────────

  const overdue = maintenanceService.getOverdue();
  if (overdue.length === 0) return;

  // Load todos once and build a set of existing overdue titles to dedup
  const allLists = await todoService.getAllLists(projectPath);
  const sharedList = allLists.find((l) => l.ownerType === 'shared') ?? null;

  const existingOverdueTitles = new Set<string>();
  if (sharedList) {
    for (const item of sharedList.items) {
      if (!item.completed && item.title.startsWith('OVERDUE: ')) {
        existingOverdueTitles.add(item.title);
      }
    }
  }

  // Ensure we have a list to write to
  let listId: string;
  if (sharedList) {
    listId = sharedList.id;
  } else {
    const newList = await todoService.createList(projectPath, 'Todo', 'shared');
    listId = newList.id;
  }

  for (const schedule of overdue) {
    const todoTitle = `OVERDUE: ${schedule.title}`;
    if (existingOverdueTitles.has(todoTitle)) {
      continue; // already created for this schedule
    }

    try {
      await todoService.addItem(projectPath, listId, {
        title: todoTitle,
        priority: 3, // high
        dueDate: today,
        description:
          [
            schedule.assetName ? `Asset: ${schedule.assetName}` : null,
            schedule.vendorName ? `Vendor: ${schedule.vendorName}` : null,
            `Due: ${schedule.nextDueAt.slice(0, 10)}`,
          ]
            .filter(Boolean)
            .join('\n') || undefined,
      });

      // Emit notification via notificationService (which fires notification:created on the event bus)
      await notificationService.createNotification({
        type: 'maintenance_overdue',
        title: 'Overdue Maintenance',
        message: `"${schedule.title}" is overdue${schedule.assetName ? ` for ${schedule.assetName}` : ''}.`,
        projectPath,
      });

      logger.info(`Created overdue todo for maintenance schedule "${schedule.title}"`);
    } catch (err) {
      logger.error(`Failed to create overdue todo for schedule ${schedule.id}`, err);
    }
  }
}

/**
 * Wires scheduler service initialization and registers automations + maintenance tasks.
 *
 * Delegates to automationService.syncWithScheduler() which:
 * 1. Registers built-in maintenance tasks
 * 2. Registers any user-defined cron automations from storage
 */
export function register(container: ServiceContainer): void {
  const {
    events,
    dataDir,
    settingsService,
    schedulerService,
    automationService,
    autoModeService,
    featureHealthService,
    integrityWatchdogService,
    featureLoader,
  } = container;

  // Scheduler Service initialization and task registration via AutomationService
  schedulerService.initialize(events, dataDir);
  schedulerService.setSettingsService(settingsService);
  void schedulerService
    .start()
    .then(async () => {
      await automationService.syncWithScheduler({
        events,
        autoModeService,
        featureHealthService,
        integrityWatchdogService,
        featureLoader,
        settingsService,
      });

      // Register calendar job executor — scans for due jobs every minute
      await schedulerService.registerTask(
        'job-executor:tick',
        'Calendar Job Executor',
        '* * * * *',
        () => container.jobExecutorService.tick(),
        true
      );

      // Register periodic Google Calendar sync — runs every 6 hours for all connected projects
      await schedulerService.registerTask(
        'google-calendar:sync',
        'Google Calendar Sync',
        '0 */6 * * *',
        async () => {
          const globalSettings = await settingsService.getGlobalSettings();
          const projects = globalSettings.projects ?? [];

          for (const project of projects) {
            const projectSettings = await settingsService.getProjectSettings(project.path);
            const google = projectSettings.integrations?.google;

            if (!google?.accessToken || !google?.refreshToken) {
              continue; // Google Calendar not connected for this project
            }

            try {
              const result = await container.googleCalendarSyncService.syncFromGoogle(project.path);
              logger.info('Scheduled Google Calendar sync complete', {
                projectPath: project.path,
                ...result,
              });
            } catch (err) {
              logger.error('Scheduled Google Calendar sync failed', {
                projectPath: project.path,
                err,
              });
            }
          }
        },
        true
      );

      // Register daily maintenance scheduler tick — runs at 8 AM daily
      // Creates calendar events for upcoming schedules and todo items for overdue ones.
      await schedulerService.registerTask(
        'maintenance:tick',
        'Maintenance Scheduler Tick',
        '0 8 * * *',
        async () => {
          events.emit('maintenance:tick', { triggeredAt: new Date().toISOString() });
          await runMaintenanceTick(container);
        },
        true
      );

      // Initialize and register daily standup cron (every 15 minutes)
      container.dailyStandupService.initialize(
        settingsService,
        featureLoader,
        container.discordBotService,
        schedulerService,
        dataDir
      );
      await container.dailyStandupService.registerCronTask();

      // Apply taskOverrides from global settings after all tasks are registered
      await schedulerService.applySettingsOverrides();
    })
    .catch((err) => {
      logger.error('Scheduler startup or automation sync failed:', err);
    });
}
