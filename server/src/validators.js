import Ajv from "ajv";
import addFormats from "ajv-formats";
import { z } from "zod";
import { AppError } from "./errors.js";
import { getTranscriptionLanguageCodes, getReasoningLanguageCodes } from "./lib/supportedLanguages.js";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

export const fastPipelineSchema = {
  type: "object",
  additionalProperties: false,
  required: ["english", "german", "nuance", "examples", "category_suggestion"],
  properties: {
    english: { type: "string", minLength: 1, maxLength: 120 },
    german: { type: "string", minLength: 1, maxLength: 120 },
    nuance: { type: "string", minLength: 1, maxLength: 800 },
    examples: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 280 }
    },
    category_suggestion: { type: "string", minLength: 1, maxLength: 120 }
  }
};

export const validateFastPipelineJson = ajv.compile(fastPipelineSchema);

export const fastPreviewInputSchema = z.object({
  term: z.string().min(1).max(120)
});

export const fastConfirmInputSchema = z.object({
  english: z.string().min(1).max(120),
  german: z.string().min(1).max(120),
  uk_phonetic: z.string().min(1).max(120)
});

export const knowledgeNodeInputSchema = z.object({
  termId: z.number().int().positive(),
  content: z.string().min(1).max(4000),
  type: z.enum(["nuance_comparison", "context_usage", "grammar_rule"]),
  tags: z.array(z.string().min(1).max(64)).max(12).optional()
});

export const audioInsertSchema = z.object({
  termId: z.number().int().positive(),
  type: z.enum(["model_voice", "user_voice"]),
  fileUrl: z.string().url(),
  selfEvaluation: z.number().int().min(1).max(5).optional()
});

export const semanticSearchSchema = z.object({
  query: z.string().min(1).max(300),
  limit: z.number().int().min(1).max(20).default(5)
});

export const accentAnalysisInputSchema = z.object({
  termId: z.number().int().positive().optional(),
  targetWord: z.string().min(1).max(120),
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
  mimeType: z.enum(["audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/x-m4a", "audio/aac"]),
  audioBase64: z.string().min(1200).max(8_000_000)
});

export const audioTranscriptionInputSchema = z.object({
  pcmBase64: z.string().min(4).max(10_700_000),
  language: z.enum(getTranscriptionLanguageCodes()).default("auto")
});

export const reasoningAskInputSchema = z.object({
  termId: z.number().int().positive().optional(),
  prompt: z.string().min(1).max(5000),
  language: z.enum(getReasoningLanguageCodes()).optional(),
  characterStyle: z.enum(["tsundere", "kuudere", "downer", "kuudere_downer"]).optional(),
  characterGender: z.enum(["female", "male", "neutral"]).optional(),
  dereRank: z.number().int().min(1).max(4).optional()
});

export const reasoningResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer"],
  properties: {
    answer: { type: "string", minLength: 1, maxLength: 8000 }
  }
};

export const validateReasoningResponseJson = ajv.compile(reasoningResponseSchema);

export function parseOrThrow(schema, payload) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError("Validation failed", {
      status: 400,
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten()
    });
  }
  return parsed.data;
}
