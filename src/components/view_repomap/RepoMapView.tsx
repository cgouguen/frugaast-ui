import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Map, RefreshCcw, Sparkles, Copy, Check } from "lucide-react";
import "./RepoMapView.css";

export const RepoMapView = () => {
  const { isConnected, isGenerating, isRepomapReq, maxMapTokens, setMaxMapTokens, fetchRepoMap, repomapContent } = useApp();
  const [prompt, setPrompt] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const fetchRef = useRef(fetchRepoMap);
  const promptRef = useRef(prompt);

  useEffect(() => {
    fetchRef.current = fetchRepoMap;
  }, [fetchRepoMap]);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  const handleCopy = () => {
    if (repomapContent) {
      navigator.clipboard.writeText(repomapContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  useEffect(() => {
    const triggerFetch = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        fetchRef.current(promptRef.current);
      }, 750);
    };

    if (isConnected) {
      triggerFetch();
    }

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [maxMapTokens, isConnected, prompt]);

  return (
    <div className="repomap-main-view">
      <div className="repomap-header-card">
        <div className="repomap-header-controls">
          <div className="repomap-title">
            <Map size={24} className="brand-icon" /> 
            <div>
              <h2>Repository Map</h2>
              <span className="repomap-subtitle">Architectural overview of your workspace</span>
            </div>
          </div>
          <div className="repomap-controls-right">
            <div className="repomap-settings">
              {isGenerating && isRepomapReq && <RefreshCcw size={16} className="spin-pulse repomap-spinner" />}
              <div className="token-slider-container">
                <div className="token-slider-labels">
                  <span className="stat-label">Map Detail (Tokens)</span>
                  <span className="stat-value">{maxMapTokens}</span>
                </div>
                <input 
                  type="range" min="1024" max="16384" step="512" 
                  value={maxMapTokens} onChange={(e) => setMaxMapTokens(Number(e.target.value))}
                  className="modern-slider" title="Max tokens for Repo Map"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="repomap-prompt-container">
          <Sparkles size={18} className="prompt-icon" />
          <input
            type="text"
            className="repomap-prompt-input"
            placeholder="E.g., 'Focus on the authentication flow' or 'Highlight database models'..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
      </div>

      <div className="repomap-content-card">
        {repomapContent ? (
          <>
            <button 
              className="repomap-copy-btn" 
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
              <span>{isCopied ? "Copied!" : "Copy"}</span>
            </button>
            <pre className="repomap-code">{repomapContent}</pre>
          </>
        ) : (
          <div className="repomap-empty-state">
            <div className="pulse-ring"></div>
            <p>Analyzing workspace architecture...</p>
            <span className="empty-state-sub">This may take a moment depending on the size of your repository</span>
          </div>
        )}
      </div>
    </div>
  );
};
