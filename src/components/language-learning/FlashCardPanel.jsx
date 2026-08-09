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

export default function FlashCardPanel({ 
  sourceLanguage, 
  targetLanguage,
  onError,
  t 
}) {
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [allTerms, setAllTerms] = useState([]);
  const [currentCards, setCurrentCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, loading, ready, error
  const [message, setMessage] = useState("");
  const [filterMode, setFilterMode] = useState("random"); // random, category, priority
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState(""); // "", "低", "中", "高"
  const [categories, setCategories] = useState([]);
  const [pageSize, setPageSize] = useState(100);
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0, skipped: 0 });
  const [showComprehensionLevelSelect, setShowComprehensionLevelSelect] = useState(false);
  const [isSavingComprehension, setIsSavingComprehension] = useState(false);

  useEffect(() => {
    async function loadLanguages() {
      try {
        const result = await languageApi.getLanguages();
        if (result.languages) {
          setLanguages(result.languages.filter(lang => lang.visible !== false));
        }
      } catch (error) {
        console.warn("Failed to load languages:", error);
      }
    }
    loadLanguages();
  }, []);

  async function loadTerms() {
    setStatus("loading");
    setMessage("");
    setCurrentCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ total: 0, correct: 0, skipped: 0 });

    try {
      const result = await languageApi.getCoreTerms(
        pageSize,
        0,
        sourceLanguage,
        targetLanguage
      );

      if (!result.terms || result.terms.length === 0) {
        setStatus("error");
        setMessage(t?.llNoTermsAvailable || "No terms available for learning");
        setAllTerms([]);
        return;
      }

      // Transform API response to match FlashCard format
      const transformedTerms = result.terms.map(term => ({
        id: term.id,
        term: sourceLanguage === "en" ? (term.term_en || term.term) : (term.term_de || term.term_source),
        translation: targetLanguage === "en" ? (term.term_en || term.term) : (term.term_de || term.term_target),
        phonetic: term.ipa_uk || term.phonetic || "",
        category: term.details?.category || "",
        priority: term.priority || 0,
        priority_label: ["", "低", "中", "高"][term.priority || 0] || "",
        pinned: term.pinned || false,
        comprehension_level: term.comprehension_level || 0  // 0: 未設定, 1: 低, 2: 中, 3: 高
      }));

      let filteredTerms = transformedTerms;

      // Filter by comprehension level based on mode
      if (filterMode === "random") {
        // ランダムモード：理解度 0, 1 のみ表示 (低以下)
        filteredTerms = filteredTerms.filter(term => 
          !term.comprehension_level || term.comprehension_level <= 1
        );
      } else if (filterMode === "category") {
        // カテゴリモード：理解度 0, 1, 2 を表示 (中以下)
        filteredTerms = filteredTerms.filter(term => 
          !term.comprehension_level || term.comprehension_level <= 2
        );
      }

      // Filter by priority
      if (filterMode === "priority" && selectedPriority) {
        filteredTerms = filteredTerms.filter(term => term.priority_label === selectedPriority);
      }

      // Filter by category
      if (filterMode === "category" && selectedCategory) {
        filteredTerms = filteredTerms.filter(term => term.category === selectedCategory);
      }

      // Shuffle for random mode
      if (filterMode === "random") {
        filteredTerms = [...filteredTerms].sort(() => Math.random() - 0.5);
      }

      if (filteredTerms.length === 0) {
        setStatus("error");
        setMessage(
          filterMode === "category"
            ? `No terms found in category "${selectedCategory}"`
            : `No terms found with priority "${selectedPriority}"`
        );
        setAllTerms([]);
        return;
      }

      setAllTerms(filteredTerms);
      setCurrentCards(filteredTerms);
      setStatus("ready");
      setSessionStats({ total: filteredTerms.length, correct: 0, skipped: 0 });
    } catch (error) {
      setStatus("error");
      const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
      setMessage(`${error.message}${suffix}`);
      onError?.(error);
    }
  }

  useEffect(() => {
    // Extract unique categories from all terms
    const uniqueCategories = [...new Set(allTerms.map(t => t.category).filter(Boolean))];
    setCategories(uniqueCategories);
  }, [allTerms]);

  function handleFlip() {
    setIsFlipped(!isFlipped);
  }

  function handleNext() {
    if (currentIndex < currentCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  }

  function handleMarkCorrect() {
    setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    handleNext();
  }

  function handleSkip() {
    setSessionStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    handleNext();
  }

  async function handleSetComprehensionLevel(level) {
    if (!currentCard) return;
    
    setIsSavingComprehension(true);
    try {
      await languageApi.updateCoreTerm(currentCard.id, { 
        comprehension_level: level 
      });
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      setShowComprehensionLevelSelect(false);
      
      // Move to next after a short delay for visual feedback
      setTimeout(() => handleNext(), 300);
    } catch (error) {
      setMessage(`Failed to save comprehension level: ${error.message}`);
      onError?.(error);
    } finally {
      setIsSavingComprehension(false);
    }
  }

  function handleShuffle() {
    const shuffled = [...currentCards].sort(() => Math.random() - 0.5);
    setCurrentCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  function handleReset() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ total: currentCards.length, correct: 0, skipped: 0 });
  }

  const sourceLangName = languages.find(l => l.code === sourceLanguage)?.name || sourceLanguage;
  const targetLangName = languages.find(l => l.code === targetLanguage)?.name || targetLanguage;
  const currentCard = currentCards[currentIndex];
  const progress = `${currentIndex + 1} / ${currentCards.length}`;

  return (
    <div>
      <h3>{t?.llFlashCard || "Flash Card Practice"}</h3>
      <p style={{ marginTop: "4px", marginBottom: "16px", fontSize: "0.9em", color: "var(--ll-text-muted)", lineHeight: "1.4" }}>
        {t?.llFlashCardDesc || "Practice vocabulary with interactive flash cards. Click to reveal the answer and mark as correct or skip."}
      </p>

      {/* Error/Status Message */}
      {message && (
        <p className={`ll-message ${status === "error" ? "ll-message-error" : ""}`} role="status">
          {message}
        </p>
      )}

      {/* Filter Settings */}
      {status !== "ready" && (
        <div className="ll-card">
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              {t?.llFilterMode || "Filter Mode"}
            </label>
            <div className="ll-row" style={{ gap: "8px" }}>
              <button
                onClick={() => setFilterMode("random")}
                className="ll-button"
                style={{
                  backgroundColor: filterMode === "random" ? "#1976d2" : "#f5f5f5",
                  color: filterMode === "random" ? "white" : "#333",
                  border: filterMode === "random" ? "1px solid #1976d2" : "1px solid #ddd",
                  fontWeight: filterMode === "random" ? "bold" : "normal",
                  padding: "8px 16px"
                }}
              >
                {t?.llRandom || "Random"}
              </button>
              <button
                onClick={() => setFilterMode("category")}
                className="ll-button"
                style={{
                  backgroundColor: filterMode === "category" ? "#1976d2" : "#f5f5f5",
                  color: filterMode === "category" ? "white" : "#333",
                  border: filterMode === "category" ? "1px solid #1976d2" : "1px solid #ddd",
                  fontWeight: filterMode === "category" ? "bold" : "normal",
                  padding: "8px 16px"
                }}
              >
                {t?.llCategory || "Category"}
              </button>
              <button
                onClick={() => setFilterMode("priority")}
                className="ll-button"
                style={{
                  backgroundColor: filterMode === "priority" ? "#1976d2" : "#f5f5f5",
                  color: filterMode === "priority" ? "white" : "#333",
                  border: filterMode === "priority" ? "1px solid #1976d2" : "1px solid #ddd",
                  fontWeight: filterMode === "priority" ? "bold" : "normal",
                  padding: "8px 16px"
                }}
              >
                {t?.llPriority || "Priority"}
              </button>
            </div>
          </div>

          {/* Category Filter */}
          {filterMode === "category" && categories.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                {t?.llSelectCategory || "Select Category"}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="ll-input"
                style={{ width: "100%", maxWidth: "300px" }}
              >
                <option value="">-- {t?.llAllCategories || "All Categories"} --</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {/* Priority Filter */}
          {filterMode === "priority" && (
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                {t?.llSelectPriority || "Select Priority"}
              </label>
              <div className="ll-row" style={{ gap: "8px" }}>
                {["低", "中", "高"].map(priority => (
                  <button
                    key={priority}
                    onClick={() => setSelectedPriority(selectedPriority === priority ? "" : priority)}
                    className="ll-button"
                    style={{
                      backgroundColor:
                        selectedPriority === priority
                          ? priority === "低"
                            ? "#ffb74d"
                            : priority === "中"
                            ? "#ff9800"
                            : "#d32f2f"
                          : "#f5f5f5",
                      color: selectedPriority === priority ? "white" : "#333",
                      border: selectedPriority === priority ? "1px solid #ddd" : "1px solid #ddd",
                      padding: "8px 16px"
                    }}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={loadTerms}
            disabled={status === "loading"}
            className="ll-button ll-button-primary"
            style={{ marginTop: "12px", padding: "10px 20px" }}
          >
            {status === "loading" ? (t?.llLoading || "Loading...") : (t?.llStartPractice || "Start Practice")}
          </button>
        </div>
      )}

      {/* Flash Card Display */}
      {status === "ready" && currentCard && (
        <>
          {/* Progress and Stats */}
          <div className="ll-card" style={{ marginBottom: "16px" }}>
            <div className="ll-row" style={{ justifyContent: "space-between", marginBottom: "12px" }}>
              <div>
                <strong>{t?.llProgress || "Progress"}:</strong> {progress}
              </div>
              <div style={{ fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                <span style={{ marginRight: "16px" }}>✓ {sessionStats.correct}</span>
                <span>- {sessionStats.skipped}</span>
              </div>
            </div>
            <div style={{ width: "100%", height: "4px", backgroundColor: "var(--ll-surface-muted)", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${((currentIndex + 1) / currentCards.length) * 100}%`,
                  height: "100%",
                  backgroundColor: "#42a5a0",
                  transition: "width 0.3s ease"
                }}
              />
            </div>
          </div>

          {/* Flash Card */}
          <div
            onClick={handleFlip}
            className="ll-card"
            style={{
              minHeight: "300px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              backgroundColor: isFlipped ? "var(--ll-surface-raised)" : "var(--ll-surface)",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Flip indicator */}
            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                fontSize: "0.75em",
                color: "var(--ll-text-muted)",
                opacity: 0.6
              }}
            >
              {t?.llClickToFlip || "Click to flip"}
            </div>

            <div style={{ textAlign: "center" }}>
              {!isFlipped ? (
                <>
                  <div style={{ fontSize: "0.9em", color: "var(--ll-text-muted)", marginBottom: "12px" }}>
                    {sourceLangName}
                  </div>
                  <div
                    style={{
                      fontSize: "3em",
                      fontWeight: "bold",
                      color: "var(--ll-accent)",
                      wordBreak: "break-word",
                      marginBottom: "12px"
                    }}
                  >
                    {currentCard.term}
                  </div>
                  {currentCard.phonetic && (
                    <div style={{ fontSize: "1.1em", color: "var(--ll-text-muted)", fontStyle: "italic" }}>
                      {currentCard.phonetic}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: "0.9em", color: "var(--ll-text-muted)", marginBottom: "12px" }}>
                    {targetLangName}
                  </div>
                  <div
                    style={{
                      fontSize: "2.5em",
                      fontWeight: "bold",
                      color: "var(--ll-accent)",
                      wordBreak: "break-word",
                      marginBottom: "12px"
                    }}
                  >
                    {currentCard.translation}
                  </div>
                  {currentCard.category && (
                    <div
                      style={{
                        display: "inline-block",
                        backgroundColor: "var(--ll-surface-muted)",
                        padding: "4px 12px",
                        borderRadius: "4px",
                        fontSize: "0.85em",
                        color: "var(--ll-text-muted)",
                        marginTop: "8px"
                      }}
                    >
                      {currentCard.category}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="ll-card" style={{ marginTop: "16px" }}>
            <div className="ll-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="ll-button"
                style={{ padding: "8px 16px" }}
              >
                {t?.llPrevious || "← Previous"}
              </button>

              <div className="ll-row" style={{ gap: "8px" }}>
                <button
                  onClick={handleShuffle}
                  className="ll-button"
                  style={{ padding: "8px 16px" }}
                >
                  {t?.llShuffle || "🔀 Shuffle"}
                </button>
                <button
                  onClick={handleReset}
                  className="ll-button"
                  style={{ padding: "8px 16px" }}
                >
                  {t?.llReset || "⟲ Reset"}
                </button>
              </div>

              <button
                onClick={handleNext}
                disabled={currentIndex === currentCards.length - 1}
                className="ll-button"
                style={{ padding: "8px 16px" }}
              >
                {t?.llNext || "Next →"}
              </button>
            </div>

            {isFlipped && (
              <>
                {showComprehensionLevelSelect ? (
                  <div className="ll-row" style={{ gap: "8px", marginTop: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                    <div style={{ width: "100%", textAlign: "center", marginBottom: "8px", fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                      {t?.llComprehensionLevel || "How well did you understand this word?"}
                    </div>
                    <button
                      onClick={() => handleSetComprehensionLevel(1)}
                      disabled={isSavingComprehension}
                      className="ll-button"
                      style={{
                        backgroundColor: "#ffb74d",
                        color: "white",
                        padding: "10px 20px",
                        flex: "1 1 auto",
                        minWidth: "80px"
                      }}
                    >
                      {isSavingComprehension ? "..." : (t?.llComprehensionLow || "低 (Low)")}
                    </button>
                    <button
                      onClick={() => handleSetComprehensionLevel(2)}
                      disabled={isSavingComprehension}
                      className="ll-button"
                      style={{
                        backgroundColor: "#ff9800",
                        color: "white",
                        padding: "10px 20px",
                        flex: "1 1 auto",
                        minWidth: "80px"
                      }}
                    >
                      {isSavingComprehension ? "..." : (t?.llComprehensionMedium || "中 (Medium)")}
                    </button>
                    <button
                      onClick={() => handleSetComprehensionLevel(3)}
                      disabled={isSavingComprehension}
                      className="ll-button ll-button-primary"
                      style={{
                        backgroundColor: "#4caf50",
                        padding: "10px 20px",
                        flex: "1 1 auto",
                        minWidth: "80px"
                      }}
                    >
                      {isSavingComprehension ? "..." : (t?.llComprehensionHigh || "高 (High)")}
                    </button>
                  </div>
                ) : (
                  <div className="ll-row" style={{ gap: "8px", marginTop: "12px", justifyContent: "center" }}>
                    <button
                      onClick={() => setShowComprehensionLevelSelect(true)}
                      className="ll-button ll-button-primary"
                      style={{
                        backgroundColor: "#4caf50",
                        padding: "10px 20px",
                        flex: 1
                      }}
                    >
                      {t?.llCorrect || "✓ Correct"}
                    </button>
                    <button
                      onClick={handleSkip}
                      className="ll-button"
                      style={{
                        backgroundColor: "#757575",
                        color: "white",
                        padding: "10px 20px",
                        flex: 1
                      }}
                    >
                      {t?.llSkip || "- Skip"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
