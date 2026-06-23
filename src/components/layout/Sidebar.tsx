import React from "react";
import { useApp } from "../../context/AppContext";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Sparkles, FileCode2, Plus, Trash2, RefreshCcw } from "lucide-react";
import "./Sidebar.css";

export const Sidebar = () => {
  const { 
    isConnected, isGenerating, workspace, setWorkspace, initWorkspace, 
    activeFiles, sendHiddenCommand, setShowFuzzySearch, searchFiles, stats 
  } = useApp();

  async function handleOpenWorkspace() {
    try {
      const selectedPath = await open({ directory: true, multiple: false });
      if (selectedPath) {
        setWorkspace(selectedPath as string);
        initWorkspace(selectedPath as string);
      }
    } catch (err) { console.error(err); }
  }

  const handleAddFileClick = () => {
    setShowFuzzySearch(true);
    searchFiles("");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <Sparkles size={18} className="brand-icon" />
          <span>Frugaast</span>
        </div>
        <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} title={isConnected ? "Connected" : "Disconnected"} />
      </div>
      
      <div className="workspace-section">
        <button className="workspace-btn" onClick={handleOpenWorkspace} disabled={!isConnected || isGenerating}>
          <FolderOpen size={16} />
          <span className="truncate">{workspace ? workspace.split(/[/\\]/).pop() : "Open Workspace"}</span>
        </button>
      </div>

      <div className="context-section">
        <div className="section-header">
          <span className="section-title">Context ({activeFiles.length})</span>
          <button className="icon-btn-small" onClick={handleAddFileClick} title="Add files to context" disabled={!isConnected || isGenerating}>
            <Plus size={16} />
          </button>
        </div>
        
        <div className="context-list">
          {activeFiles.length === 0 ? (
            <div className="empty-state">No files loaded.</div>
          ) : (
            activeFiles.map((f, i) => (
              <div key={i} className="context-item">
                <div className="context-item-name truncate" title={f}>
                  <FileCode2 size={14} className="file-icon" />
                  {f.split(/[/\\]/).pop()}
                </div>
                <button className="remove-btn" onClick={() => sendHiddenCommand(`/drop ${f}`)} title="Remove file">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        
        <button className="reset-context-btn" onClick={() => sendHiddenCommand(`/reset`)} title="Clear all context files">
          <RefreshCcw size={14} /> Reset Context
        </button>
      </div>

      <div className="stats-card">
        <div className="stat-row">
          <span className="stat-label">Tokens</span>
          <span className="stat-value">{stats.tokens.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Context</span>
          <span className="stat-value">${stats.cost.toFixed(4)}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-row highlight">
          <span className="stat-label">Session</span>
          <span className="stat-value">${stats.session_cost.toFixed(4)}</span>
        </div>
      </div>
    </aside>
  );
};
