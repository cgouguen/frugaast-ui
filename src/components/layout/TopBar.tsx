import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { MessageSquare, Map, Activity, Clipboard, FileText } from "lucide-react";
import "./TopBar.css";

export const TopBar = () => {
  const { mainView, setMainView, status, isGenerating, workspace, sendHiddenCommand, openedFile } = useApp();

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
      </div>
    </header>
  );
};
