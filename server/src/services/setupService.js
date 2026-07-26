import { execSync, spawn } from "child_process";
import { config } from "../config.js";
import { AppError } from "../errors.js";

const OLLAMA_STARTUP_TIMEOUT_MS = 10000;
const OLLAMA_STATUS_POLL_INTERVAL_MS = 500;
let modelDownload = { state: "idle", progress: 0, message: "", error: null };

/**
 * Check Ollama installation and version
 */
export async function checkOllamaStatus() {
  try {
    const version = execSync("ollama --version", { encoding: "utf-8" }).trim();
    return {
      installed: true,
      version,
      running: await checkOllamaRunning()
    };
  } catch {
    return {
      installed: false,
      version: null,
      running: false
    };
  }
}

/**
 * Check if Ollama service is running
 */
async function checkOllamaRunning() {
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start a locally installed Ollama service and wait for its HTTP endpoint.
 */
export async function startOllama() {
  const status = await checkOllamaStatus();
  if (!status.installed) {
    throw new AppError("Ollama is not installed", {
      status: 400,
      code: "OLLAMA_NOT_INSTALLED"
    });
  }

  if (status.running) {
    return status;
  }

  try {
    const child = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    child.unref();
  } catch (error) {
    throw new AppError(`Failed to start Ollama: ${error.message}`, {
      status: 503,
      code: "OLLAMA_START_FAILED",
      cause: error,
      expose: true
    });
  }

  const deadline = Date.now() + OLLAMA_STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await checkOllamaRunning()) {
      return checkOllamaStatus();
    }
    await new Promise((resolve) => setTimeout(resolve, OLLAMA_STATUS_POLL_INTERVAL_MS));
  }

  throw new AppError("Ollama did not start within 10 seconds", {
    status: 503,
    code: "OLLAMA_START_TIMEOUT"
  });
}

/**
 * Get installed models
 */
export async function getInstalledModels() {
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/tags`, {
      method: "GET"
    });
    if (!response.ok) {
      throw new AppError("Failed to fetch models from Ollama", {
        status: 503,
        code: "OLLAMA_UNAVAILABLE"
      });
    }
    const data = await response.json();
    const models = data.models || [];
    
    return {
      all: models.map(m => m.name),
      embeddinggemma: models.some(m => m.name.includes("embeddinggemma")),
      gemma3: models.some(m => m.name.includes("gemma3"))
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to check installed models", {
      status: 503,
      code: "MODEL_CHECK_FAILED",
      cause: error
    });
  }
}

/**
 * Pull a model synchronously (blocking)
 */
export async function pullModelSync(modelName) {
  try {
    const output = execSync(`ollama pull ${modelName}`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024
    });
    return {
      success: true,
      output
    };
  } catch (error) {
    throw new AppError(`Failed to pull model ${modelName}: ${error.message}`, {
      status: 500,
      code: "MODEL_PULL_FAILED",
      cause: error
    });
  }
}

export async function startModelDownload() {
  const status = await checkOllamaStatus();
  if (!status.installed || !status.running) {
    throw new AppError("Start Ollama before downloading AI models", {
      status: 400,
      code: "OLLAMA_NOT_RUNNING"
    });
  }

  const models = await getInstalledModels();
  if (models.embeddinggemma) {
    modelDownload = { state: "completed", progress: 100, message: "AI models are ready.", error: null };
    return modelDownload;
  }

  if (modelDownload.state === "running") {
    return modelDownload;
  }

  modelDownload = { state: "running", progress: 0, message: "Preparing download...", error: null };
  const child = spawn("ollama", ["pull", "embeddinggemma"], { windowsHide: true });
  let output = "";

  const updateProgress = (chunk) => {
    output += chunk.toString();
    const percentMatches = [...output.matchAll(/\b(\d{1,3})%/g)];
    const latest = percentMatches.at(-1);
    if (latest) modelDownload.progress = Math.min(99, Number(latest[1]));
    const lastLine = output.split(/\r?\n|\r/).filter(Boolean).at(-1);
    if (lastLine) modelDownload.message = lastLine.replace(/\x1b\[[0-9;]*m/g, "").trim();
  };

  child.stdout.on("data", updateProgress);
  child.stderr.on("data", updateProgress);
  child.once("error", (error) => {
    modelDownload = { state: "failed", progress: 0, message: "Download could not start.", error: error.message };
  });
  child.once("close", (code) => {
    modelDownload = code === 0
      ? { state: "completed", progress: 100, message: "AI models are ready.", error: null }
      : { state: "failed", progress: modelDownload.progress, message: "Download failed.", error: output.trim() || `Ollama exited with code ${code}` };
  });

  return modelDownload;
}

export function getModelDownloadStatus() {
  return modelDownload;
}

/**
 * Get setup status (comprehensive check)
 */
export async function getSetupStatus() {
  const ollama = await checkOllamaStatus();
  let models = { embeddinggemma: false, gemma3: false };
  
  if (ollama.installed && ollama.running) {
    models = await getInstalledModels();
  }
  
  return {
    ollama,
    models,
    ready: ollama.installed && ollama.running && models.embeddinggemma
  };
}
