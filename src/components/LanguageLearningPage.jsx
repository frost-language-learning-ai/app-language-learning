import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import PromptWordPanel from "./language-learning/PromptWordPanel.jsx";
import PromptReasoningPanel from "./language-learning/PromptReasoningPanel.jsx";
import PromptFreestylePanel from "./language-learning/PromptFreestylePanel.jsx";
import AudioIntelligencePanel from "./language-learning/AudioIntelligencePanel.jsx";
import SettingsPanel from "./language-learning/SettingsPanel.jsx";
import AiSetupPanel from "./language-learning/AiSetupPanel.jsx";
import SavedWordsPanel from "./language-learning/SavedWordsPanel.jsx";
import "../css/language-learning.css";

// Language variants (regional dialects and varieties)
const LANGUAGE_VARIANTS = {
  en: [
    { code: 'en-US', name: 'English (United States)' },
    { code: 'en-GB', name: 'English (United Kingdom)' },
    { code: 'en-AU', name: 'English (Australia)' },
    { code: 'en-CA', name: 'English (Canada)' },
    { code: 'en-IN', name: 'English (India)' },
  ],
  de: [
    { code: 'de-DE', name: 'Deutsch (Deutschland)' },
    { code: 'de-AT', name: 'Deutsch (Österreich)' },
    { code: 'de-CH', name: 'Deutsch (Schweiz)' },
  ],
  ja: [
    { code: 'ja-JP', name: '日本語 (日本)' },
  ],
  es: [
    { code: 'es-ES', name: 'Español (España)' },
    { code: 'es-MX', name: 'Español (México)' },
    { code: 'es-AR', name: 'Español (Argentina)' },
  ],
  fr: [
    { code: 'fr-FR', name: 'Français (France)' },
    { code: 'fr-CA', name: 'Français (Canada)' },
    { code: 'fr-CH', name: 'Français (Suisse)' },
  ],
  pt: [
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'pt-PT', name: 'Português (Portugal)' },
  ],
  it: [
    { code: 'it-IT', name: 'Italiano (Italia)' },
  ],
  ru: [
    { code: 'ru-RU', name: 'Русский (Россия)' },
  ],
  ar: [
    { code: 'ar-SA', name: 'العربية (السعودية)' },
  ],
  zh: [
    { code: 'zh-CN', name: '中文 (简体)' },
    { code: 'zh-TW', name: '中文 (繁體)' },
  ],
  ko: [
    { code: 'ko-KR', name: '한국어 (대한민국)' },
  ],
};

