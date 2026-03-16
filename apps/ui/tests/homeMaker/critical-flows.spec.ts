/**
 * Critical User Flow E2E Tests — homeMaker
 *
 * Covers four cross-service integration flows:
 *   1. Register sensor → submit reading → query history
 *   2. Create maintenance task → mark complete → verify XP awarded
 *   3. Add inventory item → link to sensor → verify sensor readings
 *   4. Complete gamification milestone → check achievement unlock
 */

import { test, expect, Page } from '@playwright/test';
import { API_BASE_URL } from '../utils/core/constants';
import { authenticateForTests } from '../utils/api/client';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Authenticate for tests, supporting both:
 * - Auto-login dev mode (AUTOMAKER_AUTO_LOGIN=true): GET /api/auth/status sets cookie
 * - Standard API key mode (AUTOMAKER_API_KEY env var)
 *
 * Auto-login is tried first to avoid consuming login-rate-limit attempts.
 */
async function ensureAuthenticated(page: Page): Promise<void> {
  // Step 1: Check current auth status — auto-login will set the session cookie if enabled
  const statusRes = await page.request.get(`${API_BASE_URL}/api/auth/status`);
  const statusBody = (await statusRes.json()) as { authenticated?: boolean };
  if (statusBody.authenticated) return;

  // Step 2: Fall back to API key login (CI / test environments without auto-login)
  const success = await authenticateForTests(page);
  if (success) return;

  throw new Error(
    'Failed to authenticate for E2E tests. ' +
      'Set AUTOMAKER_API_KEY or AUTOMAKER_AUTO_LOGIN=true on the server.'
  );
}

/** Make an authenticated GET request to the API */
async function apiGet(page: Page, path: string) {
  const res = await page.request.get(`${API_BASE_URL}${path}`);
  return { status: res.status(), body: (await res.json()) as Record<string, unknown> };
}

/** Make an authenticated POST request to the API */
async function apiPost(page: Page, path: string, data: Record<string, unknown>) {
  const res = await page.request.post(`${API_BASE_URL}${path}`, {
    data,
    headers: { 'Content-Type': 'application/json' },
  });
  return { status: res.status(), body: (await res.json()) as Record<string, unknown> };
}

/** Make an authenticated PATCH request to the API */
async function apiPatch(page: Page, path: string, data: Record<string, unknown>) {
  const res = await page.request.patch(`${API_BASE_URL}${path}`, {
    data,
    headers: { 'Content-Type': 'application/json' },
  });
  return { status: res.status(), body: (await res.json()) as Record<string, unknown> };
}

// ============================================================================
// Flow 1 — Sensor lifecycle: register → report → query history
// ============================================================================

test.describe('Flow 1: Sensor lifecycle', () => {
  test('register sensor → submit reading → query history', async ({ page }) => {
    await ensureAuthenticated(page);

    const sensorId = `test-sensor-${Date.now()}`;

    // Step 1: Register sensor
    const { status: registerStatus, body: registerBody } = await apiPost(
      page,
      '/api/sensors/register',
      { id: sensorId, name: 'Living Room Temperature', description: 'E2E test sensor' }
    );

    expect(registerStatus).toBe(201);
    expect(registerBody.success).toBe(true);
    const sensor = registerBody.sensor as Record<string, unknown>;
    expect(sensor.id).toBe(sensorId);
    expect(sensor.name).toBe('Living Room Temperature');

    // Step 2: Submit a reading
    const { status: reportStatus, body: reportBody } = await apiPost(page, '/api/sensors/report', {
      sensorId,
      data: { temperature: 22.5, unit: 'celsius' },
    });

    expect(reportStatus).toBe(200);
    expect(reportBody.success).toBe(true);
    const reading = reportBody.reading as Record<string, unknown>;
    expect(reading.sensorId).toBe(sensorId);
    const readingData = reading.data as Record<string, unknown>;
    expect(readingData.temperature).toBe(22.5);

    // Submit a second reading to verify history accumulates
    await apiPost(page, '/api/sensors/report', {
      sensorId,
      data: { temperature: 23.1, unit: 'celsius' },
    });

    // Step 3: Query history
    const { status: historyStatus, body: historyBody } = await apiGet(
      page,
      `/api/sensors/${sensorId}/history`
    );

    expect(historyStatus).toBe(200);
    expect(historyBody.success).toBe(true);
    const readings = historyBody.readings as unknown[];
    expect(readings.length).toBeGreaterThanOrEqual(2);

    // Most-recent reading should have the second temperature value
    const firstReading = readings[0] as Record<string, unknown>;
    const firstData = firstReading.data as Record<string, unknown>;
    expect(firstData.temperature).toBe(23.1);
  });
});

