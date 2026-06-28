import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "../../context/AppContext";
import { RefreshCcw, ChevronDown } from "lucide-react";
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
  const { rightSidebarVisible, workspace, lastSessionUpdate } = useApp();
  const [sessions, setSessions] = useState<SessionNode[]>([]);
  const [error, setError] = useState("");
  const [expandedMsgKey, setExpandedMsgKey] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 200 && newWidth <= 800) {
        setWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleMsgClick = (key: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return; // Do not toggle if the user is selecting text
    }
    setExpandedMsgKey(prev => prev === key ? null : key);
  };

  useEffect(() => {

    if (rightSidebarVisible && workspace) {
      fetchHistory();
    } else {
      setSessions([]);
    }
  }, [workspace, rightSidebarVisible, lastSessionUpdate]);

  async function fetchHistory() {
    if (!workspace) return;
    try {
      setError("");
      const result = await invoke<SessionNode[]>("list_workspace_files", { workspace });
      setSessions(result);
      setExpandedSessionId(prev => {
        if (prev && result.some(s => s.id === prev)) return prev;
        return result.length > 0 ? result[0].id : null;
      });
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
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      
      if (sessionDay.getTime() === today.getTime()) {
        return `Today, ${timeStr}`;
      } else if (sessionDay.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeStr}`;
      }
      
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

  function formatCost(cost: number) {
    if (cost < 0.01) return "<$0.01";
    return `$${cost.toFixed(2)}`;
  }

  if (!rightSidebarVisible) return null;

  return (
    <div className="sidebar-panel right-sidebar" style={{ width: `${width}px` }}>
      <div className={`sidebar-resizer sidebar-resizer-right ${isResizing ? "is-resizing" : ""}`} onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} />
      <div className="sidebar-section-header non-clickable right-sidebar-header">
        <div className="sidebar-section-left">
          <h2 className="sidebar-section-title">Chat History</h2>
        </div>
        {workspace && (
          <button 
            className="refresh-button icon-btn-small" 
            onClick={fetchHistory}
            title="Refresh History"
          >
            <RefreshCcw size={14} />
          </button>
        )}
      </div>
      
      <div className="right-sidebar-content">
        {error && <div className="error-msg">{error}</div>}

        {sessions.length === 0 && !error && workspace && (
          <div className="empty-state">
            <div style={{ fontSize: '32px', opacity: 0.5, marginBottom: '12px' }}>📭</div>
            <p style={{ margin: 0 }}>No chat history found</p>
          </div>
        )}

        <div className="session-list">
          {sessions.map((session, sIdx) => {
            const fileContext = new Set<string>();
            const displayMessages: MessageNode[] = [];
            
            session.messages.forEach(msg => {
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

            const lastAssistantMsg = session.messages.slice().reverse().find(m => m.role.toLowerCase() === "assistant" && m.session_cost !== undefined);
            const sessionCost = lastAssistantMsg?.session_cost;

            return (
            <details 
              key={session.id} 
              className="session-item" 
              open={expandedSessionId === session.id}
            >
              <summary 
                className="session-summary"
                onClick={(e) => {
                  e.preventDefault();
                  setExpandedSessionId(expandedSessionId === session.id ? null : session.id);
                }}
              >
                <div className="session-info">
                  <span className="session-date">{formatSessionDate(session.id)}</span>
                  <span className="message-count">{displayMessages.length + (fileContextArray.length > 0 ? 1 : 0)} msgs</span>
                  {sessionCost !== undefined && sessionCost > 0 && (
                    <span className="session-cost" title={`Session Cost: $${sessionCost.toFixed(6)}`}>
                      {formatCost(sessionCost)}
                    </span>
                  )}
                </div>
                <div className="chevron">
                  <ChevronDown size={14} />
                </div>
              </summary>
              <div className="message-list">
                {fileContextArray.length > 0 && (
                  <div 
                    className={`message-item role-system ${expandedMsgKey === `${session.id}-fc` ? 'expanded' : ''}`}
                    onClick={() => handleMsgClick(`${session.id}-fc`)}
                  >
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
                  const msgKey = `${session.id}-${idx}`;
                  const isExpanded = expandedMsgKey === msgKey;
                  return (
                    <div 
                      key={idx} 
                      className={`message-item role-${msg.role.toLowerCase()} ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => handleMsgClick(msgKey)}
                    >
                      <div className="message-header">
                        <span className="message-role">
                          {msg.role}
                        </span>
                        <div className="header-right">
                          {msgCost !== undefined && msgCost > 0 && (
                            <span className="header-cost" title={`Cost: $${msgCost.toFixed(6)}`}>
                              {formatCost(msgCost)}
                            </span>
                          )}
                          <span className="message-time" title={msg.timestamp}>{formatMessageTime(msg.timestamp)}</span>
                        </div>
                      </div>
                      
                      {msg.content && (
                        <div className="message-content">
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
