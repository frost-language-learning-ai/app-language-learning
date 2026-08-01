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
  required: ["source_language", "target_language", "term", "translation", "part_of_speech", "phonetic", "category", "nuance", "examples"],
  properties: {
    source_language: { type: "string", minLength: 2, maxLength: 10 },
    target_language: { type: "string", minLength: 2, maxLength: 10 },
    term: { type: "string", minLength: 1, maxLength: 120 },
    translation: { type: "string", minLength: 1, maxLength: 120 },
    part_of_speech: { type: "string", minLength: 1, maxLength: 50 },
    phonetic: { type: "string", minLength: 1, maxLength: 120 },
    category: { type: "string", minLength: 1, maxLength: 120 },
    nuance: { type: "string", minLength: 1, maxLength: 800 },
    slang_nuance: { type: "string", minLength: 0, maxLength: 800 },
    examples: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string", minLength: 1, maxLength: 280 }
    },
    slang_examples: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 280 }
    }
  }
};

export const validateFastPipelineJson = ajv.compile(fastPipelineSchema);

export const fastPreviewInputSchema = z.object({
  term: z.string().min(1).max(120),
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
  phoneticType: z.string().min(2).max(20).optional()
});

export const fastConfirmInputSchema = z.object({
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
  term: z.string().min(1).max(120),
  translation: z.string().min(1).max(120),
  details: z.object({
    phonetic: z.string().min(1).max(120),
    part_of_speech: z.string().min(1).max(50).optional(),
    nuance: z.string().optional(),
    category: z.string().optional(),
    examples: z.array(z.string()).optional()
  })
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
