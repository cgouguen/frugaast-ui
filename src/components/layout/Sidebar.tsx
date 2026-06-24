import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Sparkles, FileCode2, Plus, Trash2, RefreshCcw, List, ListTree } from "lucide-react";
import "./Sidebar.css";

export const Sidebar = () => {
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat');

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 800) newWidth = 800;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const { 
    isConnected, isGenerating, workspace, setWorkspace, initWorkspace, 
    activeFiles, sendHiddenCommand, setShowFuzzySearch, searchFiles, stats,
    sidebarVisible
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

  const buildTree = (files: string[]) => {
    const root: any = {};
    files.forEach(file => {
      const parts = file.replace(/\\/g, '/').split('/').filter(Boolean);
      let current = root;
      let currentPath = '';
      parts.forEach((part, index) => {
        currentPath += (currentPath ? '/' : '') + part;
        const isFile = index === parts.length - 1;
        if (!current[part]) {
          current[part] = {
            name: part,
            path: isFile ? file : null,
            folderPath: isFile ? null : currentPath + '/',
            children: {}
          };
        }
        current = current[part].children;
      });
    });
    return root;
  };

  const renderTree = (nodes: any, depth = 0) => {
    return Object.values(nodes).map((node: any, i) => (
      <React.Fragment key={`${depth}-${i}`}>
        <div 
          className={node.path ? "context-item" : "context-item folder"} 
          style={{ paddingLeft: depth > 0 ? `${depth * 12 + 10}px` : undefined }}
        >
          <div className="context-item-name truncate" title={node.path || node.folderPath}>
            {node.path ? (
              <FileCode2 size={14} className="file-icon" />
            ) : (
              <FolderOpen size={14} className="folder-icon file-icon" />
            )}
            {node.name}
          </div>
          <button 
            className="remove-btn" 
            onClick={() => sendHiddenCommand(`/drop ${node.path || node.folderPath}`)} 
            title={`Remove ${node.path ? 'file' : 'folder'}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
        {Object.keys(node.children).length > 0 && renderTree(node.children, depth + 1)}
      </React.Fragment>
    ));
  };

  return (
    <aside 
      className="sidebar" 
      style={{ 
        width: sidebarWidth, 
        marginLeft: sidebarVisible ? 0 : -sidebarWidth,
        transition: isResizing ? 'none' : 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
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
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              className="icon-btn-small" 
              onClick={() => setViewMode(v => v === 'flat' ? 'tree' : 'flat')} 
              title={`Switch to ${viewMode === 'flat' ? 'tree' : 'flat'} view`}
            >
              {viewMode === 'flat' ? <ListTree size={16} /> : <List size={16} />}
            </button>
            <button className="icon-btn-small" onClick={handleAddFileClick} title="Add files to context" disabled={!isConnected || isGenerating}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        
        <div className="context-list">
          {activeFiles.length === 0 ? (
            <div className="empty-state">No files loaded.</div>
          ) : viewMode === 'flat' ? (
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
          ) : (
            renderTree(buildTree(activeFiles))
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

      <div 
        className={`sidebar-resize-handle ${isResizing ? "is-resizing" : ""}`}
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
      />
    </aside>
  );
};
