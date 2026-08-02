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

  // State for single mode
  const [term, setTerm] = useState("");
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  // State for multiple mode
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [multipleTerms, setMultipleTerms] = useState([""]);
  const [multiplePreviews, setMultiplePreviews] = useState([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [multipleInputFinished, setMultipleInputFinished] = useState(false);

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

  function handleRemoveTermField(index) {
    setMultipleTerms(multipleTerms.filter((_, i) => i !== index));
  }

  function handleTermChange(index, value) {
    const newTerms = [...multipleTerms];
    newTerms[index] = value;
    setMultipleTerms(newTerms);

    // Auto-add a new field if typing in the last field
    if (index === multipleTerms.length - 1 && value.trim() !== "") {
      if (!newTerms[index + 1]) {
        setMultipleTerms([...newTerms, ""]);
      }
    }
  }

  function handleFinishInputAndPreview() {
    const validTerms = multipleTerms.filter(t => t.trim());
    if (validTerms.length === 0) {
      setMessage("最低1つ以上の単語を入力してください");
      return;
    }

    setMultipleInputFinished(true);
    setStatus("loading");
    setMessage("");
    setMultiplePreviews([]);
    setCurrentPreviewIndex(0);

    // Simulate loading and then preview the first term
    setTimeout(() => {
      previewNextTerm(validTerms, 0);
    }, 300);
  }

  async function previewNextTerm(validTerms, index) {
    if (index >= validTerms.length) {
      setStatus("idle");
      setMessage("すべての単語の処理が完了しました");
      setMultipleInputFinished(false);
      setMultipleTerms([""]);
      return;
    }

    setStatus("loading");
    try {
      const result = await languageApi.fastPreview({
        term: validTerms[index].trim(),
        sourceLanguage,
        targetLanguage,
        phoneticType: hasPhoneticTypes ? phoneticType : undefined
      });
      setMultiplePreviews(previews => [...previews, result.preview]);
      setCurrentPreviewIndex(index);
      setStatus("previewed");
    } catch (error) {
      setStatus("error");
      const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
      setMessage(`${error.message}${suffix}`);
      onError?.(error);
    }
  }

  async function onConfirmMultiple(isSave) {
    if (multiplePreviews.length === 0 || currentPreviewIndex >= multiplePreviews.length) return;

    const currentPreview = multiplePreviews[currentPreviewIndex];

    if (isSave) {
      setStatus("saving");
      try {
        await languageApi.fastConfirm({
          sourceLanguage,
          targetLanguage,
          term: currentPreview.term,
          translation: currentPreview.translation,
          details: {
            phonetic: currentPreview.phonetic,
            part_of_speech: currentPreview.part_of_speech,
            nuance: currentPreview.nuance,
            category: currentPreview.category,
            examples: currentPreview.examples,
            slang_examples: currentPreview.slang_examples
          }
        });
        setMessage(`「${currentPreview.term}」を保存しました`);

        // Start pronunciation practice
        if (onPronunciationPracticeStart) {
          setTimeout(() => {
            onPronunciationPracticeStart({
              sourceWord: currentPreview.term,
              targetWord: currentPreview.translation,
              phonetic: currentPreview.phonetic,
              examples: currentPreview.examples
            });
          }, 300);
        }
      } catch (error) {
        setStatus("error");
        const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
        setMessage(`${error.message}${suffix}`);
        onError?.(error);
        return;
      }
    } else {
      setMessage(`「${currentPreview.term}」をスキップしました`);
    }

    // Move to next preview
    if (currentPreviewIndex + 1 < multiplePreviews.length) {
      setCurrentPreviewIndex(currentPreviewIndex + 1);
      setStatus("previewed");
    } else {
      setMessage("すべての単語の処理が完了しました");
      setStatus("idle");
      setIsMultipleMode(false);
      setMultipleTerms([""]);
      setMultiplePreviews([]);
      setCurrentPreviewIndex(0);
      setMultipleInputFinished(false);
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

      {/* Mode Toggle Buttons */}
      <div className="ll-row" style={{ marginBottom: "16px", gap: "8px" }}>
        <button
          onClick={() => {
            setIsMultipleMode(false);
            setStatus("idle");
            setMessage("");
          }}
          className="ll-button"
          style={{
            backgroundColor: !isMultipleMode ? "#1976d2" : "#f5f5f5",
            color: !isMultipleMode ? "white" : "#333",
            border: !isMultipleMode ? "1px solid #1976d2" : "1px solid #ddd",
            fontWeight: !isMultipleMode ? "bold" : "normal",
            padding: "8px 16px"
          }}
        >
          単語
        </button>
        <button
          onClick={() => {
            setIsMultipleMode(true);
            setStatus("idle");
            setMessage("");
          }}
          className="ll-button"
          style={{
            backgroundColor: isMultipleMode ? "#1976d2" : "#f5f5f5",
            color: isMultipleMode ? "white" : "#333",
            border: isMultipleMode ? "1px solid #1976d2" : "1px solid #ddd",
            fontWeight: isMultipleMode ? "bold" : "normal",
            padding: "8px 16px"
          }}
        >
          複数
        </button>
      </div>

      {/* Single Mode */}
      {!isMultipleMode && (
        <>
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
        </>
      )}

      {/* Multiple Mode */}
      {isMultipleMode && (
        <>
          {!multipleInputFinished ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", maxWidth: "600px" }}>
                {multipleTerms.map((termValue, index) => (
                  <div key={index} className="ll-row" style={{ gap: "8px", alignItems: "center" }}>
                    <input
                      value={termValue}
                      onChange={(e) => handleTermChange(index, e.target.value)}
                      placeholder={`単語を入力 (${sourceLangName})`}
                      className="ll-input"
                      style={{ flex: 1 }}
                      disabled={status === "loading" || status === "saving"}
                    />
                    {multipleTerms.length > 1 && (
                      <button
                        onClick={() => handleRemoveTermField(index)}
                        className="ll-button"
                        style={{
                          backgroundColor: "#f44336",
                          color: "white",
                          padding: "6px 10px",
                          whiteSpace: "nowrap",
                          flexShrink: 0
                        }}
                        disabled={status === "loading" || status === "saving"}
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="ll-row" style={{ gap: "8px", marginBottom: "16px", justifyContent: "flex-start" }}>
                <button
                  onClick={handleFinishInputAndPreview}
                  disabled={!multipleTerms.some(t => t.trim()) || status === "loading"}
                  className="ll-button"
                  style={{
                    backgroundColor: "#1976d2",
                    color: "white",
                    padding: "8px 16px",
                    whiteSpace: "nowrap",
                    fontWeight: "bold"
                  }}
                >
                  {status === "loading" ? "処理中..." : "単語入力終了"}
                </button>
              </div>
            </>
          ) : (
            <></>
          )}

          {/* Multiple Preview Display */}
          {multipleInputFinished && multiplePreviews.length > 0 && currentPreviewIndex < multiplePreviews.length && (
            <div className="ll-preview">
              <div style={{ marginBottom: "16px", padding: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px" }}>
                <strong>進捗:</strong> {currentPreviewIndex + 1} / {multiplePreviews.length}
              </div>

              {(() => {
                const currentPreview = multiplePreviews[currentPreviewIndex];
                return (
                  <>
                    <p><strong>{sourceLanguage.toUpperCase()}:</strong> {currentPreview.term}</p>
                    <p><strong>{targetLanguage.toUpperCase()}:</strong> {currentPreview.translation}</p>
                    {currentPreview.phonetic && <p><strong>Phonetic:</strong> {currentPreview.phonetic}</p>}
                    {currentPreview.part_of_speech && <p><strong>Part of Speech:</strong> {currentPreview.part_of_speech}</p>}
                    {currentPreview.category && <p><strong>Category:</strong> {currentPreview.category}</p>}
                    {currentPreview.nuance && (
                      <>
                        <p><strong>Nuance:</strong> {currentPreview.nuance}</p>
                      </>
                    )}
                    {currentPreview.slang_nuance && (
                      <>
                        <p><strong>Slang Nuance:</strong> {currentPreview.slang_nuance}</p>
                      </>
                    )}
                    {currentPreview.examples && currentPreview.examples.length > 0 && (
                      <>
                        <p><strong>Examples ({targetLanguage.toUpperCase()}):</strong></p>
                        <ul>
                          {currentPreview.examples.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {currentPreview.slang_examples && currentPreview.slang_examples.length > 0 && (
                      <>
                        <p><strong>Slang Examples ({targetLanguage.toUpperCase()}):</strong></p>
                        <ul>
                          {currentPreview.slang_examples.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button
                        disabled={status === "saving"}
                        onClick={() => onConfirmMultiple(true)}
                        className="ll-button ll-button-primary"
                      >
                        {status === "saving" ? "保存中..." : "保存"}
                      </button>
                      <button
                        disabled={status === "saving"}
                        onClick={() => onConfirmMultiple(false)}
                        className="ll-button"
                        style={{ backgroundColor: "#757575", color: "white" }}
                      >
                        スキップ
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
