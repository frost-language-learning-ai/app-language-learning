const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendToCustomApi: (params) => ipcRenderer.invoke('send-to-custom-api', params),
});
