import React, { useState, useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { Minus, Square, X, PanelLeftClose, PanelLeftOpen, FolderOpen, ChevronRight, Settings, ChevronDown } from "lucide-react";
import { useApp } from "../../context/AppContext";
import "./TitleBar.css";

const appWindow = getCurrentWindow();

export const TitleBar = () => {
  const { sidebarVisible, setSidebarVisible, isConnected, isGenerating, workspace, setWorkspace, initWorkspace, setShowSettings } = useApp();
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
        setWorkspace(selectedPath as string);
        initWorkspace(selectedPath as string);
      }
    } catch (err) { console.error(err); }
  }

  function handleOpenRecent() {
    setIsWorkspaceMenuOpen(false);
    // TODO: Implement recent workspaces functionality
    console.log("Open recent workspace");
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
          <button className="titlebar-workspace-btn" onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)} disabled={!isConnected || isGenerating} title="Workspace Options">
            <FolderOpen size={14} />
            <span className="truncate">{workspace ? workspace.split(/[/\\]/).pop() : "Open Workspace"}</span>
            <ChevronDown size={14} className="titlebar-workspace-chevron" />
          </button>
          {isWorkspaceMenuOpen && (
            <div className="titlebar-workspace-menu">
              <div className="titlebar-workspace-menu-item" onClick={handleOpenWorkspace}>
                Open Workspace
              </div>
              <div className="titlebar-workspace-menu-item" onClick={handleOpenRecent}>
                Open Recent Workspace
              </div>
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
