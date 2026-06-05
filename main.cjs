const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Windows User Model ID for stable pinning
const APP_ID = 'com.dawatrust.desktop';
app.setAppUserModelId(APP_ID);

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development';

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Dawa Trust Dashboard',
    icon: path.join(__dirname, 'public/icon.ico'), // Corrected path to .ico
    webPreferences: {
      nodeIntegration: false, // Security: Disable Node integration in renderer
      contextIsolation: true, // Security: Enable context isolation
      preload: path.join(__dirname, 'preload.cjs'), // Bridge for secure IPC
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Handle external links safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// Ensure unique backup directory in Documents
const getBackupDir = () => {
  const documentsPath = app.getPath('documents');
  const backupDir = path.join(documentsPath, 'DawaTrust_Backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

// IPC Listener for secure JSON backups from React (Dexie)
ipcMain.handle('save-backup', async (event, jsonBlob) => {
  try {
    const backupDir = getBackupDir();
    // Use a fixed filename to overwrite the previous backup as requested
    const filePath = path.join(backupDir, `DawaTrust_Database_Backup.json`);
    
    // Convert ArrayBuffer to Node.js Buffer for fs.writeFileSync
    const buffer = jsonBlob instanceof ArrayBuffer ? Buffer.from(jsonBlob) : jsonBlob;

    fs.writeFileSync(filePath, buffer);
    console.log(`Backup saved to: ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Backup failed:', error);
    return { success: false, error: error.message };
  }
});

// IPC Listener for downloading files with standard save dialog (to avoid UUID downloads for blobs)
ipcMain.handle('download-file', async (event, { arrayBuffer, filename }) => {
  try {
    const { dialog } = require('electron');
    const downloadsPath = app.getPath('downloads');
    const defaultPath = path.join(downloadsPath, filename);

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save File',
      defaultPath: defaultPath,
      buttonLabel: 'Save'
    });

    if (canceled || !filePath) {
      return { success: false, error: 'Save canceled' };
    }

    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    console.log(`File saved successfully to: ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('File download failed:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
