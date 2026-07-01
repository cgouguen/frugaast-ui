import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { MessageSquare, Map, FileText } from "lucide-react";
import "./TopBar.css";

export const TopBar = () => {
  const { mainView, setMainView, openedFile } = useApp();

  return (
    <header className="tabs-header">
      <nav className="tabs-list">
        <button className={`tab-btn ${mainView === 'chat' ? 'active' : ''}`} onClick={() => setMainView('chat')}>
          <MessageSquare size={16} /> <span>Chat</span>
        </button>
        <button className={`tab-btn ${mainView === 'repomap' ? 'active' : ''}`} onClick={() => setMainView('repomap')}>
          <Map size={16} /> <span>Prompt Builder</span>
        </button>
        {(openedFile || mainView === 'file') && (
          <button className={`tab-btn ${mainView === 'file' ? 'active' : ''}`} onClick={() => setMainView('file')}>
            <FileText size={16} /> <span>Files</span>
          </button>
        )}
      </nav>
    </header>
  );
};
