import express from "express";
import { AppError, asyncHandler } from "../errors.js";
import {
  checkOllamaStatus,
  getInstalledModels,
  getModelDownloadStatus,
  pullModelSync,
  getSetupStatus,
  startModelDownload,
  startOllama
} from "../services/setupService.js";

export const setupRoutes = express.Router();

/**
 * GET /api/setup/status
 * Get the current setup status (Ollama, models, etc.)
 */
setupRoutes.get("/status", asyncHandler(async (_req, res) => {
  const status = await getSetupStatus();
  res.json({
    ok: true,
    ...status
  });
}));

/**
 * POST /api/setup/check-ollama
 * Quick check if Ollama is running
 */
setupRoutes.post("/check-ollama", asyncHandler(async (_req, res) => {
  const status = await checkOllamaStatus();
  
  if (!status.installed) {
    throw new AppError("Ollama is not installed", {
      status: 400,
      code: "OLLAMA_NOT_INSTALLED",
      details: { installed: false }
    });
  }
  
  if (!status.running) {
    throw new AppError("Ollama is not running. Please start Ollama manually.", {
      status: 400,
      code: "OLLAMA_NOT_RUNNING",
      details: { installed: true, running: false }
    });
  }
  
  res.json({
    ok: true,
    installed: true,
    running: true,
    version: status.version
  });
}));

/**
 * POST /api/setup/start-ollama
 * Start the locally installed Ollama service.
 */
setupRoutes.post("/start-ollama", asyncHandler(async (_req, res) => {
  const status = await startOllama();
  res.json({ ok: true, ollama: status });
}));

setupRoutes.get("/model-download-status", (_req, res) => {
  res.json({ ok: true, download: getModelDownloadStatus() });
});

/**
 * POST /api/setup/init-models
 * Initialize required models (embeddinggemma)
 */
setupRoutes.post("/init-models", asyncHandler(async (_req, res) => {
  const download = await startModelDownload();
  res.status(202).json({ ok: true, download });
}));

/**
 * POST /api/setup/pull-model
 * Pull a specific model by name
 */
setupRoutes.post("/pull-model", asyncHandler(async (req, res) => {
  const { modelName } = req.body;
  
  if (!modelName || typeof modelName !== "string") {
    throw new AppError("modelName is required", {
      status: 400,
      code: "INVALID_REQUEST",
      details: { required: ["modelName"] }
    });
  }
  
  // Check Ollama is running
  const status = await checkOllamaStatus();
  if (!status.running) {
    throw new AppError("Ollama is not running", {
      status: 400,
      code: "OLLAMA_NOT_RUNNING"
    });
  }
  
  try {
    const result = await pullModelSync(modelName);
    res.json({
      ok: true,
      modelName,
      output: result.output
    });
  } catch (error) {
    throw new AppError(`Failed to pull model: ${error.message}`, {
      status: 500,
      code: "MODEL_PULL_FAILED",
      cause: error
    });
  }
}));
