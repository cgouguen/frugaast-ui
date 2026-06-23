import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Send, Square, MessageSquare, Code } from "lucide-react";
import "./GlobalInput.css";

export const GlobalInput = () => {
  const { 
    isConnected, isGenerating, isRepomapReq, approvalReq, 
    sendMessage, handleCancel, chat, 
    autocompleteResults, fetchAutocomplete, clearAutocomplete 
  } = useApp();
  
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("code");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  const checkAutocomplete = (text: string, cursorPosition: number) => {
    const textBeforeCursor = text.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      fetchAutocomplete(match[1]);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
      clearAutocomplete();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    checkAutocomplete(e.target.value, e.target.selectionStart);
  };

  const insertAutocomplete = (symbol: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const textAfterCursor = input.slice(cursorPosition);
    
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      const atIndex = textBeforeCursor.lastIndexOf('@');
      const newBefore = textBeforeCursor.slice(0, atIndex) + "@" + symbol + " ";
      setInput(newBefore + textAfterCursor);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newBefore.length;
          textareaRef.current.selectionEnd = newBefore.length;
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowAutocomplete(false);
    clearAutocomplete();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete && autocompleteResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % autocompleteResults.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + autocompleteResults.length) % autocompleteResults.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertAutocomplete(autocompleteResults[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowAutocomplete(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      onSend(); 
    }
  };

  const onSend = () => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input.trim(), mode);
    setInput("");
    setShowAutocomplete(false);
    clearAutocomplete();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [autocompleteResults]);

  return (
    <div className="global-input-wrapper">
      <div className="input-box">
        {showAutocomplete && (
          <div className="autocomplete-popup">
            {autocompleteResults.length > 0 ? (
              autocompleteResults.map((result, index) => (
                <div 
                  key={result} 
                  className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => insertAutocomplete(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {result}
                </div>
              ))
            ) : (
              <div className="autocomplete-item" style={{ opacity: 0.6, cursor: 'default' }}>
                Loading symbols...
              </div>
            )}
          </div>
        )}
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
          onChange={handleInputChange}
          onClick={(e) => checkAutocomplete(e.currentTarget.value, e.currentTarget.selectionStart)}
          onKeyUp={(e) => checkAutocomplete(e.currentTarget.value, e.currentTarget.selectionStart)}
          onKeyDown={onKeyDown}
          placeholder={isConnected ? "Message Frugaast... (@ for symbols, Shift+Enter for newline)" : "Connecting..."}
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
