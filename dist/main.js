"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("v8-compile-cache");
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
let mainWindow = null;
function getDataDir() {
    const dir = path.join(os.homedir(), '.ios-notes');
    try {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
    catch { }
    return dir;
}
function getNotesPath() {
    return path.join(getDataDir(), 'notes.json');
}
function getFoldersPath() {
    return path.join(getDataDir(), 'folders.json');
}
function getSettingsPath() {
    return path.join(getDataDir(), 'settings.json');
}
function loadJsonFile(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (err) {
        console.error(`[main] Error loading ${filePath}:`, err);
    }
    return defaultValue;
}
function saveJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    }
    catch (err) {
        console.error(`[main] Error saving ${filePath}:`, err);
        return false;
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
electron_1.app.whenReady().then(() => {
    electron_1.ipcMain.on('window-minimize', () => mainWindow?.minimize());
    electron_1.ipcMain.on('window-maximize', () => {
        if (mainWindow?.isMaximized())
            mainWindow.unmaximize();
        else
            mainWindow?.maximize();
    });
    electron_1.ipcMain.on('window-close', () => mainWindow?.close());
    electron_1.ipcMain.handle('load-notes', () => {
        const notes = loadJsonFile(getNotesPath(), []);
        console.log('[main] loaded', notes.length, 'notes');
        return notes;
    });
    electron_1.ipcMain.handle('save-notes', (_e, notes) => {
        return saveJsonFile(getNotesPath(), notes);
    });
    electron_1.ipcMain.handle('load-folders', () => {
        const folders = loadJsonFile(getFoldersPath(), []);
        console.log('[main] loaded', folders.length, 'folders');
        return folders;
    });
    electron_1.ipcMain.handle('save-folders', (_e, folders) => {
        return saveJsonFile(getFoldersPath(), folders);
    });
    electron_1.ipcMain.handle('load-settings', () => {
        return loadJsonFile(getSettingsPath(), { darkMode: false });
    });
    electron_1.ipcMain.handle('save-settings', (_e, settings) => {
        return saveJsonFile(getSettingsPath(), settings);
    });
    createWindow();
    electron_1.app.on('activate', () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow(); });
});
electron_1.app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    electron_1.app.quit(); });
//# sourceMappingURL=main.js.map