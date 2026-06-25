import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "../../context/AppContext";
import "./RightSidebar.css";

interface MessageNode {
  filename: string;
  filepath: string;
  role: string;
  msg_type: string;
  timestamp: string;
}

interface SessionNode {
  id: string;
  messages: MessageNode[];
}

export const RightSidebar = () => {
  const { rightSidebarVisible, workspace } = useApp();
  const [sessions, setSessions] = useState<SessionNode[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (rightSidebarVisible && workspace) {
      fetchHistory();
    } else {
      setSessions([]);
    }
  }, [workspace, rightSidebarVisible]);

  async function fetchHistory() {
    if (!workspace) return;
    try {
      setError("");
      const result = await invoke<SessionNode[]>("list_workspace_files", { workspace });
      setSessions(result);
    } catch (err: any) {
      console.error("Failed to fetch LLM history:", err);
      setError(err.toString());
    }
  }

  function formatTimestamp(ts: string) {
    const match = ts.match(/(\d{8})_(\d{6})/);
    if (match) {
      const date = match[1];
      const time = match[2];
      const year = parseInt(date.slice(0, 4), 10);
      const month = parseInt(date.slice(4, 6), 10) - 1;
      const day = parseInt(date.slice(6, 8), 10);
      const hours = parseInt(time.slice(0, 2), 10);
      const minutes = parseInt(time.slice(2, 4), 10);
      const seconds = parseInt(time.slice(4, 6), 10);
      const d = new Date(year, month, day, hours, minutes, seconds);
      
      const formatted = d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      });
      return ts.replace(match[0], formatted);
    }
    return ts;
  }

  if (!rightSidebarVisible) return null;

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-header">
        <div className="header-title-row">
          <h2>Chat History</h2>
          {workspace && (
            <button 
              className="refresh-button" 
              onClick={fetchHistory}
              title="Refresh History"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
          )}
        </div>
        <p className="workspace-path" title={workspace || ""}>
          {workspace ? workspace : "No workspace selected"}
        </p>
      </div>
      
      <div className="right-sidebar-content">
        {error && <div className="error-msg">{error}</div>}

        {sessions.length === 0 && !error && workspace && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No chat history found</p>
          </div>
        )}

        <div className="session-list">
          {sessions.map((session, sIdx) => (
            <details key={session.id} className="session-item" open={sessions.length === 1 || sIdx === 0}>
              <summary className="session-summary">
                <div className="session-info">
                  <span className="session-date">{formatTimestamp(session.id)}</span>
                  <span className="message-count">{session.messages.length} msgs</span>
                </div>
                <div className="chevron">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </summary>
              <div className="message-list">
                {session.messages.map((msg, idx) => (
                  <div key={idx} className={`message-item role-${msg.role.toLowerCase()}`} title={msg.filepath}>
                    <div className="message-header">
                      <span className="message-role">{msg.role}</span>
                      <span className="message-time">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <div className="message-body">
                      <span className="message-filename">{msg.filename}</span>
                      <span className="message-type">{msg.msg_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};
