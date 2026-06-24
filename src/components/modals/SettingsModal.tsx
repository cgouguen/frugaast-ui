import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { X, Settings2 } from "lucide-react";
import "./SharedModal.css";
import "./SettingsModal.css";

export const SettingsModal = () => {
  const { showSettings, setShowSettings, config, updateConfig } = useApp();
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (showSettings) {
      setLocalConfig(config || {});
    }
  }, [showSettings, config]);

  useEscapeKey(() => setShowSettings(false), showSettings);

  if (!showSettings) return null;

  const handleChange = (key: string, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (scope: "local" | "global") => {
    // Send updated config back
    updateConfig(scope, localConfig);
    setShowSettings(false);
  };

  return (
    <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
      <div className="modal-panel unified-panel" onClick={e => e.stopPropagation()}>
        <div className="unified-header">
          <Settings2 size={18} className="unified-icon" />
          <h3>Settings</h3>
          <button className="icon-btn-small" onClick={() => setShowSettings(false)}>
            <X size={16} />
          </button>
        </div>
        
        <div className="unified-body settings-body">
          {Object.keys(localConfig).map((key) => {
            const isBool = typeof localConfig[key] === 'boolean';
            return (
              <div className="settings-row" key={key}>
                <label>{key}</label>
                {isBool ? (
                  <input
                    type="checkbox"
                    checked={localConfig[key] || false}
                    onChange={(e) => handleChange(key, e.target.checked)}
                  />
                ) : (
                  <input
                    type="text"
                    value={localConfig[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
          {Object.keys(localConfig).length === 0 && (
            <div className="empty-state">No settings available.</div>
          )}
        </div>

        <div className="unified-footer">
          <button className="btn-secondary" onClick={() => handleSave("global")}>Save Global</button>
          <button className="btn-primary" onClick={() => handleSave("local")}>Save Workspace</button>
        </div>
      </div>
    </div>
  );
};
