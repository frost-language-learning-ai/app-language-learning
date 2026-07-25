import { randomUUID } from "node:crypto";
import { config } from "../config.js";

export function buildAudioObjectPath({ termId, type, userId = "anonymous" }) {
  const yyyy = new Date().toISOString().slice(0, 4);
  const mm = new Date().toISOString().slice(5, 7);
  const token = randomUUID();
  return `${yyyy}/${mm}/term-${termId}/${type}/${userId}/${token}.webm`;
}

export function buildAudioUploadPolicy(path) {
  const expiresAt = new Date(Date.now() + config.audioUploadTtlSeconds * 1000).toISOString();
  return {
    path,
    expiresAt,
    contentType: "audio/webm",
    maxSizeBytes: 10 * 1024 * 1024,
    access: "private",
    retention: "2 years"
  };
}

export function buildAudioPublicUrl(path) {
  // Keep default private. This URL should typically be signed on retrieval.
  return `${config.audioBucketBaseUrl}/${path}`;
}
