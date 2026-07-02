import React, { useState, useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { Minus, Square, X, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, FolderOpen, ChevronRight, Settings, ChevronDown } from "lucide-react";
import { useApp } from "../../context/AppContext";
import "./TitleBar.css";

const appWindow = getCurrentWindow();

export const TitleBar = () => {
  const { sidebarVisible, setSidebarVisible, rightSidebarVisible, setRightSidebarVisible, isConnected, workspace, setWorkspace, initWorkspace, setShowSettings, config, updateConfig, setOpenWorkspaces } = useApp();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsWorkspaceMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleOpenWorkspace() {
    setIsWorkspaceMenuOpen(false);
    try {
      const selectedPath = await open({ directory: true, multiple: false });
      if (selectedPath) {
        const pathStr = selectedPath as string;
        setWorkspace(pathStr);
        initWorkspace(pathStr);
        
        setOpenWorkspaces(prev => prev.includes(pathStr) ? prev : [...prev, pathStr]);

        const currentRecent = Array.isArray(config?.recent_workspaces) ? config.recent_workspaces : [];
        const newRecent = [pathStr, ...currentRecent.filter((p: string) => p !== pathStr)].slice(0, 10);
        updateConfig("global", { recent_workspaces: newRecent });
      }
    } catch (err) { console.error(err); }
  }

  function handleSelectRecent(path: string) {
    setIsWorkspaceMenuOpen(false);
    setWorkspace(path);
    initWorkspace(path);
    
    setOpenWorkspaces(prev => prev.includes(path) ? prev : [...prev, path]);

    const currentRecent = Array.isArray(config?.recent_workspaces) ? config.recent_workspaces : [];
    const newRecent = [path, ...currentRecent.filter((p: string) => p !== path)].slice(0, 10);
    updateConfig("global", { recent_workspaces: newRecent });
  }

  return (
    <div 
      className="titlebar" 
      data-tauri-drag-region
      onDoubleClick={() => appWindow.toggleMaximize()}
    >
      <div 
        className="titlebar-actions" 
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="titlebar-button" onClick={() => setSidebarVisible(!sidebarVisible)} title="Toggle Sidebar">
          {sidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </div>
      </div>
      <div className="titlebar-drag-region" data-tauri-drag-region>
        <span className="titlebar-title" data-tauri-drag-region>Frugaast</span>
        <ChevronRight size={14} className="titlebar-separator" />
        <div className="titlebar-workspace-wrapper" ref={menuRef}>
          <button className="titlebar-workspace-btn" onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)} disabled={!isConnected} title="Workspace Options">
            <FolderOpen size={14} />
            <span className="truncate">{workspace ? workspace.split(/[/\\]/).pop() : "Open Workspace"}</span>
            <ChevronDown size={14} className="titlebar-workspace-chevron" />
          </button>
          {isWorkspaceMenuOpen && (
            <div className="titlebar-workspace-menu">
              <div className="titlebar-workspace-menu-item" onClick={handleOpenWorkspace}>
                <span>Open Workspace</span>
              </div>
              {(Array.isArray(config?.recent_workspaces) && config.recent_workspaces.length > 0) && (
                <div className="titlebar-workspace-menu-item submenu-trigger">
                  <span>Recent Workspaces</span>
                  <ChevronRight size={14} className="submenu-icon" />
                  <div className="titlebar-workspace-submenu">
                    {config.recent_workspaces.map((path: string) => (
                      <div key={path} className="titlebar-workspace-menu-item" onClick={() => handleSelectRecent(path)} title={path}>
                        <div className="recent-workspace-text">
                          <span className="recent-workspace-name truncate">{path.split(/[/\\]/).pop()}</span>
                          <span className="recent-workspace-path truncate">{path}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div 
        className="titlebar-actions" 
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="titlebar-button" onClick={() => setShowSettings(true)} title="Settings">
          <Settings size={14} />
        </div>
        <div className="titlebar-button" onClick={() => setRightSidebarVisible(!rightSidebarVisible)} title="Toggle Right Sidebar">
          {rightSidebarVisible ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </div>
        <div className="titlebar-button" onClick={() => appWindow.minimize()}>
          <Minus size={16} />
        </div>
        <div className="titlebar-button" onClick={() => appWindow.toggleMaximize()}>
          <Square size={14} />
        </div>
        <div className="titlebar-button close" onClick={() => appWindow.close()}>
          <X size={16} />
        </div>
      </div>
    </div>
  );
};
