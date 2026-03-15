import { isTauri } from '@tauri-apps/api/core';

/**
 * Returns true when running inside the Tauri desktop app.
 * Use this instead of the old isElectron() checks for platform-agnostic
 * desktop detection.
 */
export const isDesktopApp = (): boolean => {
  return isTauri();
};
