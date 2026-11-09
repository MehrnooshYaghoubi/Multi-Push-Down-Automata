/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. It owns the window
 * and the automaton itself; everything the UI can do goes through `./ipc`.
 */
import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import registerIpcHandlers, { loadLastSession } from './ipc';
import { resourcesPath } from './paths';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify().catch((e) => log.warn(e));
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  try {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    await installer.default([installer.REACT_DEVELOPER_TOOLS], forceDownload);
  } catch (e) {
    // A stale extension download in the Chrome profile used to surface as an
    // unhandled rejection on every launch ("Invalid header: Does not start
    // with Cr24"). Devtools are optional; never let this stop the app.
    log.warn('Could not install dev extensions:', e);
  }
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    icon: resourcesPath('icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) return;
    if (process.env.START_MINIMIZED) mainWindow.minimize();
    else mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Auto updates only make sense for a released build.
  if (app.isPackaged) {
    // eslint-disable-next-line no-new
    new AppUpdater();
  }
};

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    registerIpcHandlers();
    loadLastSession();
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
