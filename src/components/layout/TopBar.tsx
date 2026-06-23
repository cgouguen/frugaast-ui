import React from "react";
import { useApp } from "../../context/AppContext";
import { MessageSquare, Map, Activity, Clipboard } from "lucide-react";
import "./TopBar.css";

export const TopBar = () => {
  const { mainView, setMainView, status, isGenerating, workspace, sendHiddenCommand } = useApp();

  return (
    <header className="tabs-header">
      <div className="tabs-list">
        <button className={`tab-btn ${mainView === 'chat' ? 'active' : ''}`} onClick={() => setMainView('chat')}>
          <MessageSquare size={16} /> Chat
        </button>
        <button className={`tab-btn ${mainView === 'repomap' ? 'active' : ''}`} onClick={() => setMainView('repomap')}>
          <Map size={16} /> Repo Map
        </button>
      </div>
      
      <div className="header-actions">
        <div className="status-indicator">
          <Activity size={14} className={isGenerating ? "spin-pulse" : "static"} />
          <span className="status-text">{status}</span>
        </div>
        {mainView === 'chat' && (
          <button className="action-btn" onClick={() => sendHiddenCommand(`/copy-build-message`)} title="Copy Build Messages">
            <Clipboard size={14} /> Copy Data
          </button>
        )}
        {mainView === 'repomap' && (
          <button className="action-btn" onClick={() => sendHiddenCommand(`/copy-repomap`)} title="Copy Repo Map" disabled={!workspace}>
            <Clipboard size={14} /> Copy Map
          </button>
        )}
      </div>
    </header>
  );
};
