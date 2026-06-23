import React, { useState, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import { open } from "@tauri-apps/plugin-dialog";
import { sendCommand, ServerEvent } from "./api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  FolderOpen, Send, Square, Terminal, FileCode2, 
  Sparkles, Plus, Trash2, RefreshCcw, Map, 
  Clipboard, Code, MessageSquare, Bot, User, 
  Settings2, Activity, Search, X
} from "lucide-react";
import "./App.css";

export default function App() {
  // Connection & Status
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("Booting backend...");
  const [workspace, setWorkspace] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Tabs & Views
  const [mainView, setMainView] = useState("chat"); // 'chat' or 'repomap'
  
  // Chat & Global Input
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("code");
  const [maxMapTokens, setMaxMapTokens] = useState(4096);
  const [repomapContent, setRepomapContent] = useState("");
  
  // Context & Stats
  const [activeFiles, setActiveFiles] = useState([]);
  const [stats, setStats] = useState({ tokens: 0, cost: 0, session_cost: 0 });
  const [approvalReq, setApprovalReq] = useState(null);

  // Fuzzy Search Modal
  const [showFuzzySearch, setShowFuzzySearch] = useState(false);
  const [fuzzyQuery, setFuzzyQuery] = useState("");
  const [fuzzyResults, setFuzzyResults] = useState([]);
  const [fuzzySelectedIndex, setFuzzySelectedIndex] = useState(0);

  const wsRef = useRef(null);
  const childRef = useRef(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const isRepomapReqRef = useRef(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    async function startBackendAndConnect() {
      try {
        if (import.meta.env.DEV) {
          setTimeout(connectWebSocket, 500);
          return;
        } else {
          const command = Command.sidecar("binaries/server");
          command.on('error', err => console.error(`[PYTHON] Error: "${err}"`));
          const child = await command.spawn();
          childRef.current = child;
        }
        setStatus("Connecting to core...");
        setTimeout(connectWebSocket, 1000);
      } catch (err) {
        setStatus(`Error: ${err}`);
      }
    }

    function connectWebSocket() {
      const ws = new WebSocket("ws://127.0.0.1:8002/ws/chat");
      wsRef.current = ws;
      ws.onopen = () => { setIsConnected(true); setStatus("Ready"); };
      ws.onmessage = (event) => handleServerEvent(JSON.parse(event.data));
      ws.onclose = () => { setIsConnected(false); setStatus("Disconnected. Retrying..."); setTimeout(connectWebSocket, 3000); };
    }

    startBackendAndConnect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (childRef.current) childRef.current.kill();
    };
  }, []);

  // Scroll logic
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  
  // Auto-resize input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  // --- SERVER EVENT HANDLER ---
  function handleServerEvent(data: ServerEvent) {
    switch (data.type) {
      case "CoreContextUpdated": setActiveFiles(data.payload.active_files); break;
      case "ContextStatsUpdated": setStats(data.payload); break;
      case "CoreAgenticTaskProgress": setStatus(data.payload.message); break;
      case "SystemMessage":
        if (isRepomapReqRef.current) {
          setRepomapContent(data.payload.message);
          setIsGenerating(false); setStatus("Ready");
        } else {
          setChat((prev) => [...prev, { role: "system", content: data.payload.message }]);
          setIsGenerating(false); setStatus("Ready");
        }
        break;
      case "CoreLLMChunkReceived":
        if (isRepomapReqRef.current) {
          setRepomapContent((prev) => prev + (data.payload?.chunk || ""));
        } else {
          setChat((prev) => {
            const newChat = [...prev];
            const lastMsg = newChat[newChat.length - 1];
            const chunk = data.payload?.chunk || "";
            if (lastMsg && lastMsg.role === "assistant" && !lastMsg.isComplete) {
              newChat[newChat.length - 1] = { ...lastMsg, content: lastMsg.content + chunk };
            } else {
              newChat.push({ role: "assistant", content: chunk, isComplete: false });
            }
            return newChat;
          });
        }
        break;
      case "CoreLLMResponseComplete":
        if (!isRepomapReqRef.current) {
          setChat((prev) => {
            const newChat = [...prev];
            const lastMsg = newChat[newChat.length - 1];
            if (lastMsg && lastMsg.role === "assistant") newChat[newChat.length - 1] = { ...lastMsg, isComplete: true };
            return newChat;
          });
        }
        setIsGenerating(false); setStatus("Ready");
        setTimeout(() => textareaRef.current?.focus(), 100);
        break;
      case "CoreUserFileApprovalRequested": setApprovalReq(data.payload); break;
      case "FuzzySearchResults":
        setFuzzyResults(data.payload.files || []);
        setFuzzySelectedIndex(0);
        break;
    }
  }

  // --- UI COMMAND ACTIONS ---
  const sendHiddenCommand = (cmd: string) => sendCommand(wsRef.current, { command: "chat", input: cmd, mode: "ask" });

  const handleAddFileClick = () => {
    setShowFuzzySearch(true); setFuzzyQuery(""); setFuzzyResults([]); setFuzzySelectedIndex(0);
    sendCommand(wsRef.current, { command: "fuzzy_search_files", query: "" });
  };
  
  const handleRemoveFile = (file) => sendHiddenCommand(`/drop ${file}`);
  const handleResetSession = () => sendHiddenCommand(`/reset`);
  const handleCopyRepoMap = () => sendHiddenCommand(`/copy-repomap`);
  const handleCopyBuild = () => sendHiddenCommand(`/copy-build-message`);

  async function handleOpenWorkspace() {
    try {
      const selectedPath = await open({ directory: true, multiple: false });
      if (selectedPath) {
        setWorkspace(selectedPath);
        sendCommand(wsRef.current, { command: "init_workspace", path: selectedPath as string });
      }
    } catch (err) { console.error(err); }
  }

  const fetchRepoMap = () => {
    if (isGenerating) return;
    isRepomapReqRef.current = true;
    setRepomapContent("");
    sendCommand(wsRef.current, { command: "chat", input: " ", mode: "repomap", max_map_tokens: maxMapTokens });
    setIsGenerating(true); setStatus("Generating RepoMap...");
  };

  const sendMessage = () => {
    if (!input.trim() || isGenerating) return;
    setMainView("chat"); // Auto-switch to chat view
    isRepomapReqRef.current = false;
    setChat((prev) => [...prev, { role: "user", content: input.trim() }]);
    sendCommand(wsRef.current, { command: "chat", input: input.trim(), mode: mode as "ask" | "code" });
    
    setInput(""); setIsGenerating(true); setStatus("Generating response...");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleCancel = () => {
    sendCommand(wsRef.current, { command: "cancel" });
    setIsGenerating(false); setStatus("Cancelled");
  };

  const handleApproval = (approved: boolean) => {
    if (!approvalReq) return;
    setChat((prev) => [...prev, { role: "user", content: approved ? "Approved file access." : "Denied file access." }]);
    sendCommand(wsRef.current, { command: "approval_response", approval_id: approvalReq.approval_id, approved });
    setApprovalReq(null);
  };

  return (
    <div className="app-layout">
      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <Sparkles size={18} className="brand-icon" />
            <span>Frugaast</span>
          </div>
          <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} title={isConnected ? "Connected" : "Disconnected"} />
        </div>
        
        <div className="workspace-section">
          <button className="workspace-btn" onClick={handleOpenWorkspace} disabled={!isConnected || isGenerating}>
            <FolderOpen size={16} />
            <span className="truncate">{workspace ? workspace.split(/[/\\]/).pop() : "Open Workspace"}</span>
          </button>
        </div>

        <div className="context-section">
          <div className="section-header">
            <span className="section-title">Context ({activeFiles.length})</span>
            <button className="icon-btn-small" onClick={handleAddFileClick} title="Add files to context" disabled={!isConnected || isGenerating}>
              <Plus size={16} />
            </button>
          </div>
          
          <div className="context-list">
            {activeFiles.length === 0 ? (
              <div className="empty-state">No files loaded.</div>
            ) : (
              activeFiles.map((f, i) => (
                <div key={i} className="context-item">
                  <div className="context-item-name truncate" title={f}>
                    <FileCode2 size={14} className="file-icon" />
                    {f.split(/[/\\]/).pop()}
                  </div>
                  <button className="remove-btn" onClick={() => handleRemoveFile(f)} title="Remove file">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <button className="reset-context-btn" onClick={handleResetSession} title="Clear all context files">
            <RefreshCcw size={14} /> Reset Context
          </button>
        </div>

        <div className="stats-card">
          <div className="stat-row">
            <span className="stat-label">Tokens</span>
            <span className="stat-value">{stats.tokens.toLocaleString()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Context</span>
            <span className="stat-value">${stats.cost.toFixed(4)}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-row highlight">
            <span className="stat-label">Session</span>
            <span className="stat-value">${stats.session_cost.toFixed(4)}</span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <main className="main-area">
        {/* TABS HEADER */}
        <header className="tabs-header">
          <div className="tabs-list">
            <button className={`tab-btn ${mainView === 'chat' ? 'active' : ''}`} onClick={() => setMainView('chat')}>
              <MessageSquare size={16} /> Chat
            </button>
            <button className={`tab-btn ${mainView === 'repomap' ? 'active' : ''}`} onClick={() => setMainView('repomap')}>
              <Map size={16} /> Repo Map
            </button>
          </div>
          
          <div className="header-actions">
            <div className="status-indicator">
              <Activity size={14} className={isGenerating ? "spin-pulse" : "static"} />
              <span className="status-text">{status}</span>
            </div>
            {mainView === 'chat' && (
              <button className="action-btn" onClick={handleCopyBuild} title="Copy Build Messages">
                <Clipboard size={14} /> Copy Data
              </button>
            )}
            {mainView === 'repomap' && (
              <button className="action-btn" onClick={handleCopyRepoMap} title="Copy Repo Map" disabled={!workspace}>
                <Clipboard size={14} /> Copy Map
              </button>
            )}
          </div>
        </header>

        {/* SCROLLABLE VIEW CONTENT */}
        <div className="view-content-wrapper">
          {mainView === "chat" ? (
            <div className="chat-scroll-area">
              {chat.length === 0 && (
                <div className="welcome-screen">
                  <div className="welcome-icon-wrapper">
                    <Terminal size={40} />
                  </div>
                  <h2>Ready to build.</h2>
                  <p>Add files to your context and start exploring your code.</p>
                </div>
              )}
              <div className="messages-container">
                {chat.map((msg, i) => (
                  <div key={i} className={`message-row ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === "assistant" ? <Bot size={18} /> : msg.role === "user" ? <User size={18} /> : <Settings2 size={18} />}
                    </div>
                    <div className="message-content">
                      {msg.role === "assistant" ? (
                        <div className="markdown-prose">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content.includes("⋮") && !msg.content.includes("```")
                              ? `\`\`\`text\n${msg.content}\n\`\`\``
                              : msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                         <p className="plain-text">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          ) : (
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
                    <RefreshCcw size={14} className={isGenerating && isRepomapReqRef.current ? "spin-pulse" : ""} />
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
          )}
        </div>

        {/* ================= OMNIPRESENT GLOBAL INPUT ================= */}
        <div className="global-input-wrapper">
          <div className="input-box">
            <div className="mode-toggle">
              <button className={`mode-btn ${mode === "ask" ? "active" : ""}`} onClick={() => setMode("ask")} disabled={isGenerating}>
                <MessageSquare size={14} /> Ask
              </button>
              <button className={`mode-btn ${mode === "code" ? "active" : ""}`} onClick={() => setMode("code")} disabled={isGenerating}>
                <Code size={14} /> Code
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={isConnected ? "Message Frugaast... (Shift+Enter for new line)" : "Connecting..."}
              disabled={!isConnected || approvalReq !== null || (isGenerating && isRepomapReqRef.current)}
              autoFocus
              rows={1}
            />

            <div className="input-actions">
              {isGenerating && !isRepomapReqRef.current ? (
                <button type="button" className="send-btn stop" onClick={handleCancel} title="Stop Generation">
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button type="button" className="send-btn" onClick={sendMessage} disabled={!isConnected || !input.trim()} title="Send">
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ================= MODALS ================= */}
      {/* Fuzzy Search */}
      {showFuzzySearch && (
        <div className="modal-backdrop" onClick={() => setShowFuzzySearch(false)}>
          <div className="modal-panel fuzzy-panel" onClick={e => e.stopPropagation()}>
            <div className="fuzzy-header">
              <Search size={18} className="fuzzy-icon" />
              <input 
                type="text" className="fuzzy-input" placeholder="Search files by name..." 
                value={fuzzyQuery} onChange={(e) => {
                  setFuzzyQuery(e.target.value);
                  sendCommand(wsRef.current, { command: "fuzzy_search_files", query: e.target.value });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowFuzzySearch(false);
                  else if (e.key === "ArrowDown") { e.preventDefault(); setFuzzySelectedIndex(p => Math.min(p + 1, Math.max(0, fuzzyResults.length - 1))); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setFuzzySelectedIndex(p => Math.max(p - 1, 0)); }
                  else if (e.key === "Enter" && fuzzyResults[fuzzySelectedIndex]) { e.preventDefault(); sendHiddenCommand(`/add ${fuzzyResults[fuzzySelectedIndex]}`); setShowFuzzySearch(false); }
                }}
                autoFocus
              />
              <button className="icon-btn-small" onClick={() => setShowFuzzySearch(false)}><X size={16} /></button>
            </div>
            <div className="fuzzy-results">
              {fuzzyResults.length === 0 ? <div className="fuzzy-empty">No files found.</div> : (
                fuzzyResults.map((f, i) => (
                  <div key={i} className={`fuzzy-item ${i === fuzzySelectedIndex ? 'selected' : ''}`} 
                    onClick={() => { sendHiddenCommand(`/add ${f}`); setShowFuzzySearch(false); }}
                    onMouseEnter={() => setFuzzySelectedIndex(i)}
                  >
                    <FileCode2 size={14} className="file-icon" />
                    <span className="truncate">{f}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Access Approval */}
      {approvalReq && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <div className="modal-header">
              <Settings2 size={20} className="modal-icon" />
              <h3>File Access Request</h3>
            </div>
            <p className="modal-desc">The assistant is requesting to read the following files to gather context:</p>
            <div className="modal-file-list">
              {approvalReq.files.map((f, i) => <div key={i} className="modal-file-item">{f}</div>)}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => handleApproval(false)}>Deny</button>
              <button className="btn-primary" onClick={() => handleApproval(true)}>Allow Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}