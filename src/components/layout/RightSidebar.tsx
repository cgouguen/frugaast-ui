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
  content?: string;
  model?: string;
  last_transaction_cost?: number;
  session_cost?: number;
  cost?: number;
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

  function formatSessionDate(id: string) {
    const match = id.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    if (match) {
      const [_, y, m, d, h, min, s] = match;
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s));
      return date.toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    }
    return id;
  }

  function formatMessageTime(ts: string) {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts; // Fallback if invalid
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch {
      return ts;
    }
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
          {sessions.map((session, sIdx) => {
            const fileContext = new Set<string>();
            const displayMessages: MessageNode[] = [];
            
            session.messages.forEach(msg => {
              if (msg.role === "user_full_prompt") return;
              
              if (msg.content) {
                const text = msg.content.trim();
                if (text.startsWith("/add ")) {
                  text.slice(5).split(/\s+/).forEach(f => { if (f) fileContext.add(f); });
                  return;
                } else if (text.startsWith("/drop ")) {
                  text.slice(6).split(/\s+/).forEach(f => { if (f) fileContext.delete(f); });
                  return;
                } else if (text === "/clear") {
                  fileContext.clear();
                  return;
                }
              }
              
              displayMessages.push(msg);
            });
            
            const fileContextArray = Array.from(fileContext);

            return (
            <details key={session.id} className="session-item" open={sessions.length === 1 || sIdx === 0}>
              <summary className="session-summary">
                <div className="session-info">
                  <span className="session-date">{formatSessionDate(session.id)}</span>
                  <span className="message-count">{displayMessages.length + (fileContextArray.length > 0 ? 1 : 0)} msgs</span>
                </div>
                <div className="chevron">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </summary>
              <div className="message-list">
                {fileContextArray.length > 0 && (
                  <div className="message-item role-system">
                    <div className="message-header">
                      <span className="message-role">File Context</span>
                    </div>
                    <div className="message-content">
                      {fileContextArray.join(", ")}
                    </div>
                  </div>
                )}
                {displayMessages.map((msg, idx) => {
                  const msgCost = msg.last_transaction_cost ?? msg.cost;
                  return (
                    <div key={idx} className={`message-item role-${msg.role.toLowerCase()}`}>
                      <div className="message-header">
                        <span className="message-role">{msg.role}</span>
                        <span className="message-time" title={msg.timestamp}>{formatMessageTime(msg.timestamp)}</span>
                      </div>
                      
                      {msg.content && (
                        <div className="message-content" title={msg.content}>
                          {msg.content.trim()}
                        </div>
                      )}
                      
                      <div className="message-footer">
                        <span className="message-type">{msg.msg_type}</span>
                        {msg.model && (
                          <span className="message-model" title={`Model: ${msg.model}`}>
                            {msg.model.split('/').pop()}
                          </span>
                        )}
                        {msgCost !== undefined && msgCost > 0 && (
                          <span className="message-cost" title={`Cost: $${msgCost.toFixed(6)}`}>
                            ${msgCost.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
            );
          })}
        </div>
      </div>
    </div>
  );
};
