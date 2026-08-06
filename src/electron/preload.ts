import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  analyzeGit: (path: string) => ipcRenderer.invoke('git:analyze', path),
  getFile: (repoPath: string, hash: string, filePath: string) => ipcRenderer.invoke('git:getFile', repoPath, hash, filePath),
  checkout: (repoPath: string, hash: string) => ipcRenderer.invoke('git:checkout', repoPath, hash),
  log: (message: string) => ipcRenderer.invoke('log', message)
});
