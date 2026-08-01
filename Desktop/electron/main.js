import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';
const apiUrl = "http://127.0.0.1:8787/health";

let mainWindow;

async function isApiRunning() {
  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureApiServer() {
  if (await isApiRunning()) return;

  await import(pathToFileURL(path.join(__dirname, "../../server/src/app.js")).href);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : pathToFileURL(path.join(__dirname, '../../dist/index.html')).toString();

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  process.env.LANGUAGE_SETTINGS_FILE = path.join(app.getPath("userData"), "languages.json");
  await ensureApiServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
