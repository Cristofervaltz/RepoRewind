import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { analyzeGitHistory } from '../gitAnalyzer';
import { execSync } from 'child_process';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../ui/dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('git:analyze', async (event, repoPath: string) => {
  return await analyzeGitHistory(repoPath);
});

ipcMain.handle('git:getFile', async (event, repoPath: string, hash: string, filePath: string) => {
  try {
    const absoluteRepoPath = path.resolve(repoPath);
    const content = execSync(`git -C "${absoluteRepoPath}" show ${hash}:${filePath}`, { maxBuffer: 10 * 1024 * 1024 }).toString();
    return { content };
  } catch (error) {
    return { error: 'Failed to retrieve file content (might not exist in this commit or is binary).' };
  }
});

ipcMain.handle('git:checkout', async (event, repoPath: string, hash: string) => {
  try {
    const absoluteRepoPath = path.resolve(repoPath);
    execSync(`git -C "${absoluteRepoPath}" checkout ${hash}`);
    return { success: true, message: `Checked out ${hash}` };
  } catch (error) {
    return { error: 'Failed to checkout commit. Make sure your working tree is clean.' };
  }
});

ipcMain.handle('log', async (event, message: string) => {
  fs.appendFileSync(path.join(process.cwd(), 'client.log'), message + '\n\n');
  return { success: true };
});
