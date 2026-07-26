import React, { useEffect, useState } from "react";
import { setupApi } from "../../lib/apiClient.js";

function statusDetail(label, ready) {
  return (
    <div className="ll-ai-setup-status-row">
      <span aria-hidden="true">{ready ? "✓" : "○"}</span>
      <span>{label}</span>
      <strong>{ready ? "Ready" : "Required"}</strong>
    </div>
  );
}

export default function AiSetupPanel({ t }) {
  const [status, setStatus] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [download, setDownload] = useState(null);

  async function refreshStatus() {
    try {
      setStatus(await setupApi.getStatus());
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  useEffect(() => {
    if (download?.state !== "running") return undefined;

    const refreshDownload = async () => {
      try {
        const result = await setupApi.getModelDownloadStatus();
        setDownload(result.download);
        if (result.download.state === "completed") {
          setBusyAction("");
          setMessage(result.download.message);
          await refreshStatus();
        }
        if (result.download.state === "failed") {
          setBusyAction("");
          setMessage(result.download.error || result.download.message);
        }
      } catch (error) {
        setBusyAction("");
        setMessage(error.message);
      }
    };

    const interval = setInterval(refreshDownload, 1000);
    refreshDownload();
    return () => clearInterval(interval);
  }, [download?.state]);

  async function runAction(actionName, action, successMessage) {
    setBusyAction(actionName);
    setMessage("");
    try {
      const result = await action();
      if (actionName === "models") {
        setDownload(result.download);
        setMessage(result.download.message || successMessage);
      } else {
        setMessage(successMessage);
        await refreshStatus();
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyAction("");
    }
  }

  const ollamaInstalled = Boolean(status?.ollama?.installed);
  const ollamaRunning = Boolean(status?.ollama?.running);
  const modelsReady = Boolean(status?.models?.embeddinggemma);

  return (
    <section className="ll-card ll-ai-setup">
      <div className="ll-ai-setup-heading">
        <div>
          <h3>{t.llAiSetupTitle || "AI Setup"}</h3>
          <p className="ll-message">{t.llAiSetupSubtitle || "Prepare local AI for translations, coaching, and pronunciation analysis."}</p>
        </div>
        <button className="ll-button" onClick={refreshStatus} disabled={Boolean(busyAction)}>
          {t.llAiSetupRefresh || "Refresh status"}
        </button>
      </div>

      <div className={`ll-ai-setup-summary ${status?.ready ? "is-ready" : ""}`}>
        <span aria-hidden="true">{status?.ready ? "✓" : "!"}</span>
        <div>
          <strong>{status?.ready ? (t.llAiSetupReady || "AI is ready") : (t.llAiSetupActionNeeded || "Setup required")}</strong>
          <p>{status?.ready ? (t.llAiSetupReadyDescription || "Local AI services are available.") : (t.llAiSetupActionDescription || "Complete the required steps below.")}</p>
        </div>
      </div>

      <div className="ll-ai-setup-status-list">
        {statusDetail(t.llAiSetupOllama || "Ollama installed", ollamaInstalled)}
        {statusDetail(t.llAiSetupService || "Ollama service running", ollamaRunning)}
        {statusDetail(t.llAiSetupModels || "AI models downloaded", modelsReady)}
      </div>

      {!ollamaInstalled && (
        <div className="ll-ai-setup-help">
          <strong>{t.llAiSetupInstallTitle || "Install Ollama first"}</strong>
          <p>{t.llAiSetupInstallDescription || "Install Ollama once from its official website, then return here to continue setup."}</p>
          <a className="ll-button ll-button-primary" href="https://ollama.com/download" target="_blank" rel="noreferrer">
            {t.llAiSetupInstallButton || "Open Ollama download"}
          </a>
        </div>
      )}

      {ollamaInstalled && !ollamaRunning && (
        <button
          className="ll-button ll-button-primary"
          onClick={() => runAction("start", () => setupApi.startOllama(), t.llAiSetupStarted || "Ollama started.")}
          disabled={Boolean(busyAction)}
        >
          {busyAction ? (t.llAiSetupStarting || "Starting...") : (t.llAiSetupStart || "Start Ollama")}
        </button>
      )}

      {ollamaRunning && !modelsReady && (
        <button
          className="ll-button ll-button-primary"
          onClick={() => runAction("models", () => setupApi.initModels(), t.llAiSetupModelsReady || "AI models are ready.")}
          disabled={Boolean(busyAction)}
        >
          {busyAction ? (t.llAiSetupDownloading || "Downloading models...") : (t.llAiSetupDownload || "Download AI models")}
        </button>
      )}

      {download?.state === "running" && (
        <div className="ll-ai-download-progress" role="status" aria-live="polite">
          <div className="ll-ai-download-progress-label">
            <span>{download.message || "Downloading AI models..."}</span>
            <strong>{download.progress}%</strong>
          </div>
          <div className="ll-ai-download-progress-track" aria-hidden="true">
            <div className="ll-ai-download-progress-value" style={{ width: `${download.progress}%` }} />
          </div>
        </div>
      )}

      {message && <p className="ll-message ll-ai-setup-message" role="status">{message}</p>}
    </section>
  );
}