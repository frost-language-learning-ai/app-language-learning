import React, { useMemo, useState } from "react";
import { languageApi } from "../../lib/apiClient.js";

function detectType(text) {
  if (/grammar|文法|grammatik/i.test(text)) return "grammar_rule";
  if (/context|文脈|kontext/i.test(text)) return "context_usage";
  return "nuance_comparison";
}

export default function ReasoningWorkspace({ 
  termId = 1,
  sourceLanguage = "en",
  targetLanguage = "ja",
  characterStyle = "tsundere",
  characterGender = "neutral",
  dereRank = 2,
  onError, 
  t 
}) {
  const [chatText, setChatText] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [notes, setNotes] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);

  const canSave = useMemo(() => selectedText.trim().length > 0, [selectedText]);

  async function onSaveSelected() {
    const content = selectedText.trim();
    if (!content) return;

    const payload = {
      termId,
      content,
      type: detectType(content)
    };

    setSaving(true);
    setMessage("");
    try {
      const result = await languageApi.saveKnowledgeNode(payload);
      setNotes((prev) => [result.node, ...prev]);
      setMessage(t.llNoteSaved || "Saved to Knowledge_Nodes.");
    } catch (error) {
      const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
      setMessage(`${t.llSaveFailedPrefix || "Failed to save"}: ${error.message}${suffix}`);
      onError?.(error);
    } finally {
      setSaving(false);
    }
  }

  async function onAskAi() {
    const prompt = chatText.trim();
    if (!prompt) {
      setMessage(t.llPromptRequired || "Please enter your prompt.");
      return;
    }

    setAsking(true);
    setMessage("");
    setSelectedText("");
    try {
      const result = await languageApi.askReasoning({
        termId,
        prompt,
        language: targetLanguage,
        characterStyle,
        characterGender,
        dereRank
      });
      setAiAnswer(result.answer || "");
      setMessage(t.llResponseReadySelect || "AI response ready. Select the part you want to save.");
    } catch (error) {
      const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
      setMessage(`${t.llAskFailedPrefix || "AI request failed"}: ${error.message}${suffix}`);
      onError?.(error);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div>
      <h3>{t.llReasoningTitle || "Reasoning Prompt "}</h3>
      <p style={{ marginTop: "4px", marginBottom: "16px", fontSize: "0.9em", color: "var(--ll-text-muted)", lineHeight: "1.4" }}>
        {t.llReasoningDesc || "Investigate a specific word in depth. Ask about grammar, usage, or nuance, then save valuable insights to your Knowledge Base."}
      </p>
      
      {/* Error/Status Message at Top */}
      {message && (
        <p className={`ll-message ${message.includes("Failed") || message.includes("failed") ? "ll-message-error" : ""}`} role="status">
          {message}
        </p>
      )}
      
      <div className="ll-two-col">
        <div>
          <label>{t.llChatLabel || "AI Chat"}</label>
          <textarea
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            className="ll-textarea"
            placeholder={t.llChatPlaceholder || "Paste discussion text and select part to save"}
          />
          <div className="ll-row">
            <button onClick={onAskAi} disabled={asking || !chatText.trim()} className="ll-button">
              {asking ? (t.llAskingAi || "Asking AI...") : (t.llAskAiButton || "Ask AI")}
            </button>
          </div>
          {aiAnswer && (
            <div
              className="ll-ai-answer"
              onMouseUp={() => {
                const selected = window.getSelection?.()?.toString?.() || "";
                setSelectedText(selected);
              }}
            >
              {aiAnswer}
            </div>
          )}
          {canSave && (
            <button onClick={onSaveSelected} disabled={saving} className="ll-button ll-button-primary">
              {t.llSaveToNoteButton || "Save to Note"}
            </button>
          )}
        </div>
        <div>
          <label>{t.llSavedNotesLabel || "Saved Notes"}</label>
          <div className="ll-notes">
            {notes.map((n) => (
              <article key={n.id} className="ll-note-item">
                <p>{n.content}</p>
                <small>{n.type} {Array.isArray(n.tags) ? n.tags.join(" ") : ""}</small>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
