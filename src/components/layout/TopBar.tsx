import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { MessageSquare, Map, Activity, Clipboard, FileText, ChevronDown } from "lucide-react";
import "./TopBar.css";

export const TopBar = () => {
  const { mainView, setMainView, status, isGenerating, workspace, sendHiddenCommand, openedFile, models, currentModel, loadModel } = useApp();
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

  return (
    <header className="tabs-header">
      <nav className="tabs-list">
        <button className={`tab-btn ${mainView === 'chat' ? 'active' : ''}`} onClick={() => setMainView('chat')}>
          <MessageSquare size={16} /> <span>Chat</span>
        </button>
        <button className={`tab-btn ${mainView === 'repomap' ? 'active' : ''}`} onClick={() => setMainView('repomap')}>
          <Map size={16} /> <span>Repo Map</span>
        </button>
        {(openedFile || mainView === 'file') && (
          <button className={`tab-btn ${mainView === 'file' ? 'active' : ''}`} onClick={() => setMainView('file')}>
            <FileText size={16} /> <span>Files</span>
          </button>
        )}
      </nav>
      
      <div className="header-actions">
        <div className="status-indicator">
          <Activity size={14} className={isGenerating ? "spin-pulse" : "static"} />
          <span className="status-text">{status}</span>
        </div>
        {mainView === 'chat' && (
          <button className="action-btn" onClick={() => sendHiddenCommand(`/copy-build-message`)} title="Copy Build Messages">
            <Clipboard size={14} /> <span>Copy Data</span>
          </button>
        )}
        {mainView === 'repomap' && (
          <button className="action-btn" onClick={() => sendHiddenCommand(`/copy-repomap`)} title="Copy Repo Map" disabled={!workspace}>
            <Clipboard size={14} /> <span>Copy Map</span>
          </button>
        )}
        {models.length > 0 && (
          <div className="custom-select-wrapper" style={{ marginLeft: "var(--space-sm)" }} ref={dropdownRef}>
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
              <div className="custom-dropdown-menu">
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
    </header>
  );
};
