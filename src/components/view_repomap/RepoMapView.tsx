import React from "react";
import { useApp } from "../../context/AppContext";
import { Map, RefreshCcw } from "lucide-react";
import "./RepoMapView.css";

export const RepoMapView = () => {
  const { isConnected, isGenerating, isRepomapReq, maxMapTokens, setMaxMapTokens, fetchRepoMap, repomapContent } = useApp();

  return (
    <div className="repomap-main-view">
      <div className="repomap-header-controls">
        <div className="repomap-title">
          <Map size={20} className="brand-icon" /> Repository Map
        </div>
        <div className="repomap-controls-right">
          <div className="repomap-settings">
            <span className="stat-label">Tokens: {maxMapTokens}</span>
            <input 
              type="range" min="1024" max="16384" step="512" 
              value={maxMapTokens} onChange={(e) => setMaxMapTokens(Number(e.target.value))}
              className="styled-slider" title="Max tokens for Repo Map"
            />
          </div>
          <button className="btn-primary" onClick={fetchRepoMap} disabled={!isConnected || isGenerating}>
            <RefreshCcw size={14} className={isGenerating && isRepomapReq ? "spin-pulse" : ""} />
            Generate Map
          </button>
        </div>
      </div>
      <div className="repomap-content-area">
        {repomapContent ? (
          <pre className="repomap-code">{repomapContent}</pre>
        ) : (
          <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
            Click "Generate Map" to analyze your workspace architecture.
          </div>
        )}
      </div>
    </div>
  );
};
