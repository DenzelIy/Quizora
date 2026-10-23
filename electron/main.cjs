const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const os = require('os');
const { fork, spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;
let serverPort = 3001;

function getDataPath() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

function getDbPath() {
  return path.join(getDataPath(), 'quizspark.db');
}

function isFirstRun() {
  return !fs.existsSync(getDbPath());
}

function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const [name, nets] of Object.entries(interfaces)) {
    if (!nets) continue;
    for (const iface of nets) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, '0.0.0.0', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

async function startServer() {
  const port = await findAvailablePort(3001);
  serverPort = port;

  const dbPath = getDbPath();

  let serverScript;
  if (app.isPackaged) {
    serverScript = path.join(process.resourcesPath, 'backend-dist', 'index.js');
  } else {
    serverScript = path.join(__dirname, '..', 'backend', 'src', 'index.ts');
  }

  return new Promise((resolve, reject) => {
    const frontendDist = app.isPackaged
      ? path.join(process.resourcesPath, 'frontend-dist')
      : path.join(__dirname, '..', 'frontend', 'dist');

    const env = {
      ...process.env,
      PORT: String(port),
      DB_PATH: dbPath,
      FRONTEND_DIST: frontendDist,
      NODE_ENV: 'production',
      ELECTRON_APP: '1',
    };

    if (app.isPackaged) {
      serverProcess = fork(serverScript, [], {
        env,
        stdio: 'pipe',
      });
    } else {
      const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      serverProcess = spawn(npxPath, ['tsx', serverScript], {
        env,
        stdio: 'pipe',
        cwd: path.join(__dirname, '..'),
      });
    }

    let started = false;

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[Server]', output);
      if (output.includes('running on port') && !started) {
        started = true;
        resolve(port);
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('[Server Error]', data.toString());
    });

    serverProcess.on('error', (err) => {
      if (!started) reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (!started) reject(new Error(`Server exited with code ${code}`));
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve(port);
      }
    }, 10000);
  });
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Quizora',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${serverPort}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (app.isPackaged) {
    mainWindow.setMenuBarVisibility(false);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost:')) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('get-server-info', () => {
  const addresses = getLanAddresses();
  return {
    port: serverPort,
    addresses,
    joinUrl: addresses.length > 0
      ? `http://${addresses[0].address}:${serverPort}/join`
      : `http://localhost:${serverPort}/join`,
  };
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('is-first-run', () => isFirstRun());

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start Quizora server:\n${err.message || err}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${serverPort}`)) {
      event.preventDefault();
    }
  });
});
