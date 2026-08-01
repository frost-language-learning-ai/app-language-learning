import { execSync, spawn } from "child_process";
import { config } from "../config.js";
import { AppError } from "../errors.js";

const OLLAMA_STARTUP_TIMEOUT_MS = 10000;
const OLLAMA_STATUS_POLL_INTERVAL_MS = 500;
let modelDownload = { state: "idle", progress: 0, message: "", error: null, logs: [] };

function isModelInstalled(models, modelName) {
  return models.some((model) => model === modelName || model.startsWith(`${modelName}:`));
}

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
    const response = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
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
    const response = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
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
    const modelNames = models.map((model) => model.name);
    
    return {
      all: modelNames,
      embeddinggemma: isModelInstalled(modelNames, config.ollamaEmbeddingModel),
      gemma3: isModelInstalled(modelNames, config.ollamaModel)
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
  if (models.embeddinggemma && models.gemma3) {
    modelDownload = { state: "completed", progress: 100, message: "AI models are ready.", error: null, logs: [] };
    return modelDownload;
  }

  if (modelDownload.state === "running") {
    return modelDownload;
  }

  const requiredModels = [
    !models.embeddinggemma && config.ollamaEmbeddingModel,
    !models.gemma3 && config.ollamaModel
  ].filter(Boolean);
  modelDownload = { state: "running", progress: 0, message: "Preparing model download...", error: null, logs: ["Preparing model download..."] };

  const downloadNextModel = (index) => {
    if (index >= requiredModels.length) {
      const finalMessage = "AI models are ready.";
      modelDownload = { state: "completed", progress: 100, message: finalMessage, error: null, logs: [...modelDownload.logs, finalMessage] };
      return;
    }

    const modelName = requiredModels[index];
    const child = spawn("ollama", ["pull", modelName], { windowsHide: true });
    let output = "";
    const baseProgress = (index / requiredModels.length) * 100;
    const progressRange = 100 / requiredModels.length;

    const updateProgress = (chunk) => {
      output += chunk.toString();
      const percentMatches = [...output.matchAll(/\b(\d{1,3})%/g)];
      const latest = percentMatches.at(-1);
      if (latest) {
        modelDownload.progress = Math.min(99, Math.floor(baseProgress + (Number(latest[1]) / 100) * progressRange));
      }
      const lines = output.split(/\r?\n|\r/).filter(Boolean);
      const lastLine = lines.at(-1);
      if (lastLine) {
        const cleanLine = lastLine.replace(/\x1b\[[0-9;]*m/g, "").trim();
        const logMessage = `${modelName}: ${cleanLine}`;
        modelDownload.message = logMessage;
        // Add to logs if it's a new line
        if (!modelDownload.logs.includes(logMessage)) {
          modelDownload.logs.push(logMessage);
          // Keep only last 50 log lines to prevent memory overflow
          if (modelDownload.logs.length > 50) {
            modelDownload.logs.shift();
          }
        }
      }
    };

    child.stdout.on("data", updateProgress);
    child.stderr.on("data", updateProgress);
    child.once("error", (error) => {
      const errorMsg = "Download could not start.";
      modelDownload = { state: "failed", progress: Math.floor(baseProgress), message: errorMsg, error: error.message, logs: [...modelDownload.logs, errorMsg, error.message] };
    });
    child.once("close", (code) => {
      if (code !== 0) {
        const errorMsg = "Download failed.";
        const errorDetail = output.trim() || `Ollama exited with code ${code}`;
        modelDownload = { state: "failed", progress: modelDownload.progress, message: errorMsg, error: errorDetail, logs: [...modelDownload.logs, errorMsg, errorDetail] };
        return;
      }
      downloadNextModel(index + 1);
    });
  };

  downloadNextModel(0);

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
    ready: ollama.installed && ollama.running && models.embeddinggemma && models.gemma3
  };
}
