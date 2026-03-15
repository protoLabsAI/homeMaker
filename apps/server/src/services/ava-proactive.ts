/**
 * AvaProactiveService — generates unsolicited Ava messages for critical alerts.
 *
 * Checks for conditions that warrant proactive notification:
 *   - Maintenance tasks overdue by 5+ days
 *   - Warranty expirations within 30 days
 *
 * Rate limited to a maximum of 2 proactive messages per day to avoid spam.
 */

import { createLogger } from '@protolabsai/utils';
import { RateLimiter } from '../lib/rate-limiter.js';
import type { MaintenanceService } from './maintenance-service.js';
import type { InventoryService } from './inventory-service.js';

const logger = createLogger('AvaProactiveService');

/** Rate limit: max 2 proactive messages per day (treated as per-hour with 24hr window) */
const PROACTIVE_LIMITER_KEY = 'ava-proactive';

interface ProactiveAlert {
  content: string;
  metadata: Record<string, unknown>;
}

export class AvaProactiveService {
  private maintenanceService: MaintenanceService;
  private inventoryService: InventoryService;
  private rateLimiter: RateLimiter;

  constructor(deps: {
    maintenanceService: MaintenanceService;
    inventoryService: InventoryService;
  }) {
    this.maintenanceService = deps.maintenanceService;
    this.inventoryService = deps.inventoryService;
    // 2 per day approximated as 2 per hour with longer cooldown
    this.rateLimiter = new RateLimiter({
      cooldownSeconds: 60 * 60, // 1 hour minimum between proactive messages
      maxPerHour: 2,
    });
  }

  /**
   * Check for conditions that warrant a proactive Ava message.
   * Returns an alert if one should be sent, or null if nothing is urgent
   * or the rate limit has been reached.
   */
  checkForAlerts(): ProactiveAlert | null {
    const limitResult = this.rateLimiter.check(PROACTIVE_LIMITER_KEY);
    if (!limitResult.allowed) {
      logger.info(`Proactive alert suppressed: ${limitResult.reason}`);
      return null;
    }

    const overdueAlert = this.checkOverdueMaintenance();
    if (overdueAlert) return overdueAlert;

    const warrantyAlert = this.checkExpiringWarranties();
    if (warrantyAlert) return warrantyAlert;

    return null;
  }

  private checkOverdueMaintenance(): ProactiveAlert | null {
    try {
      const overdue = this.maintenanceService.getOverdue();
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      const severelyOverdue = overdue.filter((task) => new Date(task.nextDueAt) < fiveDaysAgo);

      if (severelyOverdue.length === 0) return null;

      const taskList = severelyOverdue
        .slice(0, 3)
        .map((t) => t.title)
        .join(', ');

      return {
        content: `Heads up -- ${severelyOverdue.length} maintenance task${severelyOverdue.length > 1 ? 's are' : ' is'} overdue by 5+ days: ${taskList}. Would you like me to help prioritize these?`,
        metadata: {
          alertType: 'overdue-maintenance',
          taskIds: severelyOverdue.map((t) => t.id),
        },
      };
    } catch (error) {
      logger.error('Failed to check overdue maintenance:', error);
      return null;
    }
  }

  private checkExpiringWarranties(): ProactiveAlert | null {
    try {
      const report = this.inventoryService.getWarrantyReport();
      const expiringSoon = report.expiringSoon ?? [];

      if (expiringSoon.length === 0) return null;

      const itemList = expiringSoon
        .slice(0, 3)
        .map((item) => item.name)
        .join(', ');

      return {
        content: `Warranty reminder: ${expiringSoon.length} item${expiringSoon.length > 1 ? 's have' : ' has'} warranties expiring within 30 days: ${itemList}. You may want to review coverage options.`,
        metadata: {
          alertType: 'warranty-expiration',
          assetIds: expiringSoon.map((item) => item.id),
        },
      };
    } catch (error) {
      logger.error('Failed to check expiring warranties:', error);
      return null;
    }
  }
}
