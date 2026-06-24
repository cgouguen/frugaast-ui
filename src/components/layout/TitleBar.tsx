import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useApp } from "../../context/AppContext";
import "./TitleBar.css";

const appWindow = getCurrentWindow();

export const TitleBar = () => {
  const { sidebarVisible, setSidebarVisible } = useApp();

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
      </div>
      <div 
        className="titlebar-actions" 
        onDoubleClick={(e) => e.stopPropagation()}
      >
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
