import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  loadNotes: () => ipcRenderer.invoke('load-notes'),
  saveNotes: (notes: any[]) => ipcRenderer.invoke('save-notes', notes),
  loadFolders: () => ipcRenderer.invoke('load-folders'),
  saveFolders: (folders: any[]) => ipcRenderer.invoke('save-folders', folders),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  loadNotesFromFile: () => ipcRenderer.invoke('load-notes-from-file'),
});
