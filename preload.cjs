const { contextBridge, ipcRenderer } = require('electron');

// Bridy the main process to the renderer safely
contextBridge.exposeInMainWorld('electronAPI', {
  saveBackup: (jsonBlob) => ipcRenderer.invoke('save-backup', jsonBlob),
  downloadFile: (arrayBuffer, filename) => ipcRenderer.invoke('download-file', { arrayBuffer, filename }),
});