// ============================================================================
// Flow 2 — Maintenance lifecycle: create task → complete → verify XP awarded
// ============================================================================

test.describe('Flow 2: Maintenance completion awards XP', () => {
  test('create maintenance task → mark complete → XP increases', async ({ page }) => {
    await ensureAuthenticated(page);

    // Baseline XP before the completion (profile uses `xp` field, not `totalXp`)
    const { body: profileBefore } = await apiGet(page, '/api/gamification/profile');
    expect(profileBefore.success).toBe(true);
    const dataBefore = profileBefore.data as Record<string, unknown>;
    const xpBefore = dataBefore.xp as number;

    // Step 1: Create a maintenance schedule
    const { status: createStatus, body: createBody } = await apiPost(page, '/api/maintenance', {
      title: `E2E HVAC Filter Check ${Date.now()}`,
      description: 'Replace HVAC filter every 90 days',
      intervalDays: 90,
      category: 'hvac',
    });

    expect(createStatus).toBe(201);
    expect(createBody.success).toBe(true);
    const schedule = createBody.data as Record<string, unknown>;
    const scheduleId = schedule.id as string;
    expect(typeof scheduleId).toBe('string');

    // Step 2: Mark the task as complete
    const { status: completeStatus, body: completeBody } = await apiPost(
      page,
      `/api/maintenance/${scheduleId}/complete`,
      {
        completedBy: 'E2E Test Runner',
        notes: 'Completed during automated E2E test',
      }
    );

    expect(completeStatus).toBe(201);
    expect(completeBody.success).toBe(true);
    // Completion response is nested: { data: { schedule: {...}, completion: {...} } }
    const completionData = completeBody.data as Record<string, unknown>;
    const completion = completionData.completion as Record<string, unknown>;
    expect(completion.scheduleId).toBe(scheduleId);

    // Step 3: Verify XP was awarded (profile uses `xp` field)
    const { body: profileAfter } = await apiGet(page, '/api/gamification/profile');
    expect(profileAfter.success).toBe(true);
    const dataAfter = profileAfter.data as Record<string, unknown>;
    const xpAfter = dataAfter.xp as number;

    expect(xpAfter).toBeGreaterThan(xpBefore);
  });
});

// ============================================================================
// Flow 3 — Inventory + sensor integration: add item → link sensor → verify readings
// ============================================================================

test.describe('Flow 3: Inventory item linked to sensor readings', () => {
  test('add inventory item → link to sensor → verify sensor readings visible', async ({ page }) => {
    await ensureAuthenticated(page);

    const sensorId = `inv-sensor-${Date.now()}`;

    // Step 1: Register a sensor to link to
    const { status: sensorStatus, body: sensorBody } = await apiPost(
      page,
      '/api/sensors/register',
      { id: sensorId, name: 'HVAC Unit Monitor', description: 'Monitors HVAC runtime' }
    );
    expect(sensorStatus).toBe(201);
    expect(sensorBody.success).toBe(true);

    // Step 2: Add an inventory item (without sensor initially)
    const { status: createStatus, body: createBody } = await apiPost(page, '/api/inventory', {
      name: `HVAC Unit ${Date.now()}`,
      category: 'hvac',
      location: 'Basement',
      notes: 'Central air handler',
    });

    expect(createStatus).toBe(201);
    expect(createBody.success).toBe(true);
    const asset = createBody.data as Record<string, unknown>;
    const assetId = asset.id as string;
    expect(typeof assetId).toBe('string');

    // Step 3: Link the sensor to the inventory item
    const { status: patchStatus, body: patchBody } = await apiPatch(
      page,
      `/api/inventory/${assetId}`,
      { sensorIds: [sensorId] }
    );

    expect(patchStatus).toBe(200);
    expect(patchBody.success).toBe(true);
    const updated = patchBody.data as Record<string, unknown>;
    const linkedSensors = updated.sensorIds as string[];
    expect(linkedSensors).toContain(sensorId);

    // Step 4: Submit a sensor reading
    const { status: reportStatus, body: reportBody } = await apiPost(page, '/api/sensors/report', {
      sensorId,
      data: { runtime_hours: 1250, status: 'ok' },
    });

    expect(reportStatus).toBe(200);
    expect(reportBody.success).toBe(true);

    // Step 5: Verify the reading is in sensor history
    const { status: historyStatus, body: historyBody } = await apiGet(
      page,
      `/api/sensors/${sensorId}/history`
    );

    expect(historyStatus).toBe(200);
    expect(historyBody.success).toBe(true);
    const readings = historyBody.readings as unknown[];
    expect(readings.length).toBeGreaterThanOrEqual(1);
    const latestReading = readings[0] as Record<string, unknown>;
    const latestData = latestReading.data as Record<string, unknown>;
    expect(latestData.runtime_hours).toBe(1250);

    // Step 6: Verify the inventory item still references the sensor
    const { status: getStatus, body: getBody } = await apiGet(page, `/api/inventory/${assetId}`);
    expect(getStatus).toBe(200);
    expect(getBody.success).toBe(true);
    const fetchedAsset = getBody.data as Record<string, unknown>;
    const fetchedSensorIds = fetchedAsset.sensorIds as string[];
    expect(fetchedSensorIds).toContain(sensorId);
  });
});

