/**
 * Local storage utilities for persisting user preferences.
 */

const SENDER_NAME_KEY = 'household-chat:sender-name';

/** Retrieve the persisted sender name, or empty string if unset */
export function getSenderName(): string {
  try {
    return localStorage.getItem(SENDER_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Persist the sender name for the chat channel */
export function setSenderName(name: string): void {
  try {
    localStorage.setItem(SENDER_NAME_KEY, name);
  } catch {
    // localStorage may be unavailable in some contexts
  }
}
