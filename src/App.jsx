import React, { useState, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import { open } from "@tauri-apps/plugin-dialog";
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
  
  // Chat & Input
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("code");
  const [maxMapTokens, setMaxMapTokens] = useState(4096);
  
  // Context & Approvals
  const [activeFiles, setActiveFiles] = useState([]);
  const [stats, setStats] = useState({ tokens: 0, cost: 0, session_cost: 0 });
  const [approvalReq, setApprovalReq] = useState(null);

  // Fuzzy Search
  const [showFuzzySearch, setShowFuzzySearch] = useState(false);
  const [fuzzyQuery, setFuzzyQuery] = useState("");
  const [fuzzyResults, setFuzzyResults] = useState([]);
  const [fuzzySelectedIndex, setFuzzySelectedIndex] = useState(0);

  const wsRef = useRef(null);
  const childRef = useRef(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // --- INITIALIZATION & WEBSOCKET ---
  useEffect(() => {
    async function startBackendAndConnect() {
      try {
        if (import.meta.env.DEV) {
          console.log("DEV MODE: Assuming Python is running manually on port 8002...");
          setTimeout(connectWebSocket, 500);
          return;
        } else {
          console.log("Starting PROD sidecar...");
          const command = Command.sidecar("binaries/server");
          command.on('error', err => console.error(`[PYTHON] Error: "${err}"`));
          const child = await command.spawn();
          childRef.current = child;
        }
        setStatus("Connecting to core...");
        setTimeout(connectWebSocket, 1000);
      } catch (err) {
        console.error("Failed to start backend:", err);
        setStatus(`Error: ${err}`);
      }
    }

    function connectWebSocket() {
      const ws = new WebSocket("ws://127.0.0.1:8002/ws/chat");
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setStatus("Ready");
      };

      ws.onmessage = (event) => handleServerEvent(JSON.parse(event.data));

      ws.onclose = () => {
        setIsConnected(false);
        setStatus("Disconnected. Retrying...");
        setTimeout(connectWebSocket, 3000);
      };
    }

    startBackendAndConnect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (childRef.current) childRef.current.kill();
    };
  }, []);

  // Scroll to bottom dynamically
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  // --- SERVER EVENT HANDLER ---
  function handleServerEvent(data) {
    switch (data.type) {
      case "CoreContextUpdated":
        setActiveFiles(data.payload.active_files);
        break;
      case "ContextStatsUpdated":
        setStats(data.payload);
        break;
      case "CoreAgenticTaskProgress":
        setStatus(data.payload.message);
        break;
      case "SystemMessage":
        setChat((prev) => [...prev, { role: "system", content: data.payload.message }]);
        setIsGenerating(false);
        setStatus("Ready");
        break;
      case "CoreLLMChunkReceived":
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
        break;
      case "CoreLLMResponseComplete":
        setChat((prev) => {
          const newChat = [...prev];
          const lastMsg = newChat[newChat.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            newChat[newChat.length - 1] = { ...lastMsg, isComplete: true };
          }
          return newChat;
        });
        setIsGenerating(false);
        setStatus("Ready");
        setTimeout(() => textareaRef.current?.focus(), 100);
        break;
      case "CoreUserFileApprovalRequested":
        setApprovalReq(data.payload);
        break;
      case "FuzzySearchResults":
        setFuzzyResults(data.payload.files || []);
        setFuzzySelectedIndex(0);
        break;
      default:
        break;
    }
  }

  // --- GUI ACTIONS (Replaces Slash Commands) ---
  const sendHiddenCommand = (commandStr) => {
    if (!wsRef.current) return;
    const payload = { command: "chat", input: commandStr, mode: mode };
    if (mode === "repomap") payload.max_map_token = maxMapTokens;
    wsRef.current.send(JSON.stringify(payload));
  };

  const handleAddFileClick = () => {
    setShowFuzzySearch(true);
    setFuzzyQuery("");
    setFuzzyResults([]);
    setFuzzySelectedIndex(0);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ command: "fuzzy_search_files", query: "" }));
    }
  };

  const handleFuzzyQueryChange = (e) => {
    const q = e.target.value;
    setFuzzyQuery(q);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ command: "fuzzy_search_files", query: q }));
    }
  };

  const handleSelectFuzzyFile = (file, closeMenu = true) => {
    sendHiddenCommand(`/add ${file}`);
    if (closeMenu) {
      setShowFuzzySearch(false);
    }
  };

  const handleRemoveFile = (file) => sendHiddenCommand(`/drop ${file}`);
  const handleResetSession = () => sendHiddenCommand(`/reset`);
  const handleCopyRepoMap = () => sendHiddenCommand(`/copy-repomap`);
  const handleCopyBuild = () => sendHiddenCommand(`/copy-build-message`);

  // --- CORE ACTIONS ---
  async function handleOpenWorkspace() {
    try {
      const selectedPath = await open({ directory: true, multiple: false });
      if (selectedPath && wsRef.current) {
        setWorkspace(selectedPath);
        wsRef.current.send(JSON.stringify({ command: "init_workspace", path: selectedPath }));
      }
    } catch (err) {
      console.error("Failed to open workspace:", err);
    }
  }

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || isGenerating) return;
    setChat((prev) => [...prev, { role: "user", content: input.trim() }]);
    const payload = { command: "chat", input: input.trim(), mode };
    if (mode === "repomap") payload.max_map_token = maxMapTokens;
    wsRef.current.send(JSON.stringify(payload));
    
    setInput("");
    setIsGenerating(true);
    setStatus("Generating response...");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleCancel = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ command: "cancel" }));
      setIsGenerating(false);
      setStatus("Operation cancelled");
    }
  };

  const handleApproval = (approved) => {
    if (!wsRef.current || !approvalReq) return;
    setChat((prev) => [...prev, { role: "user", content: approved ? "Approved file access." : "Denied file access." }]);
    wsRef.current.send(JSON.stringify({
      command: "approval_response",
      approval_id: approvalReq.approval_id,
      approved: approved,
    }));
    setApprovalReq(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-layout">
      {/* --- SIDEBAR --- */}
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
              <Plus size={14} />
            </button>
          </div>
          
          <div className="context-list">
            {activeFiles.length === 0 ? (
              <div className="empty-state">No files loaded.</div>
            ) : (
              activeFiles.map((f, i) => (
                <div key={i} className="context-item group">
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

      {/* --- MAIN CONTENT --- */}
      <main className="main-area">
        {/* TOP ACTION BAR */}
        <header className="top-bar">
          <div className="status-indicator">
            <Activity size={14} className={isGenerating ? "spin-pulse" : "static"} />
            <span className="status-text">{status}</span>
          </div>
          
          <div className="actions-menu">
            <button className="action-btn" onClick={handleCopyRepoMap} title="Copy Repo Map" disabled={!workspace}>
              <Map size={16} /> Map
            </button>
            <button className="action-btn" onClick={handleCopyBuild} title="Copy Build Messages">
              <Clipboard size={16} /> Data
            </button>
            <button className="action-btn danger-hover" onClick={handleResetSession} title="Reset Session Context">
              <RefreshCcw size={16} /> Reset
            </button>
          </div>
        </header>

        {/* CHAT HISTORY */}
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
                     <pre className="plain-text" style={{ 
                       whiteSpace: "pre-wrap", 
                       fontFamily: msg.content.includes("⋮") ? "monospace" : "inherit", 
                       margin: 0 
                     }}>
                       {msg.content}
                     </pre>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* INPUT SECTION */}
        <div className="input-wrapper">
          <div className="input-box">
            <div className={`mode-toggle ${mode === "repomap" ? "no-border" : ""}`}>
              <button 
                className={`mode-btn ${mode === "ask" ? "active" : ""}`} 
                onClick={() => setMode("ask")} title="Ask questions without editing"
              >
                <MessageSquare size={14} /> Ask
              </button>
              <button 
                className={`mode-btn ${mode === "code" ? "active" : ""}`} 
                onClick={() => setMode("code")} title="Allow the assistant to edit code"
              >
                <Code size={14} /> Code
              </button>
              <button 
                className={`mode-btn ${mode === "repomap" ? "active" : ""}`} 
                onClick={() => setMode("repomap")} title="Ask questions using the repository map"
              >
                <Map size={14} /> RepoMap
              </button>
            </div>

            {mode === "repomap" && (
              <div className="repomap-settings">
                <label htmlFor="maxMapTokens">Map Token Limit: <span>{maxMapTokens.toLocaleString()}</span></label>
                <div className="slider-container">
                  <input 
                    type="range" 
                    id="maxMapTokens" 
                    min="1024" 
                    max="16384" 
                    step="512" 
                    value={maxMapTokens} 
                    onChange={(e) => setMaxMapTokens(Number(e.target.value))}
                    className="styled-slider"
                    title="Set maximum tokens to extract from repository map"
                  />
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Message Frugaast... (Shift+Enter for new line)" : "Connecting..."}
              disabled={!isConnected || approvalReq !== null || isGenerating}
              autoFocus
              rows={1}
            />

            <div className="input-actions">
              {isGenerating ? (
                <button type="button" className="send-btn stop" onClick={handleCancel} title="Stop Generation">
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <button type="button" className="send-btn" onClick={sendMessage} disabled={!isConnected || !input.trim()} title="Send">
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- FUZZY SEARCH MODAL --- */}
      {showFuzzySearch && (
        <div className="modal-backdrop" onClick={() => setShowFuzzySearch(false)}>
          <div className="modal-panel fuzzy-panel" onClick={e => e.stopPropagation()}>
            <div className="fuzzy-header">
              <Search size={18} className="fuzzy-icon" />
              <input 
                type="text" 
                className="fuzzy-input" 
                placeholder="Search files by name..." 
                value={fuzzyQuery}
                onChange={handleFuzzyQueryChange}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowFuzzySearch(false);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setFuzzySelectedIndex((prev) => Math.min(prev + 1, Math.max(0, fuzzyResults.length - 1)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setFuzzySelectedIndex((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (fuzzyResults[fuzzySelectedIndex]) {
                      handleSelectFuzzyFile(fuzzyResults[fuzzySelectedIndex], true);
                    }
                  } else if (e.key === " ") {
                    e.preventDefault();
                    if (fuzzyResults[fuzzySelectedIndex]) {
                      handleSelectFuzzyFile(fuzzyResults[fuzzySelectedIndex], false);
                    }
                  }
                }}
                autoFocus
              />
              <button className="icon-btn-small" onClick={() => setShowFuzzySearch(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="fuzzy-results">
              {fuzzyResults.length === 0 ? (
                <div className="fuzzy-empty">No files found.</div>
              ) : (
                fuzzyResults.map((f, i) => (
                  <div 
                    key={i} 
                    className={`fuzzy-item ${i === fuzzySelectedIndex ? 'selected' : ''}`} 
                    onClick={() => handleSelectFuzzyFile(f)}
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

      {/* --- APPROVAL MODAL --- */}
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
