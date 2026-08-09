import React, { useState, useEffect } from "react";
import { languageApi } from "../../lib/apiClient.js";

const DEFAULT_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "fr", name: "Français" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
  { code: "zh", name: "中文" },
  { code: "ko", name: "한국어" },
  { code: "pt", name: "Português" }
];

export default function SavedWordsPanel({ t, sourceLanguage, targetLanguage, sourceLanguageVariant, targetLanguageVariant }) {
  const [terms, setTerms] = useState([]);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0, hasMore: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [selectedSourceLang, setSelectedSourceLang] = useState(sourceLanguage || "en");
  const [selectedTargetLang, setSelectedTargetLang] = useState(targetLanguage || "de");
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] = useState("all");
  const [selectedComprehensionLevel, setSelectedComprehensionLevel] = useState("all");
  const [selectedTermIds, setSelectedTermIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [updatingComprehension, setUpdatingComprehension] = useState(null);
  const PAGE_SIZE_OPTIONS = [10, 20, 40, 50];

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

  useEffect(() => {
    setSelectedSourceLang(sourceLanguage || "en");
    setSelectedTargetLang(targetLanguage || "de");
    setSelectedCategory("all");
    setSelectedPartOfSpeech("all");
    setSelectedComprehensionLevel("all");
    setSelectedTermIds(new Set());
  }, [sourceLanguage, targetLanguage]);

  useEffect(() => {
    loadTerms();
  }, [selectedSourceLang, selectedTargetLang]);

  async function loadTerms(offset = 0) {
    setLoading(true);
    setMessage("");
    try {
      const result = await languageApi.getCoreTerms(pagination.limit, offset, selectedSourceLang, selectedTargetLang);
      setTerms(result.terms);
      setPagination(result.pagination);
    } catch (error) {
      setMessage(`Failed to load terms: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleChangePageSize(newSize) {
    setPagination(prev => ({ ...prev, limit: newSize, offset: 0 }));
    // Load terms after updating pagination
    setLoading(true);
    setMessage("");
    setTimeout(() => {
      languageApi.getCoreTerms(newSize, 0, selectedSourceLang, selectedTargetLang)
        .then(result => {
          setTerms(result.terms);
          setPagination(result.pagination);
        })
        .catch(error => {
          setMessage(`Failed to load terms: ${error.message}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 0);
  }

  function handlePrevPage() {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    loadTerms(newOffset);
  }

  function handleNextPage() {
    if (pagination.hasMore) {
      loadTerms(pagination.offset + pagination.limit);
    }
  }

  function handleSelectTerm(termId) {
    const newSelected = new Set(selectedTermIds);
    if (newSelected.has(termId)) {
      newSelected.delete(termId);
    } else {
      newSelected.add(termId);
    }
    setSelectedTermIds(newSelected);
  }

  function handleSelectAll() {
    if (selectedTermIds.size === filteredTerms.length) {
      setSelectedTermIds(new Set());
    } else {
      setSelectedTermIds(new Set(filteredTerms.map(t => t.id)));
    }
  }

  async function handleDeleteSelected() {
    if (selectedTermIds.size === 0) {
      setMessage("削除する単語を選択してください");
      return;
    }

    if (!confirm(`${selectedTermIds.size}個の単語を削除しますか？`)) {
      return;
    }

    setDeleting(true);
    setMessage("");
    try {
      for (const termId of selectedTermIds) {
        await languageApi.deleteCoreTerm(termId);
      }
      setMessage(`${selectedTermIds.size}個の単語を削除しました`);
      setSelectedTermIds(new Set());
      loadTerms();
    } catch (error) {
      setMessage(`削除に失敗しました: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteTerm(termId) {
    if (!confirm("この単語を削除しますか？")) {
      return;
    }

    setDeleting(true);
    setMessage("");
    try {
      await languageApi.deleteCoreTerm(termId);
      setMessage("単語を削除しました");
      setSelectedTermIds(new Set(Array.from(selectedTermIds).filter(id => id !== termId)));
      loadTerms();
    } catch (error) {
      setMessage(`削除に失敗しました: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePinTerm(termId, currentPinned) {
    try {
      const result = await languageApi.updateCoreTerm(termId, { pinned: !currentPinned });
      setTerms(terms.map(t => t.id === termId ? result.term : t));
      setMessage(!currentPinned ? "Pin止めしました" : "Pin止めを解除しました");
    } catch (error) {
      setMessage(`操作に失敗しました: ${error.message}`);
    }
  }

  async function handleSetPriority(termId, priority) {
    try {
      const result = await languageApi.updateCoreTerm(termId, { priority });
      setTerms(terms.map(t => t.id === termId ? result.term : t));
      const priorityLabels = ["設定なし", "低", "中", "高"];
      setMessage(`優先度を${priorityLabels[priority]}に設定しました`);
    } catch (error) {
      setMessage(`操作に失敗しました: ${error.message}`);
    }
  }

  async function handleSetComprehensionLevel(termId, level) {
    setUpdatingComprehension(termId);
    try {
      const result = await languageApi.updateCoreTerm(termId, { comprehension_level: level });
      setTerms(terms.map(t => t.id === termId ? result.term : t));
      const levelLabels = ["未設定", "低", "中", "高"];
      setMessage(`理解度を${levelLabels[level]}に設定しました`);
    } catch (error) {
      setMessage(`操作に失敗しました: ${error.message}`);
    } finally {
      setUpdatingComprehension(null);
    }
  }

  const filteredTerms = terms.filter((term) => {
    // Filter by search query
    const matchesSearch = !searchQuery.trim() || (
      term.term_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.term_de.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by category
    const matchesCategory = selectedCategory === "all" || 
      (term.details?.category && term.details.category === selectedCategory);

    // Filter by part of speech
    const matchesPartOfSpeech = selectedPartOfSpeech === "all" || 
      (term.part_of_speech && term.part_of_speech === selectedPartOfSpeech);

    // Filter by comprehension level
    const matchesComprehensionLevel = selectedComprehensionLevel === "all" || 
      (String(term.comprehension_level || 0) === selectedComprehensionLevel);

    return matchesSearch && matchesCategory && matchesPartOfSpeech && matchesComprehensionLevel;
  });

  // Extract unique categories from terms
  const categories = Array.from(
    new Set(
      terms
        .filter(term => term.details?.category)
        .map(term => term.details.category)
    )
  ).sort();

  // Extract unique parts of speech from terms
  const partsOfSpeech = Array.from(
    new Set(
      terms
        .filter(term => term.part_of_speech)
        .map(term => term.part_of_speech)
    )
  ).sort();

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <section className="ll-card">
      <h3>{t.llSavedTermsTitle || "Saved Terms"}</h3>
      <p className="ll-message">{t.llSavedTermsSubtext || "View and search your saved vocabulary."}</p>

      {/* Error/Status Message */}
      {message && (
        <p className={`ll-message ${message.includes("Failed") ? "ll-message-error" : ""}`} role="status">
          {message}
        </p>
      )}

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="ll-row" style={{ marginBottom: "16px" }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="ll-select"
            style={{ flex: 1, maxWidth: "300px" }}
          >
            <option value="all">すべてのカテゴリ</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      )}

      {/* Part of Speech Filter */}
      {partsOfSpeech.length > 0 && (
        <div className="ll-row" style={{ marginBottom: "16px" }}>
          <select
            value={selectedPartOfSpeech}
            onChange={(e) => setSelectedPartOfSpeech(e.target.value)}
            className="ll-select"
            style={{ flex: 1, maxWidth: "300px" }}
          >
            <option value="all">すべての品詞</option>
            {partsOfSpeech.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
      )}

      {/* Comprehension Level Filter */}
      <div className="ll-row" style={{ marginBottom: "16px" }}>
        <select
          value={selectedComprehensionLevel}
          onChange={(e) => setSelectedComprehensionLevel(e.target.value)}
          className="ll-select"
          style={{ flex: 1, maxWidth: "300px" }}
        >
          <option value="all">すべての理解度</option>
          <option value="0">{t?.llComprehensionLow || "未設定"}</option>
          <option value="1">{t?.llComprehensionLow || "低"}</option>
          <option value="2">{t?.llComprehensionMedium || "中"}</option>
          <option value="3">{t?.llComprehensionHigh || "高"}</option>
        </select>
      </div>

      {/* Page Size Selection */}
      <div className="ll-row" style={{ marginBottom: "16px", gap: "8px", alignItems: "center" }}>
        <label style={{ fontSize: "0.9em", fontWeight: 500, marginRight: "8px" }}>ページサイズ:</label>
        {PAGE_SIZE_OPTIONS.map((size) => (
          <button
            key={size}
            onClick={() => handleChangePageSize(size)}
            className="ll-button"
            style={{
              padding: "6px 12px",
              fontSize: "0.85em",
              backgroundColor: pagination.limit === size ? "#1976d2" : "#f5f5f5",
              color: pagination.limit === size ? "white" : "#333",
              border: pagination.limit === size ? "1px solid #1976d2" : "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: pagination.limit === size ? "bold" : "normal",
              transition: "all 0.2s ease"
            }}
            disabled={loading}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="ll-row" style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder={t.llSearchPlaceholder || "Search terms..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ll-input"
        />
        <button onClick={() => loadTerms(0)} disabled={loading} className="ll-button">
          {loading ? (t.llLoading || "Loading...") : (t.llRefresh || "Refresh")}
        </button>
      </div>

      {/* Bulk Actions */}
      {filteredTerms.length > 0 && (
        <div className="ll-row" style={{ marginBottom: "16px", gap: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectedTermIds.size === filteredTerms.length && filteredTerms.length > 0}
              onChange={handleSelectAll}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.9em" }}>
              すべて選択 ({selectedTermIds.size}/{filteredTerms.length})
            </span>
          </label>
          {selectedTermIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="ll-button"
              style={{ backgroundColor: "#d32f2f", color: "white" }}
            >
              {deleting ? "削除中..." : `削除 (${selectedTermIds.size})`}
            </button>
          )}
        </div>
      )}

      {/* Terms Table */}
      {loading && terms.length === 0 ? (
        <p style={{ color: "var(--ll-text-muted)" }}>{t.llLoading || "Loading..."}</p>
      ) : filteredTerms.length === 0 ? (
        <p style={{ color: "var(--ll-text-muted)" }}>
          {searchQuery.trim() 
            ? (t.llNoResultsFound || "No results found.") 
            : (t.llNoSavedTerms || "No saved terms yet. Start by adding words in Fast Pipeline!")}
        </p>
      ) : (
        <>
          <div className="ll-saved-terms-table-wrapper">
            <table className="ll-saved-terms-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}>
                    <input
                      type="checkbox"
                      checked={selectedTermIds.size === filteredTerms.length && filteredTerms.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th>{t.llTableHeaderSource || "Source"}</th>
                  <th>{t.llTableHeaderTarget || "Target"}</th>
                  <th>{t.llTableHeaderPhonetic || "Phonetic (UK)"}</th>
                  <th>品詞</th>
                  <th>カテゴリ</th>
                  <th style={{ width: "90px" }}>理解度</th>
                  <th style={{ width: "60px" }}>Pin</th>
                  <th style={{ width: "130px" }}>優先度</th>
                  <th>{t.llTableHeaderDate || "Date"}</th>
                  <th style={{ textAlign: "center", width: "100px" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTerms.map((term) => (
                  <tr key={term.id}>
                    <td style={{ width: "30px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedTermIds.has(term.id)}
                        onChange={() => handleSelectTerm(term.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>{term.term_en}</td>
                    <td style={{ fontWeight: 500 }}>{term.term_de}</td>
                    <td style={{ fontFamily: "monospace", color: "var(--ll-text-muted)" }}>
                      {term.ipa_uk || "—"}
                    </td>
                    <td style={{ fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                      {term.part_of_speech || "—"}
                    </td>
                    <td style={{ fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                      {term.details?.category || "—"}
                    </td>
                    <td style={{ textAlign: "center", width: "90px", display: "flex", gap: "3px", justifyContent: "center", alignItems: "center" }}>
                      {[0, 1, 2, 3].map((level) => (
                        <button
                          key={level}
                          onClick={() => handleSetComprehensionLevel(term.id, level)}
                          disabled={updatingComprehension === term.id}
                          title={["未設定", "低", "中", "高"][level]}
                          style={{
                            padding: "3px 6px",
                            fontSize: "0.7em",
                            fontWeight: "bold",
                            cursor: "pointer",
                            borderRadius: "3px",
                            border: "1px solid #ddd",
                            backgroundColor: (term.comprehension_level || 0) === level ? (level === 0 ? "#e0e0e0" : level === 1 ? "#ffb74d" : level === 2 ? "#ff9800" : "#4caf50") : "#f5f5f5",
                            color: (term.comprehension_level || 0) === level && level !== 0 ? "white" : "#333",
                            opacity: updatingComprehension === term.id ? 0.6 : 1,
                            transition: "all 0.2s ease"
                          }}
                        >
                          {["—", "低", "中", "高"][level]}
                        </button>
                      ))}
                    </td>
                    <td style={{ textAlign: "center", width: "60px" }}>
                      <button
                        onClick={() => handlePinTerm(term.id, term.pinned)}
                        className="ll-button"
                        title={term.pinned ? "Pin止めを解除" : "Pin止め"}
                        style={{
                          padding: "4px 8px",
                          fontSize: "1em",
                          backgroundColor: term.pinned ? "#ffa500" : "transparent",
                          border: "1px solid #ddd",
                          cursor: "pointer"
                        }}
                      >
                        📌
                      </button>
                    </td>
                    <td style={{ textAlign: "center", width: "130px", display: "flex", gap: "4px", justifyContent: "center", alignItems: "center" }}>
                      <button
                        onClick={() => handleSetPriority(term.id, 0)}
                        title="優先度を解除"
                        style={{
                          padding: "4px 6px",
                          fontSize: "0.75em",
                          cursor: "pointer",
                          borderRadius: "3px",
                          border: "1px solid #ddd",
                          backgroundColor: term.priority === 0 || !term.priority ? "#e0e0e0" : "#f5f5f5",
                          color: "#333",
                          fontWeight: term.priority === 0 || !term.priority ? "bold" : "normal"
                        }}
                      >
                        —
                      </button>
                      {[1, 2, 3].map((priority) => (
                        <button
                          key={priority}
                          onClick={() => handleSetPriority(term.id, priority)}
                          title={["無し", "低", "中", "高"][priority]}
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.8em",
                            fontWeight: "bold",
                            cursor: "pointer",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            backgroundColor: term.priority === priority ? (priority === 1 ? "#ffb74d" : priority === 2 ? "#ff9800" : "#d32f2f") : "#f5f5f5",
                            color: term.priority === priority ? "white" : "#333",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {["—", "低", "中", "高"][priority]}
                        </button>
                      ))}
                    </td>
                    <td style={{ fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                      {new Date(term.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "center", width: "100px" }}>
                      <button
                        onClick={() => {
                          setSelectedTerm(term);
                          setShowDetails(true);
                        }}
                        className="ll-button"
                        style={{ padding: "4px 8px", fontSize: "0.85em", marginRight: "4px" }}
                      >
                        詳細
                      </button>
                      <button
                        onClick={() => handleDeleteTerm(term.id)}
                        disabled={deleting}
                        className="ll-button"
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.85em",
                          backgroundColor: "#d32f2f",
                          color: "white",
                          opacity: deleting ? 0.6 : 1
                        }}
                        title="削除"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!searchQuery.trim() && (
            <div className="ll-pagination">
              <button
                onClick={handlePrevPage}
                disabled={loading || pagination.offset === 0}
                className="ll-button"
              >
                ← {t.llPrevious || "Previous"}
              </button>
              <span className="ll-pagination-info">
                {t.llPageInfo || `Page ${currentPage} of ${totalPages}`}
                {" "}({pagination.total} {t.llTotalTerms || "total terms"})
              </span>
              <button
                onClick={handleNextPage}
                disabled={loading || !pagination.hasMore}
                className="ll-button"
              >
                {t.llNext || "Next"} →
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetails && selectedTerm && (
        <TermDetailModal 
          term={selectedTerm} 
          onClose={() => {
            setShowDetails(false);
            setSelectedTerm(null);
          }}
          t={t}
        />
      )}
    </section>
  );
}

function TermDetailModal({ term, onClose, t }) {
  return (
    <div className="ll-modal-overlay" onClick={onClose}>
      <div className="ll-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="ll-modal-close" onClick={onClose}>✕</button>
        
        <h2 style={{ marginBottom: "16px" }}>用語詳細情報</h2>
        
        <div className="ll-detail-grid">
          <div className="ll-detail-item">
            <label>ソース言語:</label>
            <p>{term.term_en}</p>
          </div>
          
          <div className="ll-detail-item">
            <label>ターゲット言語:</label>
            <p>{term.term_de}</p>
          </div>

          <div className="ll-detail-item">
            <label>音声記号 (IPA):</label>
            <p style={{ fontFamily: "monospace", color: "var(--ll-text-muted)" }}>
              {term.ipa_uk || "—"}
            </p>
          </div>

          <div className="ll-detail-item">
            <label>登録日:</label>
            <p>{new Date(term.created_at).toLocaleString()}</p>
          </div>

          <div className="ll-detail-item">
            <label>品詞:</label>
            <p>{term.part_of_speech || "—"}</p>
          </div>

          {term.details && (
            <>
              {term.details.category && (
                <div className="ll-detail-item">
                  <label>カテゴリ:</label>
                  <p>{term.details.category}</p>
                </div>
              )}

              {term.details.nuance && (
                <div className="ll-detail-item">
                  <label>ニュアンス:</label>
                  <p>{term.details.nuance}</p>
                </div>
              )}

              {term.details.slang_nuance && (
                <div className="ll-detail-item">
                  <label>スラング表現:</label>
                  <p>{term.details.slang_nuance}</p>
                </div>
              )}

              {term.details.examples && term.details.examples.length > 0 && (
                <div className="ll-detail-item ll-detail-full-width">
                  <label>例文:</label>
                  <ul className="ll-detail-list">
                    {term.details.examples.map((example, idx) => (
                      <li key={idx}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {term.details.slang_examples && term.details.slang_examples.length > 0 && (
                <div className="ll-detail-item ll-detail-full-width">
                  <label>スラング例文:</label>
                  <ul className="ll-detail-list">
                    {term.details.slang_examples.map((example, idx) => (
                      <li key={idx}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
