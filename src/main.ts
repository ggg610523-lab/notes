import 'v8-compile-cache';
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

let mainWindow: BrowserWindow | null = null;

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  favorite: boolean;
  tags: string[];
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
}

function getDataDir(): string {
  const dir = path.join(os.homedir(), '.ios-notes');
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

function getNotesPath(): string {
  return path.join(getDataDir(), 'notes.json');
}

function getFoldersPath(): string {
  return path.join(getDataDir(), 'folders.json');
}

function getSettingsPath(): string {
  return path.join(getDataDir(), 'settings.json');
}

function loadJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`[main] Error loading ${filePath}:`, err);
  }
  return defaultValue;
}

function saveJsonFile<T>(filePath: string, data: T): boolean {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[main] Error saving ${filePath}:`, err);
    return false;
  }
}

function backupToDrive(): boolean {
  try {
    const mount = path.join(os.homedir(), 'Cloud', 'google-drive');
    const dest = path.join(mount, 'notes-backup', 'latest');
    if (!fs.existsSync(mount)) return false;
    fs.mkdirSync(dest, { recursive: true });
    for (const file of ['notes.json', 'folders.json', 'settings.json']) {
      const src = path.join(getDataDir(), file);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, file));
    }
    console.log('[main] backed up notes to Google Drive');
    return true;
  } catch (err) {
    console.error('[main] backup to Google Drive failed:', err);
    return false;
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => { mainWindow?.show(); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {

  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window-close', () => mainWindow?.close());

  ipcMain.handle('load-notes', () => {
    const notes = loadJsonFile<Note[]>(getNotesPath(), []);
    console.log('[main] loaded', notes.length, 'notes');
    return notes;
  });

  ipcMain.handle('save-notes', (_e, notes: Note[]) => {
    return saveJsonFile(getNotesPath(), notes);
  });

  ipcMain.handle('load-folders', () => {
    const folders = loadJsonFile<Folder[]>(getFoldersPath(), []);
    console.log('[main] loaded', folders.length, 'folders');
    return folders;
  });

  ipcMain.handle('save-folders', (_e, folders: Folder[]) => {
    return saveJsonFile(getFoldersPath(), folders);
  });

  ipcMain.handle('load-settings', () => {
    return loadJsonFile<Record<string, any>>(getSettingsPath(), { darkMode: false });
  });

  ipcMain.handle('save-settings', (_e, settings: Record<string, any>) => {
    return saveJsonFile(getSettingsPath(), settings);
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

let isQuitting = false;
app.on('before-quit', (event) => {
  if (isQuitting) return;
  event.preventDefault();
  isQuitting = true;
  backupToDrive();
  app.quit();
});
