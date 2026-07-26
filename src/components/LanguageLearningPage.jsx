import React, { useCallback, useEffect, useState, useRef } from "react";
import FastPipelinePanel from "./language-learning/FastPipelinePanel.jsx";
import ReasoningWorkspace from "./language-learning/ReasoningWorkspace.jsx";
import AudioIntelligencePanel from "./language-learning/AudioIntelligencePanel.jsx";
import LanguageSettingsPanel from "./language-learning/LanguageSettingsPanel.jsx";
import AiSetupPanel from "./language-learning/AiSetupPanel.jsx";
import "../css/language-learning.css";

export default function LanguageLearningPage({ locale, setLocale, t }) {
  const [globalError, setGlobalError] = useState("");
  const [activeTab, setActiveTab] = useState("workbench");
  const [sourceLanguage, setSourceLanguage] = useState(() => 
    localStorage.getItem("settings.sourceLanguage") || "en"
  );
  const [targetLanguage, setTargetLanguage] = useState(() => 
    localStorage.getItem("settings.targetLanguage") || "de"
  );
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
  }

  function onChangeTargetLanguage(lang) {
    setTargetLanguage(lang);
    localStorage.setItem("settings.targetLanguage", lang);
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

  return (
    <main className="ll-layout">
      <header className="ll-header">
        <h2>{t.llTitle || "Language Learning Workbench"}</h2>
        <p>{t.llSubtitle || "Fast Pipeline / Reasoning Pipeline / Audio Intelligence"}</p>
      </header>
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
          className={`ll-button ${activeTab === "ai-setup" ? "ll-button-primary" : ""}`}
          onClick={() => setActiveTab("ai-setup")}
          role="tab"
          aria-selected={activeTab === "ai-setup"}
          aria-controls="tab-ai-setup"
        >
          {t.llTabAiSetup || "AI Setup"}
        </button>
      </div>
      {globalError && (
        <div className="ll-error-banner" role="alert" aria-live="assertive">
          <span>{globalError}</span>
          <button className="ll-error-close" onClick={onCloseError}>Close</button>
        </div>
      )}
      <div id="tab-workbench" role="tabpanel" aria-labelledby="tab-workbench-btn" hidden={activeTab !== "workbench"}>
        {activeTab === "workbench" && (
          <>
            <FastPipelinePanel 
              sourceLanguage={sourceLanguage}
              setSourceLanguage={onChangeSourceLanguage}
              targetLanguage={targetLanguage}
              setTargetLanguage={onChangeTargetLanguage}
              onError={handleError}
              onPronunciationPracticeStart={onPronunciationPracticeStart}
              t={t}
            />
            <ReasoningWorkspace termId={1} onError={handleError} t={t} />
          </>
        )}
      </div>
      <div id="tab-audio" role="tabpanel" aria-labelledby="tab-audio-btn" hidden={activeTab !== "audio"}>
        {activeTab === "audio" && (
          <AudioIntelligencePanel 
            termId={1}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            practiceWord={practiceWord}
            onError={handleError}
            t={t}
          />
        )}
      </div>
      <div id="tab-settings" role="tabpanel" aria-labelledby="tab-settings-btn" hidden={activeTab !== "settings"}>
        {activeTab === "settings" && (
          <LanguageSettingsPanel t={t} locale={locale} onLocaleChange={onChangeLocale} />
        )}
      </div>
      <div id="tab-ai-setup" role="tabpanel" aria-labelledby="tab-ai-setup-btn" hidden={activeTab !== "ai-setup"}>
        {activeTab === "ai-setup" && <AiSetupPanel t={t} />}
      </div>
    </main>
  );
}
