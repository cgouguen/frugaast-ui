import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Send, Square, MessageSquare, Code, ChevronDown, Hammer } from "lucide-react";
import "./ChatInput.css";
import { BuildMessageDrawer } from "../modals/BuildMessageDrawer";

export const ChatInput = () => {
  const { 
    isConnected, isGenerating, isRepomapReq, approvalReq, 
    sendMessage, handleCancel, chat, 
    autocompleteResults, fetchAutocomplete, clearAutocomplete,
    models, currentModel, loadModel, getBuildMessage
  } = useApp();
  
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("code");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastAutocompletePrefix = useRef<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      if (overlayRef.current) {
        overlayRef.current.style.height = textareaRef.current.style.height;
      }
    }
  }, [input]);

  const renderHighlightedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```|`[^`]*`|^#+ .*?$)/gm);
    
    const elements = parts.map((part, index) => {
      if (!part) return null;
      if (part.startsWith('```') && part.endsWith('```') && part.length >= 6) {
        return <span key={index} className="syntax-code-block">{part}</span>;
      } else if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return <span key={index} className="syntax-inline-code">{part}</span>;
      } else if (part.match(/^#+ /)) {
        return <span key={index} className="syntax-heading">{part}</span>;
      } else {
        return <span key={index}>{part}</span>;
      }
    });

    if (text.endsWith('\n')) {
      elements.push(<span key="trailing"> </span>);
    }
    
    return elements;
  };

  // Focus textarea when a response completes
  useEffect(() => {
    if (!isGenerating && chat.length > 0) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isGenerating, chat.length]);

  const checkAutocomplete = (text: string, cursorPosition: number) => {
    const textBeforeCursor = text.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)(`?)([^\s`]*)$/);
    
    if (match) {
      const hasBacktick = match[1] === '`';
      const prefix = match[2];
      
      if (hasBacktick || prefix.length > 4) {
        if (prefix !== lastAutocompletePrefix.current) {
          setSelectedIndex(0);
          lastAutocompletePrefix.current = prefix;
          fetchAutocomplete(prefix);
        }
        setShowAutocomplete(true);
        return;
      }
    }
    
    if (lastAutocompletePrefix.current !== null) {
      lastAutocompletePrefix.current = null;
      clearAutocomplete();
    }
    setShowAutocomplete(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    checkAutocomplete(e.target.value, e.target.selectionStart);
  };

  const insertAutocomplete = (symbol: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPosition);
    const textAfterCursor = input.slice(cursorPosition);
    
    const match = textBeforeCursor.match(/(?:^|\s)(`?)([^\s`]*)$/);
    if (match) {
      const hasBacktick = match[1] === '`';
      const prefix = match[2];
      
      const replaceStartIndex = hasBacktick 
        ? textBeforeCursor.lastIndexOf('`')
        : cursorPosition - prefix.length;
        
      const newBefore = textBeforeCursor.slice(0, replaceStartIndex) + "`" + symbol + "` ";
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

  return (
    <div className="chat-input-wrapper" style={{ position: "relative" }}>
      <BuildMessageDrawer />
      <div className="input-box">
        {showAutocomplete && autocompleteResults.length > 0 && (
          <div className="autocomplete-popup">
            {autocompleteResults.map((result, index) => (
              <div 
                key={result} 
                className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => insertAutocomplete(result)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {result}
              </div>
            ))}
          </div>
        )}
        <div className="mode-toggle">
          <div className="input-modes">
            <button className={`mode-btn ${mode === "ask" ? "active" : ""}`} onClick={() => setMode("ask")} disabled={isGenerating}>
              <MessageSquare size={14} /> Ask
            </button>
            <button className={`mode-btn ${mode === "code" ? "active" : ""}`} onClick={() => setMode("code")} disabled={isGenerating}>
              <Code size={14} /> Code
            </button>
          </div>

          <div className="input-settings">
            <button className="mode-btn" onClick={() => getBuildMessage(input)} disabled={isGenerating} title="Show build message">
              <Hammer size={14} /> View prompt
            </button>
            
            {models.length > 0 && (
              <div className="custom-select-wrapper chat-model-dropdown" ref={dropdownRef}>
                <button 
                  className={`custom-select-trigger ${isModelDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  title="Select Model"
                >
                  <span className="custom-select-text">
                    {models.find(m => m.id === currentModel)?.name || "Select Model"}
                  </span>
                  <ChevronDown size={14} className="custom-select-icon" />
                </button>
                
                {isModelDropdownOpen && (
                  <div className="custom-dropdown-menu chat-dropdown-menu">
                    {models.map(m => (
                      <button
                        key={m.id}
                        className={`custom-dropdown-item ${currentModel === m.id ? 'selected' : ''}`}
                        onClick={() => {
                          loadModel(m.id);
                          setIsModelDropdownOpen(false);
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="input-wrapper">
          <div className="input-container">
            <div className="highlight-overlay" ref={overlayRef} aria-hidden="true">
              {renderHighlightedText(input)}
            </div>
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={handleInputChange}
              onClick={(e) => checkAutocomplete(e.currentTarget.value, e.currentTarget.selectionStart)}
              onKeyUp={(e) => checkAutocomplete(e.currentTarget.value, e.currentTarget.selectionStart)}
              onKeyDown={onKeyDown}
              placeholder={isConnected ? "Message Frugaast... (` for symbols, Shift+Enter for newline)" : "Connecting..."}
              disabled={!isConnected || approvalReq !== null || (isGenerating && isRepomapReq)}
              autoFocus
              rows={1}
              spellCheck={false}
            />
          </div>
        </div>

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
