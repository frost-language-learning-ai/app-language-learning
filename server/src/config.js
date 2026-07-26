export const config = {
  port: Number(process.env.LANG_SERVER_PORT || 8787),
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/language_learning",
  ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, ""),
  ollamaModel: process.env.OLLAMA_MODEL || "gemma3:4b",
  ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "embeddinggemma",
  whisperModel: process.env.WHISPER_MODEL || "Xenova/whisper-tiny",
  ttsVoice: process.env.TTS_VOICE || "en-GB-Wavenet-A",
  audioBucketBaseUrl: process.env.AUDIO_BUCKET_BASE_URL || "https://storage.example.com/language-learning",
  audioUploadTtlSeconds: Number(process.env.AUDIO_UPLOAD_TTL_SECONDS || 900)
};

export function assertRequiredConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push("DATABASE_URL");

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
