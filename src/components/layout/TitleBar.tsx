import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import "./TitleBar.css";

const appWindow = getCurrentWindow();

export const TitleBar = () => {
  return (
    <div 
      className="titlebar" 
      data-tauri-drag-region
      onDoubleClick={() => appWindow.toggleMaximize()}
    >
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