// Language-specific phonetic accent types (defined outside component)
const PHONETIC_TYPES_BY_LANGUAGE = {
  en: [
    { code: "british", name: "British (UK)" },
    { code: "american", name: "American (US)" },
    { code: "australian", name: "Australian" },
    { code: "canadian", name: "Canadian" },
    { code: "indian", name: "Indian" },
    { code: "singaporean", name: "Singaporean" },
    { code: "south_african", name: "South African" },
    { code: "irish", name: "Irish" },
    { code: "scottish", name: "Scottish" },
    { code: "new_zealand", name: "New Zealand" }
  ],
  es: [
    { code: "spain", name: "Spain (Castilian)" },
    { code: "mexico", name: "Mexico" },
    { code: "argentina", name: "Argentina" },
    { code: "colombia", name: "Colombia" },
    { code: "peru", name: "Peru" },
    { code: "chile", name: "Chile" },
    { code: "venezuela", name: "Venezuela" },
    { code: "caribbean", name: "Caribbean (Cuba, Puerto Rico)" }
  ],
  de: [
    { code: "hochdeutsch", name: "Hochdeutsch (Standard German)" },
    { code: "northern_germany", name: "Northern Germany" },
    { code: "southern_germany", name: "Southern Germany (Bavaria)" },
    { code: "austrian", name: "Austrian" },
    { code: "swiss_german", name: "Swiss German" },
    { code: "belgian_german", name: "Belgian (Eupen)" },
    { code: "south_tyrol", name: "Northern Italy (South Tyrol)" }
  ],
  fr: [
    { code: "france", name: "France (Parisian)" },
    { code: "belgian_french", name: "Belgian French" },
    { code: "swiss_french", name: "Swiss French" },
    { code: "canadian_french", name: "Canadian (Quebec)" },
    { code: "african_french", name: "African French" }
  ],
  ja: [
    { code: "tokyo", name: "Tokyo (Standard)" },
    { code: "kansai", name: "Kansai (Osaka)" },
    { code: "kyushu", name: "Kyushu" },
    { code: "tohoku", name: "Tohoku" },
    { code: "hokkaido", name: "Hokkaido" }
  ],
  zh: [
    { code: "mandarin_beijing", name: "Mandarin (Beijing)" },
    { code: "taiwan", name: "Taiwan" },
    { code: "singapore_chinese", name: "Singapore" },
    { code: "southern_china", name: "Southern China" }
  ],
  pt: [
    { code: "portugal", name: "Portugal" },
    { code: "brazil", name: "Brazil" },
    { code: "angola", name: "Angola" },
    { code: "mozambique", name: "Mozambique" }
  ],
  ar: [
    { code: "msa", name: "Modern Standard Arabic" },
    { code: "egyptian", name: "Egyptian" },
    { code: "levantine", name: "Levantine (Syria, Lebanon)" },
    { code: "gulf", name: "Gulf Arabic" },
    { code: "maghrebi", name: "Maghrebi (Morocco, Algeria)" }
  ],
  it: [
    { code: "standard_italian", name: "Standard Italian (Florence)" },
    { code: "roman", name: "Roman" },
    { code: "neapolitan", name: "Neapolitan" },
    { code: "sicilian", name: "Sicilian" },
    { code: "venetian", name: "Venetian" }
  ],
  ru: [
    { code: "moscow", name: "Moscow (Standard)" },
    { code: "st_petersburg", name: "St. Petersburg" },
    { code: "southern_russia", name: "Southern Russia" },
    { code: "siberian", name: "Siberian" }
  ],
  ko: [
    { code: "seoul", name: "Seoul (Standard)" },
    { code: "busan", name: "Busan" },
    { code: "jeolla", name: "Jeolla" },
    { code: "north_korean", name: "North Korean" }
  ]
};

