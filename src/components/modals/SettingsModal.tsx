import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { 
  X, 
  Settings2, 
  Globe, 
  FolderDot, 
  Type,
  Info
} from "lucide-react";
import "./SharedModal.css";
import "./SettingsModal.css";

// Utility to make camelCase keys look beautiful
const formatLabel = (key: string) => {
  const result = key.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
};

export const SettingsModal = () => {
  const { showSettings, setShowSettings, config, updateConfig } = useApp();
  
  // UI States
  const [activeScope, setActiveScope] = useState<"global" | "local">("global");
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (showSettings) {
      setLocalConfig(config || {});
      setIsAnimatingOut(false);
      setActiveScope("global"); // Reset to global view on open
    }
  }, [showSettings, config]);

  useEscapeKey(() => handleClose(), showSettings);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setShowSettings(false);
      setIsAnimatingOut(false);
    }, 250); // Matches CSS transition duration
  };

  if (!showSettings && !isAnimatingOut) return null;

  const handleChange = (key: string, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateConfig(activeScope, localConfig);
    handleClose();
  };

  const configKeys = Object.keys(localConfig);

  return (
    <div 
      className={`modal-backdrop settings-backdrop ${isAnimatingOut ? 'fade-out' : 'fade-in'}`} 
      onClick={handleClose}
    >
      <div 
        className={`unified-panel settings-panel ${isAnimatingOut ? 'slide-down' : 'slide-up'}`} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Using SharedModal classes */}
        <div className="unified-header">
          <Settings2 size={18} className="unified-icon" />
          <h3>Preferences</h3>
          <button className="icon-btn-small settings-close-btn" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>
        
        {/* Body - Using SharedModal classes */}
        <div className="unified-body settings-body-extended">
          
          {/* Scope Segmented Control */}
          <div className="scope-switcher">
            <button 
              className={`scope-tab ${activeScope === 'global' ? 'active' : ''}`}
              onClick={() => setActiveScope('global')}
            >
              <Globe size={14} />
              Global Settings
            </button>
            <button 
              className={`scope-tab ${activeScope === 'local' ? 'active' : ''}`}
              onClick={() => setActiveScope('local')}
            >
              <FolderDot size={14} />
              Workspace Overrides
            </button>
          </div>

          {/* Contextual Info Banner */}
          <div className="scope-info-banner">
            <Info size={14} className="info-icon" />
            <p>
              {activeScope === "global" 
                ? "These settings apply across all your workspaces by default." 
                : "Workspace settings override your global defaults for this specific project."}
            </p>
          </div>

          {/* Settings List */}
          {configKeys.length === 0 ? (
            <div className="settings-empty-state">
              <Settings2 size={32} className="empty-icon" />
              <p>No settings available right now.</p>
            </div>
          ) : (
            <div className="settings-list">
              {configKeys.map((key) => {
                const isBool = typeof localConfig[key] === 'boolean';
                return (
                  <div className="modern-setting-card" key={key}>
                    <div className="setting-info">
                      <span className="setting-label">{formatLabel(key)}</span>
                      <span className="setting-description">
                        {isBool ? "Toggle feature on or off" : "Enter a custom value"}
                      </span>
                    </div>
                    
                    <div className="setting-control">
                      {isBool ? (
                        <div 
                          className={`modern-toggle ${localConfig[key] ? 'active' : ''}`}
                          onClick={() => handleChange(key, !localConfig[key])}
                          role="switch"
                          aria-checked={localConfig[key]}
                        >
                          <div className="modern-toggle-thumb" />
                        </div>
                      ) : (
                        <div className="input-wrapper">
                          <Type size={14} className="input-icon" />
                          <input
                            className="modern-input"
                            type="text"
                            value={localConfig[key] || ""}
                            onChange={(e) => handleChange(key, e.target.value)}
                            placeholder={activeScope === 'local' ? "Override value..." : "Enter value..."}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Using SharedModal classes */}
        <div className="unified-footer">
          <button className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button className="btn-primary settings-save-btn" onClick={handleSave}>
            {activeScope === "global" ? (
              <><Globe size={14} /> Save Global</>
            ) : (
              <><FolderDot size={14} /> Save Overrides</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};