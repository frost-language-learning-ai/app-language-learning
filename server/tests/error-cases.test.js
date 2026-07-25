import request from "supertest";
import { describe, expect, it, vi } from "vitest";

async function loadApp({ mode } = {}) {
  vi.resetModules();

  if (mode === "502") {
    vi.doMock("../src/services/ollamaClient.js", async () => {
      const { AppError } = await import("../src/errors.js");
      return {
        generateFastPipelineTerm: vi.fn(async () => {
          throw new AppError("Ollama request failed", {
            status: 502,
            code: "UPSTREAM_BAD_RESPONSE"
          });
        }),
        embedText: vi.fn(async () => [0.1, 0.2])
      };
    });
  }

  if (mode === "504") {
    vi.doMock("../src/services/ollamaClient.js", async () => {
      const { AppError } = await import("../src/errors.js");
      return {
        generateFastPipelineTerm: vi.fn(async () => {
          throw new AppError("Ollama request timed out", {
            status: 504,
            code: "UPSTREAM_TIMEOUT"
          });
        }),
        embedText: vi.fn(async () => [0.1, 0.2])
      };
    });
  }

  const mod = await import("../src/app.js");
  vi.doUnmock("../src/services/ollamaClient.js");
  return mod.default;
}

describe("API error responses", () => {
  it("returns 400 for validation error", async () => {
    const app = await loadApp();
    const res = await request(app).post("/api/fast-pipeline/preview").send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(typeof res.body.error.requestId).toBe("string");
  });

  it("returns 404 for unknown route", async () => {
    const app = await loadApp();
    const res = await request(app).get("/api/not-existing-route");

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(typeof res.body.error.requestId).toBe("string");
  });

  it("returns 502 for upstream bad response", async () => {
    const app = await loadApp({ mode: "502" });
    const res = await request(app)
      .post("/api/fast-pipeline/preview")
      .send({ term: "meet" });

    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("UPSTREAM_BAD_RESPONSE");
    expect(typeof res.body.error.requestId).toBe("string");
  });

  it("returns 504 for upstream timeout", async () => {
    const app = await loadApp({ mode: "504" });
    const res = await request(app)
      .post("/api/fast-pipeline/preview")
      .send({ term: "meet" });

    expect(res.status).toBe(504);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("UPSTREAM_TIMEOUT");
    expect(typeof res.body.error.requestId).toBe("string");
  });

  it("returns 501 for audio accent analysis", async () => {
    const app = await loadApp();
    const res = await request(app).post("/api/audio/accent-analysis").send({
      targetWord: "meet",
      mimeType: "audio/webm",
      audioBase64: "A".repeat(1200)
    });

    expect(res.status).toBe(501);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("FEATURE_UNAVAILABLE");
  });

  it("validates Whisper transcription input before loading a model", async () => {
    const app = await loadApp();
    const res = await request(app).post("/api/audio/transcribe").send({ language: "en" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
