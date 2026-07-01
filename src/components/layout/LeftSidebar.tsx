// src/components/layout/Sidebar.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { FileCode2, Plus, List, ListTree, Search, Folder, Check, X, ChevronDown, ChevronRight, RefreshCcw, Copy } from "lucide-react";
import "./LeftSidebar.css";

type TreeNode = {
  name: string;
  path: string | null;
  folderPath: string | null;
  children: Record<string, TreeNode>;
  isFile: boolean;
};

export const Sidebar = () => {
  const { 
    isConnected, searchFiles, stats, sendHiddenCommand,
    sidebarVisible, fuzzyResults, workspace, activeFiles,
    openFile, setChat
  } = useApp();

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [workspaceViewMode, setWorkspaceViewMode] = useState<'flat' | 'tree'>('tree');
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat');
  const [verticalRatio, setVerticalRatio] = useState(0.5);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(false);
  
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [collapsedContextFolders, setCollapsedContextFolders] = useState<Set<string>>(new Set());
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyFiles = () => {
    sendHiddenCommand(`/copy-context`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Vertical resizing handler
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

  // Horizontal resizing handler
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => setSidebarWidth(Math.max(200, Math.min(e.clientX, 800)));
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Initial load sync
  useEffect(() => {
    if (!isConnected || !workspace) return;
    searchFiles(query);
    const timer = setTimeout(() => searchFiles(query), 800); // safety init
    return () => clearTimeout(timer);
  }, [isConnected, workspace]);

  const handleSelect = (file: string) => sendHiddenCommand(`/add ${file}`);

  const buildTree = (files: string[]) => {
    const root: Record<string, TreeNode> = {};
    files.forEach(file => {
      const isExplicitDir = file.endsWith('/') || file.endsWith('\\');
      const parts = file.replace(/\\/g, '/').split('/').filter(Boolean);
      
      let current = root;
      let currentPath = '';
      
      parts.forEach((part, index) => {
        currentPath += (currentPath ? '/' : '') + part;
        const isLast = index === parts.length - 1;
        // It is a file only if it is the last segment and doesn't explicitly trail with a slash
        const isFile = isLast && !isExplicitDir;
        
        if (!current[part]) {
          current[part] = { 
            name: part, 
            path: isFile ? file : null, 
            folderPath: !isFile ? currentPath : null, 
            children: {}, 
            isFile 
          };
        } else if (!isFile) {
          // If the node already exists but we now traverse through it (meaning it has children),
          // ensure it converts to a directory instead of remaining a generic file.
          current[part].isFile = false;
          current[part].folderPath = currentPath;
          current[part].path = null;
        }
        
        current = current[part].children;
      });
    });
    return root;
  };

  const explorerTree = useMemo(() => {
    if (workspaceViewMode === 'flat') return null;
    return buildTree(fuzzyResults);
  }, [fuzzyResults, workspaceViewMode]);

  const contextTree = useMemo(() => {
    if (viewMode === 'flat') return null;
    return buildTree(activeFiles);
  }, [activeFiles, viewMode]);

  // Default expanding top-level explorer folders, or auto-expand all during search
  useEffect(() => {
    if (!explorerTree) return;
    
    if (query.trim() !== '') {
      // Auto-expand all folders when searching
      const allFolders = new Set<string>();
      const extractFolders = (nodes: Record<string, TreeNode>) => {
        Object.values(nodes).forEach(n => {
          if (!n.isFile && n.folderPath) {
            allFolders.add(n.folderPath);
            extractFolders(n.children);
          }
        });
      };
      extractFolders(explorerTree);
      setExpandedFolders(prev => {
        const next = new Set(prev);
        allFolders.forEach(f => next.add(f));
        return next;
      });
    } else if (expandedFolders.size === 0) {
      const rootFolders = Object.values(explorerTree).filter(n => !n.isFile).map(n => n.folderPath!);
      setExpandedFolders(new Set(rootFolders));
    }
  }, [explorerTree, query]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath); else next.add(folderPath);
      return next;
    });
  };

  const toggleContextFolder = (folderPath: string) => {
    setCollapsedContextFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath); else next.add(folderPath);
      return next;
    });
  };

  const treeVisibleFiles = useMemo(() => {
    if (!explorerTree) return [];
    const files: string[] = [];
    const traverse = (nodes: Record<string, TreeNode>) => {
      const sortedNodes = Object.values(nodes).sort((a, b) => {
        if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
        return a.isFile ? 1 : -1;
      });
      sortedNodes.forEach(node => {
        if (node.isFile) files.push(node.path!);
        else if (query.trim() !== '' || expandedFolders.has(node.folderPath!)) traverse(node.children);
      });
    };
    traverse(explorerTree);
    return files;
  }, [explorerTree, expandedFolders, query]);

  const renderExplorerTree = (nodes: Record<string, TreeNode>, depth = 0) => {
    const sortedNodes = Object.values(nodes).sort((a, b) => {
      if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
      return a.isFile ? 1 : -1;
    });

    return sortedNodes.map((node) => {
      const isExpanded = expandedFolders.has(node.folderPath || '');
      const isAdded = node.isFile && activeFiles.includes(node.path!);

      if (!node.isFile) {
        return (
          <React.Fragment key={`${depth}-${node.name}`}>
            <div className="tree-item folder" style={{ paddingLeft: `${depth * 12 + 12}px` }} onClick={() => toggleFolder(node.folderPath!)}>
              <div className="tree-item-left" title={node.folderPath!}>
                {isExpanded ? <ChevronDown size={14} className="tree-item-icon" /> : <ChevronRight size={14} className="tree-item-icon" />}
                <Folder size={14} className="tree-item-icon" />
                <span className="tree-item-name">{node.name}</span>
              </div>
              <button 
                className="item-action-btn add" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const addFolderFiles = (n: TreeNode) => {
                    if (n.isFile) {
                      if (!activeFiles.includes(n.path!)) {
                        sendHiddenCommand(`/add ${n.path}`);
                      }
                    } else {
                      Object.values(n.children).forEach(addFolderFiles);
                    }
                  };
                  addFolderFiles(node);
                }} 
                title="Add folder to context"
              >
                <Plus size={14} />
              </button>
            </div>
            {isExpanded && renderExplorerTree(node.children, depth + 1)}
          </React.Fragment>
        );
      }

      const fileIndex = treeVisibleFiles.indexOf(node.path!);
      const isSelected = query.trim() !== '' && fileIndex === selectedIndex;

      return (
        <div key={node.path} className={`tree-item file ${isSelected ? 'selected' : ''} ${isAdded ? 'in-context' : ''}`} style={{ paddingLeft: `${depth * 12 + 34}px` }} onClick={() => openFile(node.path!)} onMouseEnter={() => { if (fileIndex >= 0) setSelectedIndex(fileIndex); }}>
          <div className="tree-item-left" title={node.path!}>
            <FileCode2 size={14} className="tree-item-icon file-icon" />
            <span className="tree-item-name">{node.name}</span>
          </div>
          {!isAdded ? (
            <button className="item-action-btn add" onClick={(e) => { e.stopPropagation(); handleSelect(node.path!); }} title="Add to Context">
              <Plus size={14} />
            </button>
          ) : (
            <button className="item-action-btn added" onClick={(e) => { e.stopPropagation(); sendHiddenCommand(`/drop ${node.path}`); }} title="Remove from Context"><Check size={14} /></button>
          )}
        </div>
      );
    });
  };

  const renderSearchResults = () => {
    if (fuzzyResults.length === 0) return <div className="empty-state">No files found.</div>;
    return fuzzyResults.map((path, i) => {
      const isAdded = activeFiles.includes(path);
      const parts = path.replace(/\\/g, '/').split('/');
      const name = parts.pop();
      const folder = parts.join('/');

      return (
        <div key={path} className={`tree-item file search-result ${i === selectedIndex && query.trim() !== '' ? 'selected' : ''} ${isAdded ? 'in-context' : ''}`} onClick={() => openFile(path)} onMouseEnter={() => setSelectedIndex(i)}>
          <div className="tree-item-left" title={path}>
            <FileCode2 size={14} className="tree-item-icon file-icon" />
            <div className="search-result-text">
              <span className="tree-item-name">{name}</span>
              {folder && <span className="tree-item-folder">{folder}</span>}
            </div>
          </div>
          {!isAdded ? (
            <button className="item-action-btn add" onClick={(e) => { e.stopPropagation(); handleSelect(path); }}><Plus size={14} /></button>
          ) : (
            <button className="item-action-btn added" onClick={(e) => { e.stopPropagation(); sendHiddenCommand(`/drop ${path}`); }} title="Remove from Context"><Check size={14} /></button>
          )}
        </div>
      );
    });
  };

  const renderContextTree = (nodes: Record<string, TreeNode>, depth = 0) => {
    const sortedNodes = Object.values(nodes).sort((a, b) => {
      if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
      return a.isFile ? 1 : -1;
    });

    return sortedNodes.map((node) => {
      const isExpanded = !collapsedContextFolders.has(node.folderPath || '');

      if (!node.isFile) {
        return (
          <React.Fragment key={`ctx-${depth}-${node.name}`}>
            <div className="tree-item folder" style={{ paddingLeft: `${depth * 12 + 12}px` }} onClick={() => toggleContextFolder(node.folderPath!)}>
              <div className="tree-item-left" title={node.folderPath!}>
                {isExpanded ? <ChevronDown size={14} className="tree-item-icon" /> : <ChevronRight size={14} className="tree-item-icon" />}
                <Folder size={14} className="tree-item-icon" />
                <span className="tree-item-name">{node.name}</span>
              </div>
              <button 
                className="item-action-btn remove" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const removeFolderFiles = (n: TreeNode) => {
                    if (n.isFile) sendHiddenCommand(`/drop ${n.path}`);
                    else Object.values(n.children).forEach(removeFolderFiles);
                  };
                  removeFolderFiles(node);
                }} 
                title="Remove folder from context"
              >
                <X size={14} />
              </button>
            </div>
            {isExpanded && renderContextTree(node.children, depth + 1)}
          </React.Fragment>
        );
      }

      return (
        <div key={`ctx-${node.path}`} className="tree-item file in-context" style={{ paddingLeft: `${depth * 12 + 34}px` }} onClick={() => openFile(node.path!)}>
          <div className="tree-item-left" title={node.path!}>
            <FileCode2 size={14} className="tree-item-icon file-icon" />
            <span className="tree-item-name">{node.name}</span>
          </div>
          <button className="item-action-btn remove" onClick={(e) => { e.stopPropagation(); sendHiddenCommand(`/drop ${node.path}`); }} title="Remove from Context">
            <X size={14} />
          </button>
        </div>
      );
    });
  };

  return (
    <aside className="sidebar-panel sidebar" style={{ width: sidebarWidth, marginLeft: sidebarVisible ? 0 : -sidebarWidth, transition: isResizing ? 'none' : 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>

      {/* WORKSPACE SECTION */}
      <div className={`sidebar-section workspace-section ${workspaceCollapsed ? 'collapsed' : ''}`} style={{ flex: workspaceCollapsed ? undefined : `${verticalRatio} 1 0px` }}>
        <div className="sidebar-section-header" onClick={() => setWorkspaceCollapsed(!workspaceCollapsed)}>
          <div className="sidebar-section-left">
            {workspaceCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span className="sidebar-section-title truncate" title={workspace || "Workspace"}>
              {workspace ? workspace.split(/[/\\]/).filter(Boolean).pop() : "Workspace"}
            </span>
          </div>
          {workspace && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                className="icon-btn-small" 
                onClick={(e) => { e.stopPropagation(); setWorkspaceViewMode(v => v === 'flat' ? 'tree' : 'flat'); }} 
                title={`Switch to ${workspaceViewMode === 'flat' ? 'tree' : 'flat'} view`}
              >
                {workspaceViewMode === 'flat' ? <ListTree size={16} /> : <List size={16} />}
              </button>
            </div>
          )}
        </div>
        
        {!workspaceCollapsed && (
          workspace ? (
            <>
              <div className="workspace-search-container">
                <div className="workspace-search">
                  <Search size={14} className="search-icon" />
                  <input 
                    type="text" placeholder="Search files..." value={query}
                    onFocus={() => { if (fuzzyResults.length === 0) searchFiles(query); }}
                    onChange={(e) => { setQuery(e.target.value); searchFiles(e.target.value); }}
                    onKeyDown={(e) => {
                      if (query.trim() === '') return;
                      const list = workspaceViewMode === 'flat' ? fuzzyResults : treeVisibleFiles;
                      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, list.length - 1)); }
                      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
                      else if (e.key === "Enter" && list[selectedIndex]) { e.preventDefault(); handleSelect(list[selectedIndex]); }
                    }}
                  />
                  {query && <X size={14} className="clear-icon" onClick={() => { setQuery(''); searchFiles(''); }} />}
                </div>
              </div>
              <div className="scrollable-list">
                {workspaceViewMode === 'flat' ? renderSearchResults() : (explorerTree ? renderExplorerTree(explorerTree) : null)}
              </div>
            </>
          ) : (
            <div className="empty-state">No workspace opened</div>
          )
        )}
      </div>

      {!workspaceCollapsed && !contextCollapsed && (
        <div className={`sidebar-vertical-resize-handle ${isResizingVertical ? "is-resizing" : ""}`} onMouseDown={(e) => { e.preventDefault(); setIsResizingVertical(true); }} />
      )}

      {/* CONTEXT SECTION */}
      <div className={`sidebar-section context-section ${contextCollapsed ? 'collapsed' : ''}`} style={{ flex: contextCollapsed ? undefined : `${1 - verticalRatio} 1 0px` }}>
        <div className="sidebar-section-header" onClick={() => setContextCollapsed(!contextCollapsed)}>
          <div className="sidebar-section-left">
            {contextCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span className="sidebar-section-title">Context ({activeFiles.length})</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              className="icon-btn-small" 
              onClick={(e) => { e.stopPropagation(); setViewMode(v => v === 'flat' ? 'tree' : 'flat'); }} 
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
                [...activeFiles].sort((a, b) => {
                  const nameA = a.replace(/\\/g, '/').split('/').pop() || '';
                  const nameB = b.replace(/\\/g, '/').split('/').pop() || '';
                  return nameA.localeCompare(nameB);
                }).map((f, i) => {
                  const parts = f.replace(/\\/g, '/').split('/');
                  const name = parts.pop();
                  const folder = parts.join('/');
                  return (
                    <div key={i} className="tree-item file in-context" style={{ paddingLeft: '16px' }} onClick={() => openFile(f)}>
                      <div className="tree-item-left" title={f}>
                        <FileCode2 size={14} className="tree-item-icon file-icon" />
                        <div className="search-result-text">
                          <span className="tree-item-name">{name}</span>
                          {folder && <span className="tree-item-folder">{folder}</span>}
                        </div>
                      </div>
                      <button className="item-action-btn remove" onClick={(e) => { e.stopPropagation(); sendHiddenCommand(`/drop ${f}`); }} title="Remove from context">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })
              ) : (
                contextTree && renderContextTree(contextTree)
              )}
            </div>
            
            <div className="context-actions">
              {activeFiles.length > 0 && (
                <button className={`context-action-btn ${isCopied ? 'success' : ''}`} onClick={handleCopyFiles} title="Copy context to clipboard">
                  {isCopied ? <Check size={14} /> : <Copy size={14} />} {isCopied ? 'Copied!' : 'Copy Files'}
                </button>
              )}
              <button className="context-action-btn" onClick={() => { sendHiddenCommand(`/reset`); setChat([]); setQuery(''); searchFiles(''); }} title="Clear all context files">
                <RefreshCcw size={14} /> Reset
              </button>
            </div>
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

      <div className={`sidebar-resizer sidebar-resizer-left ${isResizing ? "is-resizing" : ""}`} onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} />
    </aside>
  );
};
