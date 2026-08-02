import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';
const apiUrl = "http://127.0.0.1:8787/health";

// Debug logging
const logFile = path.join(app.getPath("userData"), "electron-debug.log");
function log(message) {
  console.log(`[LanguageLearning] ${message}`);
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
}

let mainWindow;
let apiProcess = null;

async function isApiRunning() {
  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureApiServer() {
  log("Checking if API server is running...");
  if (await isApiRunning()) {
    log("API server is already running");
    return;
  }

  log("Starting API server as subprocess...");
  try {
    const serverPath = isDev
      ? path.join(__dirname, "../../server/src/app.js")
      : path.join(process.resourcesPath, "app.asar.unpacked/server/src/app.js");
    
    log(`Server script path: ${serverPath}`);
    
    // Start server as a separate Node.js process
    apiProcess = spawn("node", [serverPath], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false
    });

    apiProcess.on("error", (error) => {
      log(`API process error: ${error.message}`);
    });

    apiProcess.stdout.on("data", (data) => {
      log(`API: ${data.toString().trim()}`);
    });

    apiProcess.stderr.on("data", (data) => {
      log(`API Error: ${data.toString().trim()}`);
    });

    // Wait for API to start
    let attempts = 0;
    while (attempts < 30) {
      if (await isApiRunning()) {
        log("API server started successfully");
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }
    
    log("API server startup timeout");
  } catch (error) {
    log(`Error starting API server: ${error.message}`);
    throw error;
  }
}

function createWindow() {
  log("Creating main window...");
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

  log(`Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.on('ready-to-show', () => {
    log("Window ready to show");
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    log("Window closed");
    mainWindow = null;
  });

  if (isDev) {
    log("Opening DevTools");
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  log("App is ready");
  process.env.LANGUAGE_SETTINGS_FILE = path.join(app.getPath("userData"), "languages.json");
  log(`Language settings file: ${process.env.LANGUAGE_SETTINGS_FILE}`);
  
  try {
    await ensureApiServer();
    createWindow();
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  }
});

app.on('window-all-closed', () => {
  log("All windows closed");
  if (apiProcess) {
    log("Killing API process");
    apiProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  log("App activated");
  if (mainWindow === null) {
    createWindow();
  }
});
