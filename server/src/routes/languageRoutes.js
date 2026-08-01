import express from "express";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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
const bundledLanguagesFilePath = join(__dirname, "../prompts/languages.json");
const languagesFilePath = process.env.LANGUAGE_SETTINGS_FILE || bundledLanguagesFilePath;

function ensureLanguageSettingsFile() {
  if (languagesFilePath === bundledLanguagesFilePath || existsSync(languagesFilePath)) return;
  mkdirSync(dirname(languagesFilePath), { recursive: true });
  copyFileSync(bundledLanguagesFilePath, languagesFilePath);
}

function loadLanguages() {
  ensureLanguageSettingsFile();
  return JSON.parse(readFileSync(languagesFilePath, "utf-8"));
}

function saveLanguages(data) {
  try {
    writeFileSync(languagesFilePath, JSON.stringify(data), "utf-8");
  } catch (error) {
    throw new AppError(`Could not save language visibility: ${error.message}`, {
      status: 500,
      code: "LANGUAGE_SETTINGS_SAVE_FAILED",
      expose: true,
      cause: error
    });
  }
}

let languagesData = loadLanguages();

export const languageRoutes = express.Router();

async function assertTermExists(termId) {
  const r = await pool.query("SELECT id FROM core_terms WHERE id = $1", [termId]);
  if (!r.rows[0]) {
    throw new AppError("Term was not found", { status: 404, code: "TERM_NOT_FOUND", details: { termId } });
  }
}

languageRoutes.get("/languages", asyncHandler(async (req, res) => {
  const includeHidden = req.query.includeHidden === "true";
  languagesData = loadLanguages();
  const languages = includeHidden 
    ? languagesData.languages 
    : languagesData.languages.filter(lang => lang.visible !== false);
  res.json({ ok: true, languages });
}));

languageRoutes.patch("/languages/:code", asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { visible } = req.body;
  
  if (typeof visible !== "boolean") {
    throw new AppError("visible must be a boolean", { status: 400, code: "INVALID_INPUT" });
  }

  languagesData = loadLanguages();
  
  const language = languagesData.languages.find(l => l.code === code);
  if (!language) {
    throw new AppError("Language not found", { status: 404, code: "LANGUAGE_NOT_FOUND" });
  }
  
  language.visible = visible;
  saveLanguages(languagesData);
  
  res.json({ ok: true, language });
}));

languageRoutes.post("/fast-pipeline/preview", asyncHandler(async (req, res) => {
  const body = parseOrThrow(fastPreviewInputSchema, req.body);
  const sourceLang = body.sourceLanguage || "en";
  const targetLang = body.targetLanguage || "de";
  const phoneticType = body.phoneticType || "british";
  const preview = await generateFastPipelineTerm(body.term, sourceLang, targetLang, phoneticType);
  res.json({ ok: true, preview });
}));

languageRoutes.post("/fast-pipeline/confirm", asyncHandler(async (req, res) => {
  const body = parseOrThrow(fastConfirmInputSchema, req.body);

  const sourceLang = body.sourceLanguage || "en";
  const targetLang = body.targetLanguage || "de";

  const inserted = await withTransaction(async (client) => {
    const detailsJson = JSON.stringify(body.details);
    const partOfSpeech = body.details.part_of_speech || null;
    const r = await client.query(
      `INSERT INTO core_terms (term_en, term_de, ipa_uk, source_lang, target_lang, part_of_speech, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (term_en, term_de, source_lang, target_lang)
       DO UPDATE SET ipa_uk = EXCLUDED.ipa_uk, part_of_speech = EXCLUDED.part_of_speech, details = EXCLUDED.details
       RETURNING id, term_en, term_de, ipa_uk, source_lang, target_lang, part_of_speech, details, created_at`,
      [body.term.trim(), body.translation.trim(), body.details.phonetic.trim(), sourceLang, targetLang, partOfSpeech, detailsJson]
    );
    const term = r.rows[0];
    if (term.details && typeof term.details === 'string') {
      term.details = JSON.parse(term.details);
    }
    return term;
  });

  res.status(201).json({ ok: true, term: inserted });
}));

languageRoutes.get("/core-terms", asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const sourceLang = req.query.sourceLang;
  const targetLang = req.query.targetLang;

  let query = `SELECT id, term_en, term_de, ipa_uk, source_lang, target_lang, part_of_speech, details, created_at
               FROM core_terms`;
  let countQuery = `SELECT COUNT(*) as total FROM core_terms`;
  const params = [];
  const whereConditions = [];

  if (sourceLang) {
    params.push(sourceLang);
    whereConditions.push(`source_lang = $${params.length}`);
  }

  if (targetLang) {
    params.push(targetLang);
    whereConditions.push(`target_lang = $${params.length}`);
  }

  if (whereConditions.length > 0) {
    const whereClause = ` WHERE ${whereConditions.join(" AND ")}`;
    query += whereClause;
    countQuery += whereClause;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  const countResult = await pool.query(countQuery, params.slice(0, whereConditions.length));
  const total = Number(countResult.rows[0].total);

  const terms = result.rows.map(term => {
    if (term.details && typeof term.details === 'string') {
      term.details = JSON.parse(term.details);
    }
    return term;
  });

  res.json({ 
    ok: true, 
    terms,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total
    }
  });
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
