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
  }, [sourceLanguage, targetLanguage]);

  useEffect(() => {
    loadTerms();
  }, [selectedSourceLang, selectedTargetLang]);

  async function loadTerms(offset = 0) {
    setLoading(true);
    setMessage("");
    try {
      const result = await languageApi.getCoreTerms(50, offset, selectedSourceLang, selectedTargetLang);
      setTerms(result.terms);
      setPagination(result.pagination);
    } catch (error) {
      setMessage(`Failed to load terms: ${error.message}`);
    } finally {
      setLoading(false);
    }
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

    return matchesSearch && matchesCategory && matchesPartOfSpeech;
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
                  <th>{t.llTableHeaderSource || "Source"}</th>
                  <th>{t.llTableHeaderTarget || "Target"}</th>
                  <th>{t.llTableHeaderPhonetic || "Phonetic (UK)"}</th>
                  <th>品詞</th>
                  <th>カテゴリ</th>
                  <th>{t.llTableHeaderDate || "Date"}</th>
                  <th style={{ textAlign: "center", width: "80px" }}>詳細</th>
                </tr>
              </thead>
              <tbody>
                {filteredTerms.map((term) => (
                  <tr key={term.id}>
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
                    <td style={{ fontSize: "0.9em", color: "var(--ll-text-muted)" }}>
                      {new Date(term.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => {
                          setSelectedTerm(term);
                          setShowDetails(true);
                        }}
                        className="ll-button"
                        style={{ padding: "4px 8px", fontSize: "0.85em" }}
                      >
                        詳細
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