// ============================================================================
// Flow 4 — Gamification milestone: complete task → achievement unlocked
// ============================================================================

test.describe('Flow 4: Achievement unlock after completing gamification milestone', () => {
  test('completing first maintenance task unlocks achievement', async ({ page }) => {
    await ensureAuthenticated(page);

    // Get the achievement catalog to find the "first maintenance" achievement
    const { body: catalogBody } = await apiGet(page, '/api/gamification/achievements');
    expect(catalogBody.success).toBe(true);
    const achievements = catalogBody.data as Array<Record<string, unknown>>;
    expect(achievements.length).toBeGreaterThan(0);

    // Identify the first-maintenance achievement (may already be earned from Flow 2,
    // but we verify at least one achievement is earneable via maintenance completion)
    const maintenanceAchievement = achievements.find(
      (a) =>
        typeof a.id === 'string' &&
        (a.id.toLowerCase().includes('maintenance') ||
          (typeof a.description === 'string' &&
            a.description.toLowerCase().includes('maintenance')))
    );
    expect(maintenanceAchievement).toBeDefined();

    // Create a maintenance task and complete it to ensure the milestone is triggered
    const { status: createStatus, body: createBody } = await apiPost(page, '/api/maintenance', {
      title: `Achievement Test Task ${Date.now()}`,
      description: 'Task to trigger gamification milestone',
      intervalDays: 30,
      category: 'safety',
    });

    expect(createStatus).toBe(201);
    expect(createBody.success).toBe(true);
    const schedule = createBody.data as Record<string, unknown>;
    const scheduleId = schedule.id as string;

    const { status: completeStatus, body: completeBody } = await apiPost(
      page,
      `/api/maintenance/${scheduleId}/complete`,
      { completedBy: 'E2E Test Runner' }
    );

    expect(completeStatus).toBe(201);
    expect(completeBody.success).toBe(true);

    // Verify the achievement is now earned
    const { body: achievementsAfter } = await apiGet(page, '/api/gamification/achievements');
    expect(achievementsAfter.success).toBe(true);
    const achievementsUpdated = achievementsAfter.data as Array<Record<string, unknown>>;

    // Achievement catalog uses `earned` (boolean) and `unlockedAt` (ISO string or null)
    const earnedMaintenanceAchievement = achievementsUpdated.find(
      (a) =>
        typeof a.id === 'string' &&
        (a.id.toLowerCase().includes('maintenance') ||
          a.id.toLowerCase().includes('schedule') ||
          (typeof a.description === 'string' &&
            a.description.toLowerCase().includes('maintenance'))) &&
        a.earned === true &&
        a.unlockedAt !== null &&
        a.unlockedAt !== undefined
    );
    expect(earnedMaintenanceAchievement).toBeDefined();

    // Also verify the gamification profile reflects earned achievements
    // Profile achievements is an array of { id, unlockedAt, seen }
    const { body: profileBody } = await apiGet(page, '/api/gamification/profile');
    expect(profileBody.success).toBe(true);
    const profile = profileBody.data as Record<string, unknown>;
    const earnedAchievements = profile.achievements as unknown[];
    expect(earnedAchievements.length).toBeGreaterThanOrEqual(1);
  });
});
