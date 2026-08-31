"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    windowMinimize: () => electron_1.ipcRenderer.send('window-minimize'),
    windowMaximize: () => electron_1.ipcRenderer.send('window-maximize'),
    windowClose: () => electron_1.ipcRenderer.send('window-close'),
    loadNotes: () => electron_1.ipcRenderer.invoke('load-notes'),
    saveNotes: (notes) => electron_1.ipcRenderer.invoke('save-notes', notes),
    loadFolders: () => electron_1.ipcRenderer.invoke('load-folders'),
    saveFolders: (folders) => electron_1.ipcRenderer.invoke('save-folders', folders),
    loadSettings: () => electron_1.ipcRenderer.invoke('load-settings'),
    saveSettings: (settings) => electron_1.ipcRenderer.invoke('save-settings', settings),
});
//# sourceMappingURL=preload.js.map