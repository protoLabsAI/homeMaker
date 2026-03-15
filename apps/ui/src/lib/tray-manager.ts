/**
 * Tray manager for the Tauri desktop app.
 *
 * The system tray icon is configured in Rust (src-tauri/src/lib.rs).
 * This module provides the TypeScript side for updating tray state
 * from the frontend (e.g., updating the health score indicator).
 *
 * Status colors:
 *   green  - healthy (score >= 80)
 *   yellow - degraded (score 50-79)
 *   red    - critical (score < 50)
 */
import { isDesktopApp } from './utils/is-desktop-app';

export type TrayHealthStatus = 'healthy' | 'degraded' | 'critical';

/**
 * Derives a tray health status from a numeric score (0-100).
 */
export const getTrayHealthStatus = (score: number): TrayHealthStatus => {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'degraded';
  return 'critical';
};

/**
 * Updates the system tray tooltip with the current home health score.
 * No-op in web mode.
 */
export const updateTrayTooltip = async (score: number): Promise<void> => {
  if (!isDesktopApp()) return;

  try {
    const { TrayIcon } = await import('@tauri-apps/api/tray');
    const trays = await TrayIcon.getById('homemaker-tray');
    if (trays) {
      const status = getTrayHealthStatus(score);
      const label = { healthy: 'Good', degraded: 'Fair', critical: 'Poor' }[status];
      await trays.setTooltip(`homeMaker — Home Health: ${label} (${score}/100)`);
    }
  } catch {
    // Tray may not be available on all platforms; fail silently
  }
};
