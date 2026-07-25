import express from "express";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool, withTransaction } from "../db.js";
import { AppError, asyncHandler } from "../errors.js";
import {
  parseOrThrow,
  fastPreviewInputSchema,
  fastConfirmInputSchema,
  knowledgeNodeInputSchema,
  audioInsertSchema,
  semanticSearchSchema,
  accentAnalysisInputSchema,
  audioTranscriptionInputSchema,
  reasoningAskInputSchema
} from "../validators.js";
import { analyzeAccentFromAudio, embedText, generateFastPipelineTerm, generateReasoningAnswer, evaluatePronunciation } from "../services/ollamaClient.js";
import { buildAudioObjectPath, buildAudioPublicUrl, buildAudioUploadPolicy } from "../services/audioStorage.js";
import { transcribePcmAudio } from "../services/whisperClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const languagesFilePath = join(__dirname, "../prompts/languages.json");
let languagesData = JSON.parse(readFileSync(languagesFilePath, "utf-8"));

export const languageRoutes = express.Router();

async function assertTermExists(termId) {
  const r = await pool.query("SELECT id FROM core_terms WHERE id = $1", [termId]);
  if (!r.rows[0]) {
    throw new AppError("Term was not found", { status: 404, code: "TERM_NOT_FOUND", details: { termId } });
  }
}

languageRoutes.get("/languages", asyncHandler(async (req, res) => {
  const includeHidden = req.query.includeHidden === "true";
  const languages = includeHidden 
    ? languagesData.languages 
    : languagesData.languages.filter(lang => lang.visible !== false);
  res.json({ ok: true, languages });
}));

languageRoutes.post("/languages", asyncHandler(async (req, res) => {
  const { code, name, nativeName, visible = true } = req.body;
  if (!code || !name) {
    throw new AppError("Language code and name are required", { status: 400, code: "INVALID_INPUT" });
  }

  const newLanguage = { code, name, nativeName: nativeName || name, visible };
  
  // Check if language already exists
  const exists = languagesData.languages.some(l => l.code === code);
  if (!exists) {
    languagesData.languages.push(newLanguage);
    writeFileSync(languagesFilePath, JSON.stringify(languagesData), "utf-8");
  }

  res.status(201).json({ ok: true, language: newLanguage });
}));

languageRoutes.delete("/languages/:code", asyncHandler(async (req, res) => {
  const { code } = req.params;
  const initialLength = languagesData.languages.length;
  
  languagesData.languages = languagesData.languages.filter(l => l.code !== code);
  
  if (languagesData.languages.length === initialLength) {
    throw new AppError("Language not found", { status: 404, code: "LANGUAGE_NOT_FOUND" });
  }
  
  writeFileSync(languagesFilePath, JSON.stringify(languagesData), "utf-8");
  res.json({ ok: true, message: `Language ${code} deleted successfully` });
}));

languageRoutes.patch("/languages/:code", asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { visible } = req.body;
  
  // Reload languages data to ensure fresh state
  languagesData = JSON.parse(readFileSync(languagesFilePath, "utf-8"));
  
  const language = languagesData.languages.find(l => l.code === code);
  if (!language) {
    throw new AppError("Language not found", { status: 404, code: "LANGUAGE_NOT_FOUND" });
  }
  
  if (visible !== undefined) {
    language.visible = visible;
    writeFileSync(languagesFilePath, JSON.stringify(languagesData), "utf-8");
  }
  
  res.json({ ok: true, language });
}));

languageRoutes.post("/fast-pipeline/preview", asyncHandler(async (req, res) => {
  const body = parseOrThrow(fastPreviewInputSchema, req.body);
  const preview = await generateFastPipelineTerm(body.term);
  res.json({ ok: true, preview });
}));

languageRoutes.post("/fast-pipeline/confirm", asyncHandler(async (req, res) => {
  const body = parseOrThrow(fastConfirmInputSchema, req.body);

  const inserted = await withTransaction(async (client) => {
    const r = await client.query(
      `INSERT INTO core_terms (term_en, term_de, ipa_uk)
       VALUES ($1, $2, $3)
       ON CONFLICT (term_en, term_de)
       DO UPDATE SET ipa_uk = EXCLUDED.ipa_uk
       RETURNING id, term_en, term_de, ipa_uk, created_at`,
      [body.english.trim(), body.german.trim(), body.uk_phonetic.trim()]
    );
    return r.rows[0];
  });

  res.status(201).json({ ok: true, term: inserted });
}));

