import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { FolderOpen, Sparkles, FileCode2, Plus, Trash2, RefreshCcw, List, ListTree, Search, Folder, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import "./Sidebar.css";

export const Sidebar = () => {
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat');
  const [verticalRatio, setVerticalRatio] = useState(0.5);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(false);

  useEffect(() => {
    if (!isResizingVertical) return;
    const handleMouseMove = (e: MouseEvent) => {
      const ratio = e.clientY / window.innerHeight;
      setVerticalRatio(Math.max(0.1, Math.min(0.9, ratio)));
    };
    const handleMouseUp = () => setIsResizingVertical(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingVertical]);

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
          className="tree-item in-context" 
          style={{ paddingLeft: `${depth * 12 + 8}px`, cursor: node.path ? 'pointer' : 'default' }}
          onClick={() => node.path && sendHiddenCommand(`/drop ${node.path}`)}
        >
          <div className="tree-item-left" title={node.path || node.folderPath}>
            {node.path ? (
              <FileCode2 size={14} className="tree-item-icon" />
            ) : (
              <FolderOpen size={14} className="tree-item-icon" />
            )}
            <span className="tree-item-name">{node.name}</span>
          </div>
          <button 
            className="item-action-btn remove" 
            onClick={(e) => { e.stopPropagation(); sendHiddenCommand(`/drop ${node.path || node.folderPath}`); }} 
            title={`Remove ${node.path ? 'file' : 'folder'}`}
          >
            <X size={14} />
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

      <div className="workspace-section" style={{ flex: workspaceCollapsed ? '0 0 auto' : verticalRatio }}>
        <div className="section-header" onClick={() => setWorkspaceCollapsed(!workspaceCollapsed)} style={{ cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {workspaceCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <Folder size={13} className="tree-item-icon" />
            <span className="section-title truncate" title={workspace || "Workspace"}>
              {workspace ? workspace.split(/[/\\]/).filter(Boolean).pop() : "Workspace"}
            </span>
          </div>
        </div>
        
        {!workspaceCollapsed && (workspace ? (
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

            <div className="scrollable-list">
              {treeItems.length === 0 ? <div className="empty-state">No files found.</div> : (
                treeItems.map((item, i) => {
                  const isAdded = item.isFile && activeFiles.includes(item.path);
                  return (
                    <div key={item.path} className={`tree-item ${i === selectedIndex ? 'selected' : ''} ${isAdded ? 'in-context' : ''}`} 
                      style={{ paddingLeft: `${8 + item.depth * 12}px` }}
                      onClick={() => item.isFile && handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <div className="tree-item-left">
                        {item.isFile ? <FileCode2 size={14} className="tree-item-icon" /> : <Folder size={14} className="tree-item-icon" />}
                        <span className="tree-item-name">{item.name}</span>
                      </div>
                      {item.isFile && (
                        <button 
                          className={`item-action-btn ${isAdded ? 'added' : 'add'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isAdded) handleSelect(item.path);
                          }}
                          title={isAdded ? "In Context" : "Add to Context"}
                        >
                          {isAdded ? <Check size={14} /> : <Plus size={14} />}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            No workspace opened
          </div>
        ))}
      </div>

      {!workspaceCollapsed && !contextCollapsed && (
        <div 
          className={`sidebar-vertical-resize-handle ${isResizingVertical ? "is-resizing" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); setIsResizingVertical(true); }}
        />
      )}

      <div className="context-section" style={{ flex: contextCollapsed ? '0 0 auto' : (1 - verticalRatio) }}>
        <div className="section-header">
          <div onClick={() => setContextCollapsed(!contextCollapsed)} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' }}>
            {contextCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span className="section-title">Context ({activeFiles.length})</span>
          </div>
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
        
        {!contextCollapsed && (
          <>
            <div className="scrollable-list">
              {activeFiles.length === 0 ? (
                <div className="empty-state">No files loaded.</div>
              ) : viewMode === 'flat' ? (
                activeFiles.map((f, i) => (
                  <div key={i} className="tree-item in-context" onClick={() => sendHiddenCommand(`/drop ${f}`)}>
                    <div className="tree-item-left" title={f}>
                      <FileCode2 size={14} className="tree-item-icon" />
                      <span className="tree-item-name">{f.split(/[/\\]/).pop()}</span>
                    </div>
                    <button className="item-action-btn remove" onClick={(e) => { e.stopPropagation(); sendHiddenCommand(`/drop ${f}`); }} title="Remove from context">
                      <X size={14} />
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
          </>
        )}
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
