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

export default function LanguageSettingsPanel({ t, locale, onLocaleChange }) {
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

      <hr style={{ margin: "20px 0", borderColor: "#c7dbdd" }} />

      <h4 style={{ marginTop: "20px", marginBottom: "12px" }}>Language Management</h4>
      
      <div className="ll-card" style={{ background: "#fff", marginBottom: "12px" }}>
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

      <div className="ll-card" style={{ background: "#fff" }}>
        <h5 style={{ marginBottom: "12px" }}>Available Languages</h5>
        {languages.length === 0 ? (
          <p style={{ color: "#666" }}>No languages available</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {languages.map((lang) => (
              <div
                key={lang.code}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  background: lang.visible === false ? "#f5f5f5" : "#fff"
                }}
              >
                <div>
                  <strong>{lang.code}</strong> - {lang.name}
                  {lang.visible === false && <span style={{ color: "#999", fontSize: "12px", marginLeft: "8px" }}>(hidden)</span>}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => onToggleVisibility(lang.code, lang.visible)}
                    disabled={loading}
                    className="ll-button"
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                  >
                    {lang.visible === false ? "Show" : "Hide"}
                  </button>
                  <button
                    onClick={() => onDeleteLanguage(lang.code)}
                    disabled={loading}
                    className="ll-button"
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      color: "#c41e3a",
                      borderColor: "#c41e3a"
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {message && (
        <p
          style={{
            marginTop: "12px",
            padding: "8px",
            borderRadius: "6px",
            background: message.includes("Failed") ? "#ffe6e6" : "#e6f7e6",
            color: message.includes("Failed") ? "#c41e3a" : "#2d5016"
          }}
        >
          {message}
        </p>
      )}
    </section>
  );
}
