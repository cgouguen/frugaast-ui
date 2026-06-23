import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Send, Square, MessageSquare, Code } from "lucide-react";
import "./GlobalInput.css";

export const GlobalInput = () => {
  const { isConnected, isGenerating, isRepomapReq, approvalReq, sendMessage, handleCancel, chat } = useApp();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("code");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  // Focus textarea when a response completes
  useEffect(() => {
    if (!isGenerating && chat.length > 0) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isGenerating, chat.length]);

  const onSend = () => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input.trim(), mode);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="global-input-wrapper">
      <div className="input-box">
        <div className="mode-toggle">
          <button className={`mode-btn ${mode === "ask" ? "active" : ""}`} onClick={() => setMode("ask")} disabled={isGenerating}>
            <MessageSquare size={14} /> Ask
          </button>
          <button className={`mode-btn ${mode === "code" ? "active" : ""}`} onClick={() => setMode("code")} disabled={isGenerating}>
            <Code size={14} /> Code
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          placeholder={isConnected ? "Message Frugaast... (Shift+Enter for new line)" : "Connecting..."}
          disabled={!isConnected || approvalReq !== null || (isGenerating && isRepomapReq)}
          autoFocus
          rows={1}
        />

        <div className="input-actions">
          {isGenerating && !isRepomapReq ? (
            <button type="button" className="send-btn stop" onClick={handleCancel} title="Stop Generation">
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button type="button" className="send-btn" onClick={onSend} disabled={!isConnected || !input.trim()} title="Send">
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
