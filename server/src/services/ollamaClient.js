import { config } from "../config.js";
import { validateFastPipelineJson, validateReasoningResponseJson } from "../validators.js";
import { AppError } from "../errors.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OLLAMA_TIMEOUT_MS = 30000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA_PROMPTS_PATH = path.resolve(__dirname, "../prompts/ollama-prompts.json");

let promptTemplatesCache = null;

async function getPromptTemplates() {
  if (promptTemplatesCache) return promptTemplatesCache;

  try {
    promptTemplatesCache = JSON.parse(await readFile(OLLAMA_PROMPTS_PATH, "utf-8"));
    return promptTemplatesCache;
  } catch (error) {
    throw new AppError("Ollama prompt templates could not be loaded", {
      status: 500,
      code: "PROMPT_TEMPLATE_LOAD_FAILED",
      cause: error
    });
  }
}

function applyPromptReplacements(templateText, replacements) {
  let result = templateText;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(`{{${key}}}`).join(String(value));
  }
  return result;
}

async function renderPrompt(templateKey, replacements) {
  const templates = await getPromptTemplates();
  const templateLines = templates?.[templateKey];
  if (!Array.isArray(templateLines) || templateLines.length === 0) {
    throw new AppError("Ollama prompt template key is invalid", {
      status: 500,
      code: "PROMPT_TEMPLATE_KEY_INVALID",
      details: { templateKey }
    });
  }
  return applyPromptReplacements(templateLines.join("\n"), replacements);
}

function mapDereRankToPercentLabel(rank) {
  return { 1: "25%", 2: "50%", 3: "75%", 4: "100%" }[rank] || "50%";
}

function mapCharacterStyleToLabel(style) {
  return {
    tsundere: "Tsundere",
    kuudere: "Kuudere",
    downer: "Downer",
    kuudere_downer: "Kuudere Downer"
  }[style] || "Tsundere";
}

function mapCharacterGenderToLabel(gender) {
  return { female: "Female", male: "Male", neutral: "Neutral" }[gender] || "Neutral";
}

function createTimeoutController(ms = OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timer) };
}

