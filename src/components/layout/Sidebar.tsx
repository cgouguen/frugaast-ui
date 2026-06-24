import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { FolderOpen, Sparkles, FileCode2, Plus, Trash2, RefreshCcw, List, ListTree, Search, Folder } from "lucide-react";
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
    isConnected, isGenerating, 
    activeFiles, sendHiddenCommand, searchFiles, stats,
    sidebarVisible, fuzzyResults, workspace
  } = useApp();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isConnected || !workspace) return;
    
    searchFiles(query);
    
    // The backend might need a moment to index the workspace after connection.
    // We retry the search a couple of times to ensure files load on init.
    const timer1 = setTimeout(() => searchFiles(query), 400);
    const timer2 = setTimeout(() => searchFiles(query), 1200);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isConnected, workspace]);

  const treeItems = useMemo(() => {
    const root: any = { name: '', path: '', children: {}, isFile: false };
    fuzzyResults.forEach(p => {
      const parts = p.split(/[/\\]/);
      let current = root;
      parts.forEach((part, i) => {
        const isFile = i === parts.length - 1;
        const nodePath = parts.slice(0, i + 1).join('/');
        if (!current.children[part]) {
          current.children[part] = { name: part, path: isFile ? p : nodePath, children: {}, isFile };
        }
        if (isFile) current.children[part].isFile = true;
        current = current.children[part];
      });
    });

    const flatten = (node: any, depth: number = -1): any[] => {
      let result: any[] = [];
      if (depth >= 0) {
        result.push({ name: node.name, path: node.path, isFile: node.isFile, depth });
      }
      const sortedChildren = Object.values(node.children).sort((a: any, b: any) => {
        if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
        return a.isFile ? 1 : -1;
      });
      sortedChildren.forEach(child => {
        result = result.concat(flatten(child, depth + 1));
      });
      return result;
    };

    return flatten(root);
  }, [fuzzyResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [fuzzyResults]);

  const handleSelect = (file: string) => {
    sendHiddenCommand(`/add ${file}`);
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

      <div className="workspace-section">
        <div className="section-header">
          <span className="section-title truncate" title={workspace || "Workspace"}>
            {workspace ? workspace.split(/[/\\]/).filter(Boolean).pop() : "Workspace"}
          </span>
        </div>
        
        {workspace ? (
          <>
            <div className="workspace-search">
              <Search size={14} />
              <input 
                type="text" 
                placeholder="Search files..." 
                value={query}
                onFocus={() => {
                  if (fuzzyResults.length === 0) searchFiles(query);
                }}
                onChange={(e) => {
                  setQuery(e.target.value);
                  searchFiles(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, Math.max(0, treeItems.length - 1))); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
                  else if (e.key === "Enter" && treeItems[selectedIndex]) { 
                    e.preventDefault(); 
                    if (treeItems[selectedIndex].isFile) handleSelect(treeItems[selectedIndex].path); 
                  }
                }}
              />
            </div>

            <div className="workspace-results">
              {treeItems.length === 0 ? <div className="empty-state" style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px' }}>No files found.</div> : (
                treeItems.map((item, i) => (
                  <div key={item.path} className={`workspace-item ${i === selectedIndex ? 'selected' : ''}`} 
                    style={{ paddingLeft: `${8 + item.depth * 12}px` }}
                    onClick={() => item.isFile && handleSelect(item.path)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    {item.isFile ? <FileCode2 size={14} className="file-icon" /> : <Folder size={14} className="folder-icon file-icon" />}
                    <span className="truncate" style={{ marginLeft: '6px' }}>{item.name}</span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '12px' }}>
            No workspace opened
          </div>
        )}
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
