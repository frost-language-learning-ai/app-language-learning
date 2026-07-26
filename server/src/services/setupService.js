import { execSync, exec } from "child_process";
import { config } from "../config.js";
import { AppError } from "../errors.js";

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
 * Pull a model from Ollama (streaming)
 * Returns a function that can be called to get the next line of output
 */
export async function* pullModelStream(modelName) {
  return new Promise((resolve, reject) => {
    const process = exec(`ollama pull ${modelName}`, { maxBuffer: 10 * 1024 * 1024 });
    
    let output = "";
    process.stdout.on("data", (data) => {
      output += data.toString();
      const lines = output.split("\n");
      // Keep last incomplete line
      output = lines[lines.length - 1];
      // Yield all complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].trim()) {
          resolve({ value: lines[i], done: false });
        }
      }
    });
    
    process.stderr.on("data", (data) => {
      reject(new AppError(`Model pull error: ${data}`, {
        status: 500,
        code: "MODEL_PULL_FAILED"
      }));
    });
    
    process.on("close", (code) => {
      if (code === 0) {
        if (output.trim()) resolve({ value: output, done: false });
        resolve({ done: true });
      } else {
        reject(new AppError(`Model pull failed with exit code ${code}`, {
          status: 500,
          code: "MODEL_PULL_FAILED"
        }));
      }
    });
  });
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