async function requestOllama(pathname, body, timeoutMs) {
  const timeout = createTimeoutController(timeoutMs);
  let response;
  try {
    response = await fetch(`${config.ollamaBaseUrl}${pathname}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeout.controller.signal
    });
  } catch (error) {
    timeout.clear();
    if (error?.name === "AbortError") {
      throw new AppError("Ollama request timed out", { status: 504, code: "UPSTREAM_TIMEOUT" });
    }
    throw new AppError("Ollama request failed", { status: 502, code: "UPSTREAM_UNAVAILABLE", cause: error });
  }
  timeout.clear();

  if (!response.ok) {
    const text = await response.text();
    throw new AppError("Ollama request failed", {
      status: 502,
      code: "UPSTREAM_BAD_RESPONSE",
      details: { status: response.status, body: text.slice(0, 500) }
    });
  }
  return response.json();
}

async function ollamaGenerateJson(userPrompt, responseSchema) {
  const raw = await requestOllama("/api/chat", {
    model: config.ollamaModel,
    messages: [{ role: "user", content: userPrompt }],
    stream: false,
    format: responseSchema,
    options: { temperature: 0 }
  });
  const text = raw?.message?.content;
  if (!text) {
    throw new AppError("Ollama response did not include JSON text", {
      status: 502,
      code: "UPSTREAM_INVALID_PAYLOAD"
    });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("Ollama returned invalid JSON", { status: 502, code: "UPSTREAM_INVALID_JSON" });
  }
}

export async function generateFastPipelineTerm(term) {
  const prompt = await renderPrompt("fastPipelineTerm", {
    TERM: term,
    CHARACTER_STYLE_LABEL: mapCharacterStyleToLabel("tsundere"),
    CHARACTER_GENDER_LABEL: mapCharacterGenderToLabel("neutral"),
    DERE_RANK: 2,
    DERE_PERCENT: mapDereRankToPercentLabel(2)
  });
  const schema = {
    type: "object",
    properties: {
      english: { type: "string" }, german: { type: "string" }, nuance: { type: "string" },
      examples: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      category_suggestion: { type: "string" }
    },
    required: ["english", "german", "nuance", "examples", "category_suggestion"],
    additionalProperties: false
  };
  const json = await ollamaGenerateJson(prompt, schema);
  if (!validateFastPipelineJson(json)) {
    throw new AppError("Ollama JSON failed schema validation", {
      status: 502,
      code: "UPSTREAM_SCHEMA_MISMATCH",
      details: validateFastPipelineJson.errors
    });
  }
  return json;
}

export async function embedText(text) {
  const raw = await requestOllama("/api/embed", {
    model: config.ollamaEmbeddingModel,
    input: text
  });
  const values = raw?.embeddings?.[0];
  if (!Array.isArray(values) || values.length === 0) {
    throw new AppError("Embedding was missing in Ollama response", {
      status: 502,
      code: "UPSTREAM_INVALID_PAYLOAD"
    });
  }
  return values;
}

export async function analyzeAccentFromAudio() {
  throw new AppError("Accent analysis is unavailable with the local Gemma/Ollama configuration", {
    status: 501,
    code: "FEATURE_UNAVAILABLE"
  });
}

export async function generateReasoningAnswer({
  prompt,
  language = "ja",
  characterStyle = "tsundere",
  characterGender = "neutral",
  dereRank = 2
}) {
  const targetLang = language === "de" ? "German" : language === "en" ? "English" : "Japanese";
  const userPrompt = await renderPrompt("reasoningAnswer", {
    TARGET_LANG: targetLang,
    USER_PROMPT: prompt,
    CHARACTER_STYLE_LABEL: mapCharacterStyleToLabel(characterStyle),
    CHARACTER_GENDER_LABEL: mapCharacterGenderToLabel(characterGender),
    DERE_RANK: dereRank,
    DERE_PERCENT: mapDereRankToPercentLabel(dereRank)
  });
  const schema = {
    type: "object",
    properties: { answer: { type: "string" } },
    required: ["answer"],
    additionalProperties: false
  };
  const json = await ollamaGenerateJson(userPrompt, schema);
  if (!validateReasoningResponseJson(json)) {
    throw new AppError("Ollama response JSON failed schema validation", {
      status: 502,
      code: "UPSTREAM_SCHEMA_MISMATCH",
      details: validateReasoningResponseJson.errors
    });
  }
  return json.answer;
}

export async function evaluatePronunciation({
  targetPhrase,
  targetLanguage = "en",
  mfccAccuracy,
  waveformSimilarity,
  timingInfo,
  transcript
}) {
  const targetLang = 
    targetLanguage === "de" ? "German" : 
    targetLanguage === "en" ? "English" : 
    targetLanguage === "ja" ? "Japanese" : "English";
  
  const userPrompt = await renderPrompt("pronunciationEvaluation", {
    TARGET_PHRASE: targetPhrase,
    TARGET_LANG: targetLang,
    MFCC_ACCURACY: Math.round(mfccAccuracy || 0),
    WAVEFORM_SIMILARITY: Math.round(waveformSimilarity || 0),
    TIMING_INFO: timingInfo || "normal",
    TRANSCRIPT: transcript || "(not available)"
  });

  const schema = {
    type: "object",
    properties: {
      improvements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            focus: { type: "string", enum: ["articulation", "timing", "stress", "intonation", "other"] },
            point: { type: "string" },
            tip: { type: "string" }
          },
          required: ["focus", "point", "tip"],
          additionalProperties: false
        },
        minItems: 2,
        maxItems: 5
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      encouragement: { type: "string" }
    },
    required: ["improvements", "confidence", "encouragement"],
    additionalProperties: false
  };

  const json = await ollamaGenerateJson(userPrompt, schema);
  
  // Basic validation
  if (!Array.isArray(json?.improvements) || json.improvements.length === 0) {
    throw new AppError("Pronunciation evaluation returned invalid structure", {
      status: 502,
      code: "UPSTREAM_INVALID_JSON"
    });
  }

  return json;
}