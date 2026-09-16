const API_BASE = import.meta.env.VITE_LANGUAGE_API_BASE || "http://localhost:8787/api";
const DEFAULT_TIMEOUT_MS = 12000;

export class ApiClientError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.retryable = Boolean(options.retryable);
    this.details = options.details;
  }
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, done: () => clearTimeout(timer) };
}

async function call(path, options = {}) {
  const timeout = withTimeout(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
      signal: timeout.controller.signal
    });
  } catch (error) {
    timeout.done();
    if (error?.name === "AbortError") {
      throw new ApiClientError("Request timed out", { code: "REQUEST_TIMEOUT", retryable: true });
    }
    throw new ApiClientError("API error. Check that the local API server is running.", {
      code: "NETWORK_ERROR",
      retryable: true
    });
  }
  timeout.done();

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const requestId = body?.error?.requestId || response.headers.get("x-request-id") || undefined;
    const code = body?.error?.code || "REQUEST_FAILED";
    const message = body?.error?.message || `Request failed: ${response.status}`;
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new ApiClientError(message, {
      status: response.status,
      code,
      requestId,
      retryable,
      details: body?.error?.details
    });
  }
  return body;
}

export const languageApi = {
  fastPreview(payload) {
    const { term, sourceLanguage = "en", targetLanguage = "de" } = payload;
    return call("/fast-pipeline/preview", {
      method: "POST",
      body: JSON.stringify({ term, sourceLanguage, targetLanguage })
    });
  },
  fastConfirm(payload) {
    return call("/fast-pipeline/confirm", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  saveKnowledgeNode(payload) {
    return call("/knowledge-nodes", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  askReasoning(payload) {
    return call("/reasoning/ask", {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: 25000
    });
  },
  createAudioUploadPolicy(payload) {
    return call("/audio/upload-policy", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  registerAudio(payload) {
    return call("/audio/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  analyzeAccent(payload) {
    return call("/audio/accent-analysis", {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: 25000
    });
  },
  transcribeAudio(payload) {
    return call("/audio/transcribe", {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: 120000
    });
  },
  evaluatePronunciation(payload) {
    return call("/audio/evaluate-pronunciation", {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: 45000
    });
  },
  semanticSearch(query, limit = 5) {
    return call("/search/semantic", {
      method: "POST",
      body: JSON.stringify({ query, limit })
    });
  },
  getLanguages(includeHidden = false) {
    const query = includeHidden ? "?includeHidden=true" : "";
    return call(`/languages${query}`, {
      method: "GET"
    });
  },
  updateLanguageVisibility(code, visible) {
    return call(`/languages/${code}`, {
      method: "PATCH",
      body: JSON.stringify({ visible })
    });
  },
  getCoreTerms(limit = 50, offset = 0, sourceLang = null, targetLang = null) {
    let url = `/core-terms?limit=${limit}&offset=${offset}`;
    if (sourceLang) url += `&sourceLang=${sourceLang}`;
    if (targetLang) url += `&targetLang=${targetLang}`;
    return call(url, {
      method: "GET"
    });
  },
  deleteCoreTerm(termId) {
    return call(`/core-terms/${termId}`, {
      method: "DELETE"
    });
  },
  updateCoreTerm(termId, updates) {
    return call(`/core-terms/${termId}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
  }
};

export const setupApi = {
  getStatus() {
    return call("/setup/status", {
      method: "GET",
      timeoutMs: 10000
    });
  },
  startOllama() {
    return call("/setup/start-ollama", {
      method: "POST",
      timeoutMs: 15000
    });
  },
  initModels() {
    return call("/setup/init-models", {
      method: "POST",
      timeoutMs: 15000
    });
  },
  getModelDownloadStatus() {
    return call("/setup/model-download-status", {
      method: "GET",
      timeoutMs: 10000
    });
  }
};