export default function LanguageLearningPage({ locale, setLocale, t }) {
  const [globalError, setGlobalError] = useState("");
  const [activeTab, setActiveTab] = useState("workbench");
  const [isLanguageSectionExpanded, setIsLanguageSectionExpanded] = useState(true);
  const [workbenchMode, setWorkbenchMode] = useState(() => 
    localStorage.getItem("settings.workbenchMode") || "word-learning"
  );
  const [sourceLanguage, setSourceLanguage] = useState(() => 
    localStorage.getItem("settings.sourceLanguage") || "en"
  );
  const [targetLanguage, setTargetLanguage] = useState(() => 
    localStorage.getItem("settings.targetLanguage") || "de"
  );
  const [characterStyle, setCharacterStyle] = useState(() => 
    localStorage.getItem("settings.characterStyle") || "tsundere"
  );
  const [characterGender, setCharacterGender] = useState(() => 
    localStorage.getItem("settings.characterGender") || "neutral"
  );
  const [dereRank, setDereRank] = useState(() => 
    Number(localStorage.getItem("settings.dereRank")) || 2
  );
  const [phoneticType, setPhoneticType] = useState(() => 
    localStorage.getItem("settings.phoneticType") || "british"
  );
  const [sourceLanguageVariant, setSourceLanguageVariant] = useState(() => {
    const stored = localStorage.getItem("settings.sourceLanguageVariant");
    if (stored) return stored;
    const lang = localStorage.getItem("settings.sourceLanguage") || "en";
    const variants = LANGUAGE_VARIANTS[lang] || [];
    return variants.length > 0 ? variants[0].code : `${lang}-default`;
  });
  const [targetLanguageVariant, setTargetLanguageVariant] = useState(() => {
    const stored = localStorage.getItem("settings.targetLanguageVariant");
    if (stored) return stored;
    const lang = localStorage.getItem("settings.targetLanguage") || "de";
    const variants = LANGUAGE_VARIANTS[lang] || [];
    return variants.length > 0 ? variants[0].code : `${lang}-default`;
  });

  const [practiceWord, setPracticeWord] = useState(null);
  const errorTimeoutRef = useRef(null);

  const handleError = useCallback((errorLike) => {
    if (!errorLike) return;
    if (typeof errorLike === "string") {
      setGlobalError(errorLike);
    } else {
      const suffix = errorLike?.requestId ? ` (requestId: ${errorLike.requestId})` : "";
      const baseMessage = errorLike?.message || "An unexpected error occurred.";
      setGlobalError(`${baseMessage}${suffix}`);
    }

    // Auto-clear error after 5 seconds
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setGlobalError("");
      errorTimeoutRef.current = null;
    }, 5000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const htmlLang = (locale || "en").toLowerCase().startsWith("ja") ? "ja" : (locale || "en").slice(0, 2);
    document.documentElement.lang = htmlLang;
  }, [locale]);

  function onChangeLocale(nextLocale) {
    setLocale(nextLocale);
    localStorage.setItem("settings.locale", nextLocale);
  }

  function onChangeSourceLanguage(lang) {
    setSourceLanguage(lang);
    localStorage.setItem("settings.sourceLanguage", lang);
    // Set default variant for the selected language
    const variants = LANGUAGE_VARIANTS[lang] || [];
    const defaultVariant = variants.length > 0 ? variants[0].code : `${lang}-default`;
    setSourceLanguageVariant(defaultVariant);
    localStorage.setItem("settings.sourceLanguageVariant", defaultVariant);
  }

  function onChangeTargetLanguage(lang) {
    setTargetLanguage(lang);
    localStorage.setItem("settings.targetLanguage", lang);
    // Set default variant for the selected language
    const variants = LANGUAGE_VARIANTS[lang] || [];
    const defaultVariant = variants.length > 0 ? variants[0].code : `${lang}-default`;
    setTargetLanguageVariant(defaultVariant);
    localStorage.setItem("settings.targetLanguageVariant", defaultVariant);
  }

  function onChangeSourceLanguageVariant(variant) {
    setSourceLanguageVariant(variant);
    localStorage.setItem("settings.sourceLanguageVariant", variant);
  }

  function onChangeTargetLanguageVariant(variant) {
    setTargetLanguageVariant(variant);
    localStorage.setItem("settings.targetLanguageVariant", variant);
  }

  function onChangePhoneticType(type) {
    setPhoneticType(type);
    localStorage.setItem("settings.phoneticType", type);
  }

  function onChangeWorkbenchMode(mode) {
    setWorkbenchMode(mode);
    localStorage.setItem("settings.workbenchMode", mode);
  }

  function onChangeCharacterStyle(style) {
    setCharacterStyle(style);
    localStorage.setItem("settings.characterStyle", style);
  }

  function onChangeCharacterGender(gender) {
    setCharacterGender(gender);
    localStorage.setItem("settings.characterGender", gender);
  }

  function onChangeDereRank(rank) {
    setDereRank(rank);
    localStorage.setItem("settings.dereRank", String(rank));
  }

  function onPronunciationPracticeStart(wordData) {
    setPracticeWord(wordData);
    setActiveTab("audio");
  }

  function onCloseError() {
    setGlobalError("");
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    function onWindowError(event) {
      handleError(event?.error || event?.message || "An unexpected error occurred.");
    }

    function onUnhandledRejection(event) {
      handleError(event?.reason || "An error occurred in asynchronous processing.");
    }

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [handleError]);

  // Memoize phonetic types for the target language
  const phoneticTypes = useMemo(() => {
    return PHONETIC_TYPES_BY_LANGUAGE[targetLanguage] || [];
  }, [targetLanguage]);
  
  const hasPhoneticTypes = phoneticTypes.length > 0;

  return (
    <main className="ll-layout">
      <header className="ll-header">
        <h2>{t.llTitle || "Language Learning App"}</h2>
      </header>

      <br />

      <div className="ll-tab-row" role="tablist">
        <button
          className={`ll-button ${activeTab === "workbench" ? "ll-button-primary" : ""}`}
          onClick={() => setActiveTab("workbench")}
          role="tab"
          aria-selected={activeTab === "workbench"}
          aria-controls="tab-workbench"
        >
          {t.llTabWorkbench || "Workbench"}
        </button>

        <button
          className={`ll-button ${activeTab === "audio" ? "ll-button-primary" : ""}`}
          onClick={() => setActiveTab("audio")}
          role="tab"
          aria-selected={activeTab === "audio"}
          aria-controls="tab-audio"
        >
          {t.llTabAudio || "Pronunciation Practice"}
        </button>

        <button
          className={`ll-button ${activeTab === "settings" ? "ll-button-primary" : ""}`}
          onClick={() => setActiveTab("settings")}
          role="tab"
          aria-selected={activeTab === "settings"}
          aria-controls="tab-settings"
        >
          {t.llTabSettings || "Settings"}
        </button>
        
        <button
          className={`ll-button ${activeTab === "saved-terms" ? "ll-button-primary" : ""}`}
          onClick={() => setActiveTab("saved-terms")}
          role="tab"
          aria-selected={activeTab === "saved-terms"}
          aria-controls="tab-saved-terms"
        >
          {t.llTabSavedWords || "Saved Words"}
        </button>
        
        <button
          className={`ll-button ${activeTab === "ai-setup" ? "ll-button-primary" : ""}`}
          onClick={() => setActiveTab("ai-setup")}
          role="tab"
          aria-selected={activeTab === "ai-setup"}
          aria-controls="tab-ai-setup"
        >
          {t.llTabAiSetup || "AI Setup"}
        </button>
      </div>

      {/* Language Selection - Common across all modes */}
      <div className="ll-mode-selector" style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setIsLanguageSectionExpanded(!isLanguageSectionExpanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            marginBottom: "12px",
            fontSize: "0.95em",
            fontWeight: 600,
            color: "inherit"
          }}
          aria-expanded={isLanguageSectionExpanded}
        >
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            transition: "transform 0.3s ease",
            transform: isLanguageSectionExpanded ? "rotate(0deg)" : "rotate(-90deg)"
          }}>▼</span>
          {t.llLanguageSettings || "Languages"}
        </button>

        {isLanguageSectionExpanded && (
          <div style={{
            animation: "slideDown 0.3s ease-out",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "8px",
            alignItems: "flex-end",
            marginBottom: "12px"
          }}>
            {/* Source Language */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                {t.llSourceLanguage || "Source Language"}
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => onChangeSourceLanguage(e.target.value)}
                className="ll-select"
                style={{ width: "100%" }}
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
                <option value="es">Español</option>
                <option value="it">Italiano</option>
                <option value="fr">Français</option>
                <option value="ru">Русский</option>
                <option value="ar">العربية</option>
                <option value="zh">中文</option>
                <option value="ko">한국어</option>
                <option value="pt">Português</option>
              </select>
            </div>

            {/* Swap Button */}
            <button
              onClick={() => {
                const temp = sourceLanguage;
                onChangeSourceLanguage(targetLanguage);
                onChangeTargetLanguage(temp);
              }}
              className="ll-button"
              title="Swap languages"
              style={{ padding: "8px 12px", minWidth: "40px" }}
            >
              ⇄
            </button>

            {/* Target Language */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                {t.llTargetLanguage || "Target Language"}
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => onChangeTargetLanguage(e.target.value)}
                className="ll-select"
                style={{ width: "100%" }}
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
                <option value="es">Español</option>
                <option value="it">Italiano</option>
                <option value="fr">Français</option>
                <option value="ru">Русский</option>
                <option value="ar">العربية</option>
                <option value="zh">中文</option>
                <option value="ko">한국어</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>
        )}

        {isLanguageSectionExpanded && (
          <div style={{
            animation: "slideDown 0.3s ease-out",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "12px"
          }}>
            {/* Source Language Variant */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                {t.llSourceVariant || "Source Variant"}
              </label>
              <select
                value={sourceLanguageVariant}
                onChange={(e) => onChangeSourceLanguageVariant(e.target.value)}
                className="ll-select"
                style={{ width: "100%" }}
              >
                {(LANGUAGE_VARIANTS[sourceLanguage] || []).map(variant => (
                  <option key={variant.code} value={variant.code}>{variant.name}</option>
                ))}
              </select>
            </div>

            {/* Target Language Variant */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                {t.llTargetVariant || "Target Variant"}
              </label>
              <select
                value={targetLanguageVariant}
                onChange={(e) => onChangeTargetLanguageVariant(e.target.value)}
                className="ll-select"
                style={{ width: "100%" }}
              >
                {(LANGUAGE_VARIANTS[targetLanguage] || []).map(variant => (
                  <option key={variant.code} value={variant.code}>{variant.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isLanguageSectionExpanded && hasPhoneticTypes && (
          <div className="ll-row" style={{ marginBottom: "12px", animation: "slideDown 0.3s ease-out" }}>
            <label style={{ marginRight: "8px", fontWeight: "500" }}>
              {t.llPhoneticType || "Pronunciation Accent:"}  
            </label>
            <select
              value={phoneticType}
              onChange={(e) => setPhoneticType(e.target.value)}
              className="ll-select"
              style={{ flex: "0 0 auto", minWidth: "200px" }}
            >
              {phoneticTypes.map(type => (
                <option key={type.code} value={type.code}>{type.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {globalError && (
        <div className="ll-error-banner" role="alert" aria-live="assertive">
          <span>{globalError}</span>
          <button className="ll-error-close" onClick={onCloseError}>Close</button>
        </div>
      )}

      <div id="tab-workbench" role="tabpanel" aria-labelledby="tab-workbench-btn" hidden={activeTab !== "workbench"}>
        {activeTab === "workbench" && (
          <div className="ll-card">
            {/* Workbench Mode Selector */}
            <div className="ll-mode-selector">
              <h3 style={{ marginBottom: "12px", fontSize: "0.95em", fontWeight: 600 }}>
                {t.llWorkbenchMode || "Learning Mode"}
              </h3>
              <div className="ll-row" style={{ gap: "8px", marginBottom: "12px" }}>
                <button
                  className={`ll-button ${workbenchMode === "word-learning" ? "ll-button-primary" : ""}`}
                  onClick={() => onChangeWorkbenchMode("word-learning")}
                  style={{ flex: 1, maxWidth: "200px" }}
                >
                  🚀 {t.llWordLearning || "Word Learning"}
                </button>
                <button
                  className={`ll-button ${workbenchMode === "reasoning" ? "ll-button-primary" : ""}`}
                  onClick={() => onChangeWorkbenchMode("reasoning")}
                  style={{ flex: 1, maxWidth: "200px" }}
                >
                  🧠 {t.llReasoning || "Reasoning (Investigation)"}
                </button>
                <button
                  className={`ll-button ${workbenchMode === "freestyle" ? "ll-button-primary" : ""}`}
                  onClick={() => onChangeWorkbenchMode("freestyle")}
                  style={{ flex: 1, maxWidth: "200px" }}
                >
                  ✍️ {t.llFreestyle || "Freestyle"}
                </button>
              </div>
              
              {/* Mode Description */}
              <div style={{
                padding: "10px 12px",
                backgroundColor: "var(--ll-surface)",
                borderRadius: "6px",
                fontSize: "0.9em",
                color: "var(--ll-text-muted)",
                lineHeight: "1.5"
              }}>
                {workbenchMode === "word-learning" && (
                  <p style={{ margin: 0 }}>
                    💡 {t.llWordLearningDesc || "Quickly learn and save a new word. AI generates pronunciation, category, and examples for it."}
                  </p>
                )}
                {workbenchMode === "reasoning" && (
                  <p style={{ margin: 0 }}>
                    💡 {t.llReasoningDesc || "Investigate a specific word in depth. Ask about grammar, usage, or nuance, then save valuable insights to your Knowledge Base."}
                  </p>
                )}
                {workbenchMode === "freestyle" && (
                  <p style={{ margin: 0 }}>
                    💡 {t.llFreestyleDesc || "Practice natural conversation. Chat freely with AI in your target language to learn authentic expressions and improve fluency."}
                  </p>
                )}
              </div>
            </div>

            {workbenchMode === "word-learning" && (
              <PromptWordPanel 
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                sourceLanguageVariant={sourceLanguageVariant}
                targetLanguageVariant={targetLanguageVariant}
                phoneticType={phoneticType}
                setPhoneticType={onChangePhoneticType}
                phoneticTypesByLanguage={PHONETIC_TYPES_BY_LANGUAGE}
                onError={handleError}
                onPronunciationPracticeStart={onPronunciationPracticeStart}
                t={t}
              />
            )}

            {/* Reasoning Mode */}
            {workbenchMode === "reasoning" && (
              <PromptReasoningPanel 
                termId={1}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                sourceLanguageVariant={sourceLanguageVariant}
                targetLanguageVariant={targetLanguageVariant}
                characterStyle={characterStyle}
                characterGender={characterGender}
                dereRank={dereRank}
                onError={handleError} 
                t={t} 
              />
            )}

            {/* Freestyle Mode */}
            {workbenchMode === "freestyle" && (
              <PromptFreestylePanel 
                characterStyle={characterStyle}
                characterGender={characterGender}
                dereRank={dereRank}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                sourceLanguageVariant={sourceLanguageVariant}
                targetLanguageVariant={targetLanguageVariant}
                onError={handleError}
                t={t}
              />
            )}
          </div>
        )}
      </div>

      {/* Saved words panel */}
      <div id="tab-saved-terms" role="tabpanel" aria-labelledby="tab-saved-terms-btn" hidden={activeTab !== "saved-terms"}>
        {activeTab === "saved-terms" && (
          <SavedWordsPanel 
            t={t}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            sourceLanguageVariant={sourceLanguageVariant}
            targetLanguageVariant={targetLanguageVariant}
          />
        )}
      </div>
      
      {/* Pronunciation Practice Panel */}
      <div id="tab-audio" role="tabpanel" aria-labelledby="tab-audio-btn" hidden={activeTab !== "audio"}>
        {activeTab === "audio" && (
          <AudioIntelligencePanel 
            termId={1}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            sourceLanguageVariant={sourceLanguageVariant}
            targetLanguageVariant={targetLanguageVariant}
            practiceWord={practiceWord}
            onError={handleError}
            t={t}
          />
        )}
      </div>

      {/* App Language, Add Language, AI character settings */}
      <div id="tab-settings" role="tabpanel" aria-labelledby="tab-settings-btn" hidden={activeTab !== "settings"}>
        {activeTab === "settings" && (
          <SettingsPanel 
            t={t} 
            locale={locale} 
            onLocaleChange={onChangeLocale}
            characterStyle={characterStyle}
            onCharacterStyleChange={onChangeCharacterStyle}
            characterGender={characterGender}
            onCharacterGenderChange={onChangeCharacterGender}
            dereRank={dereRank}
            onDereRankChange={onChangeDereRank}
          />
        )}
      </div>

      {/* Ollama, Model Setup */}
      <div id="tab-ai-setup" role="tabpanel" aria-labelledby="tab-ai-setup-btn" hidden={activeTab !== "ai-setup"}>
        {activeTab === "ai-setup" && <AiSetupPanel t={t} />}
      </div>
    </main>
  );
}
