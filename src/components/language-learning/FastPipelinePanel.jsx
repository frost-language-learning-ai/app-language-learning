import React, { useState, useEffect } from "react";
import { languageApi } from "../../lib/apiClient.js";

const DEFAULT_LANGUAGES = [
  { code: "en", name: "English", visible: true },
  { code: "de", name: "Deutsch", visible: true },
  { code: "ja", name: "日本語", visible: true },
  { code: "es", name: "Español", visible: true },
  { code: "it", name: "Italiano", visible: true },
  { code: "fr", name: "Français", visible: true },
  { code: "ru", name: "Русский", visible: true },
  { code: "ar", name: "العربية", visible: true },
  { code: "zh", name: "中文", visible: true },
  { code: "ko", name: "한국어", visible: true },
  { code: "pt", name: "Português", visible: true }
];

export default function FastPipelinePanel({ 
  sourceLanguage, 
  setSourceLanguage, 
  targetLanguage, 
  setTargetLanguage, 
  onError,
  onPronunciationPracticeStart,
  t 
}) {
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);

  // State for user inputs and API responses
  // prompt for an AI and preview state
  const [term, setTerm] = useState("");
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadLanguages() {
      try {
        const result = await languageApi.getLanguages();
        if (result.languages && result.languages.length > 0) {
          setLanguages(result.languages.filter(lang => lang.visible !== false));
        }
      } catch (error) {
        console.warn("Failed to load languages from API, using defaults:", error);
      }
    }
    loadLanguages();
  }, []);

  async function onPreview() {
    setStatus("loading");
    setMessage("");
    try {
      const result = await languageApi.fastPreview(
        term.trim(),
        sourceLanguage,
        targetLanguage
      );
      setPreview(result.preview);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
      setMessage(`${error.message}${suffix}`);
      onError?.(error);
    }
  }

  async function onConfirm() {
    if (!preview) return;

    setStatus("saving");
    setMessage("");
    try {
      await languageApi.fastConfirm({
        sourceLanguage,
        targetLanguage,
        term: preview.source || term,
        translation: preview.target,
        details: {
          phonetic: preview.phonetic,
          nuance: preview.nuance,
          category: preview.category_suggestion,
          examples: preview.examples
        }
      });
      setStatus("saved");
      setMessage(t.llSavedCoreTerms || "Saved to Core_Terms.");
      
      // Start pronunciation practice with the saved word
      if (onPronunciationPracticeStart) {
        setTimeout(() => {
          onPronunciationPracticeStart({
            sourceWord: preview.source || term,
            targetWord: preview.target,
            phonetic: preview.phonetic,
            examples: preview.examples
          });
        }, 500);
      }
    } catch (error) {
      setStatus("error");
      const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
      setMessage(`${error.message}${suffix}`);
      onError?.(error);
    }
  }

  const sourceLangName = languages.find(l => l.code === sourceLanguage)?.name || "";
  const targetLangName = languages.find(l => l.code === targetLanguage)?.name || "";

  return (
    <section className="ll-card">
      <h3>{t.llFastTitle || "Fast Pipeline"}</h3>
      
      {/* Language Selection */}
      <div className="ll-language-row">
        <div className="ll-language-select">
          <label>{t.llSourceLanguage || "Source Language"}</label>
          <select
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
            className="ll-select"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        <div className="ll-swap-button">
          <button
            onClick={() => {
              setSourceLanguage(targetLanguage);
              setTargetLanguage(sourceLanguage);
            }}
            className="ll-button"
            title="Swap languages"
          >
            ⇄
          </button>
        </div>

        <div className="ll-language-select">
          <label>{t.llTargetLanguage || "Target Language"}</label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="ll-select"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Term Input and Preview */}
      <div className="ll-row">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t.llTermPlaceholder || `Enter a word in ${sourceLangName}...`}
          className="ll-input"
        />
        <button disabled={!term.trim() || status === "loading"} onClick={onPreview} className="ll-button">
          {t.llPreviewButton || "Preview"}
        </button>
      </div>

      {preview && (
        <div className="ll-preview">
          <p><strong>{sourceLanguage.toUpperCase()}:</strong> {preview.source || preview.english || term}</p>
          <p><strong>{targetLanguage.toUpperCase()}:</strong> {preview.target || preview.german}</p>
          {preview.phonetic && <p><strong>Phonetic:</strong> {preview.phonetic}</p>}
          {preview.nuance && <p><strong>Nuance:</strong> {preview.nuance}</p>}
          {preview.category_suggestion && <p><strong>Category:</strong> {preview.category_suggestion}</p>}
          {preview.examples && preview.examples.length > 0 && (
            <>
              <p><strong>Examples:</strong></p>
              <ul>
                {preview.examples.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          <button disabled={status === "saving"} onClick={onConfirm} className="ll-button ll-button-primary">{t.llConfirmSaveButton || "Confirm & Save"}</button>
        </div>
      )}

      {message && <p className="ll-message">{message}</p>}
    </section>
  );
}
