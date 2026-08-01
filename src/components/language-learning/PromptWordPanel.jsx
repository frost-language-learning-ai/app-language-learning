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

export default function PromptWordPanel({ 
  sourceLanguage, 
  targetLanguage,
  phoneticType,
  setPhoneticType,
  phoneticTypesByLanguage,
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
    if (!term.trim()) return;
    setStatus("loading");
    setMessage("");
    setPreview(null);
    try {
      const result = await languageApi.fastPreview({ 
        term: term.trim(),
        sourceLanguage,
        targetLanguage,
        phoneticType: hasPhoneticTypes ? phoneticType : undefined
      });
      setPreview(result.preview);
      setStatus("previewed");
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
        term: preview.term,
        translation: preview.translation,
        details: {
          phonetic: preview.phonetic,
          part_of_speech: preview.part_of_speech,
          nuance: preview.nuance,
          category: preview.category,
          examples: preview.examples,
          slang_examples: preview.slang_examples
        }
      });
      setStatus("saved");
      setMessage(t.llSavedCoreTerms || "Saved to Core_Terms.");
      
      // Start pronunciation practice with the saved word
      if (onPronunciationPracticeStart) {
        setTimeout(() => {
          onPronunciationPracticeStart({
            sourceWord: preview.term,
            targetWord: preview.translation,
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

  const phoneticTypes = (phoneticTypesByLanguage?.[targetLanguage]) || [];
  const hasPhoneticTypes = phoneticTypes.length > 0;

  return (
    <div>
      <h3>{t.llWordPrompt || "Word Check Prompt"}</h3>
      <p style={{ marginTop: "4px", marginBottom: "16px", fontSize: "0.9em", color: "var(--ll-text-muted)", lineHeight: "1.4" }}>
        {t.llWordLearningDesc || "Quickly learn and save a new word. AI generates pronunciation, category, and examples for it."}
      </p>
      
      {/* Error/Status Message at Top */}
      {message && (
        <p className={`ll-message ${status === "error" ? "ll-message-error" : ""}`} role="status">
          {message}
        </p>
      )}

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
          <p><strong>{sourceLanguage.toUpperCase()}:</strong> {preview.term}</p>
          <p><strong>{targetLanguage.toUpperCase()}:</strong> {preview.translation}</p>
          {preview.phonetic && <p><strong>Phonetic:</strong> {preview.phonetic}</p>}
          {preview.part_of_speech && <p><strong>Part of Speech:</strong> {preview.part_of_speech}</p>}
          {preview.category && <p><strong>Category:</strong> {preview.category}</p>}
          {preview.nuance && (
            <>
              <p><strong>Nuance:</strong> {preview.nuance}</p>
            </>
          )}
          {preview.slang_nuance && (
            <>
              <p><strong>Slang Nuance:</strong> {preview.slang_nuance}</p>
            </>
          )}
          {preview.examples && preview.examples.length > 0 && (
            <>
              <p><strong>Examples ({targetLanguage.toUpperCase()}):</strong></p>
              <ul>
                {preview.examples.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {preview.slang_examples && preview.slang_examples.length > 0 && (
            <>
              <p><strong>Slang Examples ({targetLanguage.toUpperCase()}):</strong></p>
              <ul>
                {preview.slang_examples.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          <button disabled={status === "saving"} onClick={onConfirm} className="ll-button ll-button-primary">{t.llConfirmSaveButton || "Confirm & Save"}</button>
        </div>
      )}
    </div>
  );
}
