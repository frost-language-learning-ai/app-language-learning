import React, { useState } from "react";
import { languageApi } from "../../lib/apiClient.js";

export default function FreestyleWorkspace({ 
  characterStyle = "tsundere",
  characterGender = "neutral",
  dereRank = 2,
  sourceLanguage = "en",
  targetLanguage = "de",
  onError, 
  t 
}) {
  const [userInput, setUserInput] = useState("");
  const [conversation, setConversation] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSendMessage() {
    const prompt = userInput.trim();
    if (!prompt) {
      setMessage(t.llPromptRequired || "Please enter your message.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    // Add user message to conversation
    setConversation(prev => [...prev, {
      type: "user",
      content: prompt,
      timestamp: new Date()
    }]);

    try {
      const result = await languageApi.askReasoning({
        termId: 0, // Freestyle mode doesn't use term ID
        prompt,
        language: targetLanguage,
        characterStyle,
        characterGender,
        dereRank
      });

      // Add AI response to conversation
      setConversation(prev => [...prev, {
        type: "ai",
        content: result.answer || "",
        timestamp: new Date()
      }]);

      setUserInput("");
    } catch (error) {
      const suffix = error?.requestId ? ` (requestId: ${error.requestId})` : "";
      setMessage(`${t.llAskFailedPrefix || "AI request failed"}: ${error.message}${suffix}`);
      onError?.(error);

      // Remove the last user message on error
      setConversation(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && e.ctrlKey) {
      onSendMessage();
    }
  }

  function clearConversation() {
    setConversation([]);
    setMessage("");
  }

  return (
    <section className="ll-card">
      <h3>{t.llFreestyleTitle || "Freestyle Chat"}</h3>
      <p style={{ marginTop: "4px", marginBottom: "16px", fontSize: "0.9em", color: "var(--ll-text-muted)", lineHeight: "1.4" }}>
        {t.llFreestyleDesc || "Practice natural conversation. Chat freely with AI in your target language to learn authentic expressions and improve fluency."}
      </p>

      {/* Error/Status Message */}
      {message && (
        <p className={`ll-message ${message.includes("Failed") || message.includes("failed") ? "ll-message-error" : ""}`} role="status">
          {message}
        </p>
      )}

      {/* Conversation Display */}
      <div className="ll-conversation-container" style={{
        border: "1px solid var(--ll-border)",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "16px",
        maxHeight: "400px",
        overflowY: "auto",
        backgroundColor: "var(--ll-surface-muted)"
      }}>
        {conversation.length === 0 ? (
          <p style={{ color: "var(--ll-text-muted)", textAlign: "center", margin: "20px 0" }}>
            {t.llStartConversation || "Start a conversation..."}
          </p>
        ) : (
          conversation.map((msg, idx) => (
            <div key={idx} style={{
              marginBottom: "12px",
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: msg.type === "user" ? "rgba(66, 165, 160, 0.15)" : "var(--ll-surface)",
              borderLeft: `3px solid ${msg.type === "user" ? "var(--ll-primary)" : "var(--ll-text-muted)"}`
            }}>
              <p style={{ 
                margin: "0 0 4px 0", 
                fontSize: "0.85em", 
                fontWeight: 600,
                color: msg.type === "user" ? "var(--ll-primary)" : "var(--ll-text-muted)"
              }}>
                {msg.type === "user" ? t.llYou || "You" : t.llAI || "AI"}
              </p>
              <p style={{ 
                margin: 0, 
                lineHeight: "1.5",
                color: "var(--ll-text)",
                whiteSpace: "pre-wrap"
              }}>
                {msg.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div style={{ marginBottom: "12px" }}>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={t.llFreestylePlaceholder || "Type your message... (Ctrl+Enter to send)"}
          className="ll-textarea"
          style={{ minHeight: "100px", marginBottom: "8px" }}
        />
      </div>

      {/* Action Buttons */}
      <div className="ll-row" style={{ gap: "8px" }}>
        <button
          onClick={onSendMessage}
          disabled={isLoading || !userInput.trim()}
          className="ll-button"
          style={{ flex: 1 }}
        >
          {isLoading ? (t.llWaitingResponse || "Waiting...") : (t.llSend || "Send")}
        </button>
        <button
          onClick={clearConversation}
          disabled={isLoading}
          className="ll-button"
          style={{ flex: 1 }}
        >
          {t.llClearConversation || "Clear"}
        </button>
      </div>

      {/* Info Text */}
      <p style={{ marginTop: "12px", fontSize: "0.85em", color: "var(--ll-text-muted)" }}>
        💡 {t.llFreestyleInfo || "Chat in " + (targetLanguage?.toUpperCase?.() || "your target language") + " for better learning!"}
      </p>
    </section>
  );
}
