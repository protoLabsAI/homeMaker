import { open, save } from '@tauri-apps/plugin-dialog';
import { isDesktopApp } from './utils/is-desktop-app';

export interface OpenDialogOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  multiple?: boolean;
  directory?: boolean;
}

export interface SaveDialogOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  defaultPath?: string;
}

export interface DialogResult {
  canceled: boolean;
  filePaths: string[];
}

/**
 * Opens a native file/directory picker dialog.
 * Falls back gracefully in web mode using an HTML input element.
 */
export const openDialog = async (options: OpenDialogOptions = {}): Promise<DialogResult> => {
  if (isDesktopApp()) {
    const result = await open({
      title: options.title,
      filters: options.filters,
      multiple: options.multiple ?? false,
      directory: options.directory ?? false,
    });

    if (result === null) {
      return { canceled: true, filePaths: [] };
    }

    const paths = Array.isArray(result) ? result : [result];
    return { canceled: false, filePaths: paths };
  }

  // Web fallback: HTML file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options.multiple) input.multiple = true;
    if (options.directory) input.setAttribute('webkitdirectory', '');

    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) {
        resolve({ canceled: true, filePaths: [] });
      } else {
        resolve({ canceled: false, filePaths: files.map((f) => f.name) });
      }
    };
    input.oncancel = () => resolve({ canceled: true, filePaths: [] });
    input.click();
  });
};

/**
 * Opens a native save file dialog.
 * Returns null if the user cancels.
 */
export const saveDialog = async (options: SaveDialogOptions = {}): Promise<string | null> => {
  if (isDesktopApp()) {
    const result = await save({
      title: options.title,
      filters: options.filters,
      defaultPath: options.defaultPath,
    });
    return result;
  }

  // Web: no native save dialog available; return a prompted filename
  const filename = window.prompt(options.title ?? 'Save file as:', options.defaultPath ?? 'file');
  return filename;
};