languageRoutes.post("/knowledge-nodes", asyncHandler(async (req, res) => {
  const body = parseOrThrow(knowledgeNodeInputSchema, req.body);
  await assertTermExists(body.termId);
  const hasSynonym = /synonym|類義語|vergleich|nuance|See\s+vs\s+Meet/i.test(body.content);
  const normalizedTags = new Set(body.tags || []);
  if (hasSynonym) normalizedTags.add("#synonym_comparison");

  const vector = await embedText(body.content);
  const vectorLiteral = `[${vector.join(",")}]`;

  const r = await pool.query(
    `INSERT INTO knowledge_nodes (term_id, content, type, tags, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)
     RETURNING id, term_id, content, type, tags, created_at`,
    [body.termId, body.content, body.type, [...normalizedTags], vectorLiteral]
  );

  res.status(201).json({ ok: true, node: r.rows[0] });
}));

languageRoutes.post("/reasoning/ask", asyncHandler(async (req, res) => {
  const body = parseOrThrow(reasoningAskInputSchema, req.body);
  if (body.termId) {
    await assertTermExists(body.termId);
  }

  const answer = await generateReasoningAnswer({
    prompt: body.prompt,
    language: body.language || "ja",
    characterStyle: body.characterStyle || "tsundere",
    characterGender: body.characterGender || "neutral",
    dereRank: body.dereRank || 2
  });

  res.json({ ok: true, answer });
}));

languageRoutes.post("/audio/upload-policy", asyncHandler(async (req, res) => {
  const payload = parseOrThrow(audioInsertSchema.omit({ fileUrl: true }), req.body);
  await assertTermExists(payload.termId);
  const path = buildAudioObjectPath({ termId: payload.termId, type: payload.type, userId: req.headers["x-user-id"] });
  const policy = buildAudioUploadPolicy(path);
  const fileUrl = buildAudioPublicUrl(path);
  res.json({ ok: true, policy, fileUrl });
}));

languageRoutes.post("/audio/register", asyncHandler(async (req, res) => {
  const body = parseOrThrow(audioInsertSchema, req.body);
  await assertTermExists(body.termId);

  const result = await withTransaction(async (client) => {
    const audio = await client.query(
      `INSERT INTO audio_repository (term_id, type, file_url, self_evaluation)
       VALUES ($1, $2, $3, $4)
       RETURNING id, term_id, type, file_url, self_evaluation, created_at`,
      [body.termId, body.type, body.fileUrl, body.selfEvaluation ?? null]
    );

    if (body.selfEvaluation) {
      await client.query(
        `INSERT INTO term_evaluation_history (term_id, audio_id, self_evaluation)
         VALUES ($1, $2, $3)`,
        [body.termId, audio.rows[0].id, body.selfEvaluation]
      );
    }

    return audio.rows[0];
  });

  res.status(201).json({ ok: true, audio: result });
}));

languageRoutes.post("/audio/accent-analysis", asyncHandler(async (req, res) => {
  const body = parseOrThrow(accentAnalysisInputSchema, req.body);
  if (body.termId) {
    await assertTermExists(body.termId);
  }

  const analysis = await analyzeAccentFromAudio({
    targetWord: body.targetWord,
    sourceLanguage: body.sourceLanguage || "en",
    targetLanguage: body.targetLanguage || "de",
    mimeType: body.mimeType,
    audioBase64: body.audioBase64
  });

  res.json({ ok: true, analysis });
}));

languageRoutes.post("/audio/transcribe", asyncHandler(async (req, res) => {
  const body = parseOrThrow(audioTranscriptionInputSchema, req.body);
  const transcription = await transcribePcmAudio(body);
  res.json({ ok: true, transcription });
}));

languageRoutes.post("/search/semantic", asyncHandler(async (req, res) => {
  const body = parseOrThrow(semanticSearchSchema, req.body);
  const vector = await embedText(body.query);
  const vectorLiteral = `[${vector.join(",")}]`;

  const r = await pool.query(
    `SELECT id, term_id, content, type, tags, created_at,
            1 - (embedding <=> $1::vector) AS similarity
     FROM knowledge_nodes
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral, body.limit]
  );

  res.json({ ok: true, items: r.rows });
}));

languageRoutes.post("/audio/evaluate-pronunciation", asyncHandler(async (req, res) => {
  const { targetPhrase, targetLanguage, mfccAccuracy, waveformSimilarity, timingInfo, transcript } = req.body;

  if (!targetPhrase) {
    throw new AppError("targetPhrase is required", { status: 400, code: "MISSING_INPUT" });
  }

  const evaluation = await evaluatePronunciation({
    targetPhrase,
    targetLanguage: targetLanguage || "en",
    mfccAccuracy: mfccAccuracy || 0,
    waveformSimilarity: waveformSimilarity || 0,
    timingInfo: timingInfo || "normal",
    transcript: transcript || ""
  });

  res.json({ ok: true, evaluation });
}));
