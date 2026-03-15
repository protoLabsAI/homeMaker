import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification';
import { isDesktopApp } from './utils/is-desktop-app';

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
}

/**
 * Sends an OS-level desktop notification.
 * Requests permission if needed (required on macOS).
 * Falls back to the browser Notification API in web mode.
 */
export const notify = async (options: NotificationOptions): Promise<void> => {
  if (isDesktopApp()) {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (permissionGranted) {
      sendNotification({
        title: options.title,
        body: options.body,
        icon: options.icon,
      });
    }
    return;
  }

  // Web fallback: browser Notification API
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(options.title, { body: options.body, icon: options.icon });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(options.title, { body: options.body, icon: options.icon });
      }
    }
  }
};
