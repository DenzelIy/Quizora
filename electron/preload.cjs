const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quizora', {
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),
  isElectron: true,
});
