import React, { useState, useEffect } from "react";
import { languageApi } from "../../lib/apiClient.js";

const LOCALE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
  { value: "tw", label: "繁體中文" }
];

export default function LanguageSettingsPanel({ 
  t, 
  locale, 
  onLocaleChange,
  characterStyle,
  onCharacterStyleChange,
  characterGender,
  onCharacterGenderChange,
  dereRank,
  onDereRankChange
}) {
  const [languages, setLanguages] = useState([]);
  const [newLanguageCode, setNewLanguageCode] = useState("");
  const [newLanguageName, setNewLanguageName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLanguages();
  }, []);

  async function loadLanguages() {
    try {
      // Always load all languages for settings panel (including hidden ones)
      const result = await languageApi.getLanguages(true);
      if (result.languages) {
        setLanguages(result.languages);
      }
    } catch (error) {
      setMessage(`Failed to load languages: ${error.message}`);
    }
  }

  async function onAddLanguage() {
    if (!newLanguageCode.trim() || !newLanguageName.trim()) {
      setMessage("Language code and name are required.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await languageApi.addLanguage({
        code: newLanguageCode.trim(),
        name: newLanguageName.trim(),
        visible: true
      });
      setMessage("Language added successfully!");
      setNewLanguageCode("");
      setNewLanguageName("");
      await loadLanguages();
    } catch (error) {
      setMessage(`Failed to add language: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteLanguage(code) {
    if (!confirm(`Delete language: ${code}?`)) return;

    setLoading(true);
    setMessage("");
    try {
      await languageApi.deleteLanguage(code);
      setMessage("Language deleted successfully!");
      await loadLanguages();
    } catch (error) {
      setMessage(`Failed to delete language: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function onToggleVisibility(code, currentVisible) {
    setLoading(true);
    try {
      await languageApi.updateLanguageVisibility(code, !currentVisible);
      await loadLanguages();
    } catch (error) {
      setMessage(`Failed to update visibility: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ll-card">
      <h3>{t.llSettingsTitle || "Settings"}</h3>
      <p className="ll-message">{t.llSettingsSubtext || "Configure language and display settings."}</p>

      {/* Display any messages */}
      {message && (
        <p
          style={{
            marginTop: "12px",
            padding: "8px",
            borderRadius: "6px",
            background: message.includes("Failed") ? "#3c2025" : "#193327",
            color: "var(--ll-text)"
          }}
        >
          {message}
        </p>
      )}

      <hr style={{ margin: "12px 0", borderColor: "var(--ll-border)" }} />

      {/* App Display Language Selection Section */}
      <label className="ll-settings-label">
        <span>{t.llLanguageLabel || "Language"}</span>
        <select
          className="ll-input"
          value={locale}
          onChange={(event) => onLocaleChange(event.target.value)}
        >
          {LOCALE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <hr style={{ margin: "20px 0", borderColor: "var(--ll-border)" }} />

      {/* AI Character Settings Section */}
      <h4 style={{ marginTop: "20px", marginBottom: "12px" }}>AI Character Settings</h4>
      
      <label className="ll-settings-label">
        <span>{t.llCharacterStyleLabel || "Character"}</span>
        <select 
          value={characterStyle} 
          onChange={(e) => onCharacterStyleChange(e.target.value)} 
          className="ll-input"
        >
          <option value="tsundere">{t.llCharacterTsundere || "Tsundere"}</option>
          <option value="kuudere">{t.llCharacterKuudere || "Kuudere"}</option>
          <option value="downer">{t.llCharacterDowner || "Downer"}</option>
          <option value="kuudere_downer">{t.llCharacterKuudereDowner || "Kuudere Downer"}</option>
        </select>
      </label>

      <label className="ll-settings-label">
        <span>{t.llCharacterGenderLabel || "Gender"}</span>
        <select 
          value={characterGender} 
          onChange={(e) => onCharacterGenderChange(e.target.value)} 
          className="ll-input"
        >
          <option value="female">{t.llGenderFemale || "Female"}</option>
          <option value="male">{t.llGenderMale || "Male"}</option>
          <option value="neutral">{t.llGenderNeutral || "Neutral"}</option>
        </select>
      </label>

      <label className="ll-settings-label">
        <span>{t.llDereRankLabel || "Dere Rank"}</span>
        <select
          value={String(dereRank)}
          onChange={(e) => onDereRankChange(Number(e.target.value))}
          className="ll-input"
        >
          <option value="1">{t.llDereRank1 || "Rank 1 (25%)"}</option>
          <option value="2">{t.llDereRank2 || "Rank 2 (50%)"}</option>
          <option value="3">{t.llDereRank3 || "Rank 3 (75%)"}</option>
          <option value="4">{t.llDereRank4 || "Rank 4 (100%)"}</option>
        </select>
      </label>

      <hr style={{ margin: "20px 0", borderColor: "var(--ll-border)" }} />

      {/* Available Language Management Section */}
      <h4 style={{ marginTop: "20px", marginBottom: "12px" }}>Language Management</h4>

      <div className="ll-card" style={{ background: "var(--ll-surface-muted)" }}>
        <h5 style={{ marginBottom: "12px" }}>Available Languages</h5>
        {languages.length === 0 ? (
          <p style={{ color: "var(--ll-text-muted)" }}>No languages available</p>
        ) : (
          <div className="ll-languages-table-wrapper">
            <table className="ll-languages-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Language Name</th>
                  <th>Visible</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {languages.map((lang) => (
                  <tr key={lang.code}>
                    <td style={{ fontFamily: "monospace" }}>{lang.code}</td>
                    <td>{lang.name}</td>
                    <td>
                      <span style={{ color: lang.visible === false ? "var(--ll-text-muted)" : "var(--ll-accent)" }}>
                        {lang.visible === false ? "○ Hidden" : "✓ Visible"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => onToggleVisibility(lang.code, lang.visible)}
                        disabled={loading}
                        className="ll-button"
                        style={{ padding: "4px 8px", marginRight: "4px" }}
                      >
                        {lang.visible === false ? "Show" : "Hide"}
                      </button>
                      <button
                        onClick={() => onDeleteLanguage(lang.code)}
                        disabled={loading}
                        className="ll-button"
                        style={{
                          padding: "4px 8px",
                          color: "var(--ll-danger)",
                          borderColor: "var(--ll-danger)"
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ll-card" style={{ background: "var(--ll-surface-muted)", marginBottom: "12px" }}>
        <h5 style={{ marginBottom: "12px" }}>Add New Language</h5>
        <div className="ll-row">
          <input
            type="text"
            placeholder="Code (e.g., pt)"
            value={newLanguageCode}
            onChange={(e) => setNewLanguageCode(e.target.value)}
            className="ll-input"
            maxLength="10"
            style={{ flex: "0 0 60px" }}
          />
          <input
            type="text"
            placeholder="Language Name (e.g., Português)"
            value={newLanguageName}
            onChange={(e) => setNewLanguageName(e.target.value)}
            className="ll-input"
          />
          <button
            onClick={onAddLanguage}
            disabled={loading}
            className="ll-button ll-button-primary"
          >
            Add
          </button>
        </div>
      </div>
    </section>
  );
}
