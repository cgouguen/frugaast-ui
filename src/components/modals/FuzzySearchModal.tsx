import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Search, X, FileCode2 } from "lucide-react";
import "./FuzzySearchModal.css";

export const FuzzySearchModal = () => {
  const { showFuzzySearch, setShowFuzzySearch, fuzzyResults, searchFiles, sendHiddenCommand } = useApp();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (showFuzzySearch) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [showFuzzySearch]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [fuzzyResults]);

  if (!showFuzzySearch) return null;

  const handleSelect = (file: string) => {
    sendHiddenCommand(`/add ${file}`);
    setShowFuzzySearch(false);
  };

  return (
    <div className="modal-backdrop" onClick={() => setShowFuzzySearch(false)}>
      <div className="modal-panel fuzzy-panel" onClick={e => e.stopPropagation()}>
        <div className="fuzzy-header">
          <Search size={18} className="fuzzy-icon" />
          <input 
            type="text" className="fuzzy-input" placeholder="Search files by name..." 
            value={query} 
            onChange={(e) => {
              setQuery(e.target.value);
              searchFiles(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowFuzzySearch(false);
              else if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, Math.max(0, fuzzyResults.length - 1))); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
              else if (e.key === "Enter" && fuzzyResults[selectedIndex]) { e.preventDefault(); handleSelect(fuzzyResults[selectedIndex]); }
            }}
            autoFocus
          />
          <button className="icon-btn-small" onClick={() => setShowFuzzySearch(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="fuzzy-results">
          {fuzzyResults.length === 0 ? <div className="fuzzy-empty">No files found.</div> : (
            fuzzyResults.map((f, i) => (
              <div key={i} className={`fuzzy-item ${i === selectedIndex ? 'selected' : ''}`} 
                onClick={() => handleSelect(f)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <FileCode2 size={14} className="file-icon" />
                <span className="truncate">{f}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
