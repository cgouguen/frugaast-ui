import React, { useState, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import { open } from "@tauri-apps/plugin-dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FolderOpen, Send, Square, Terminal, FileCode2, Sparkles, Hash } from "lucide-react";
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
  
  // Context & Approvals
  const [activeFiles, setActiveFiles] = useState([]);
  const [stats, setStats] = useState({ tokens: 0, cost: 0, session_cost: 0 });
  const [approvalReq, setApprovalReq] = useState(null);
  
  // Autocomplete
  const [autoOptions, setAutoOptions] = useState([]);
  const [autoIndex, setAutoIndex] = useState(0);

  const wsRef = useRef(null);
  const childRef = useRef(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // --- 1. INITIALIZATION & WEBSOCKET ---
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
        setStatus("Connecting to WebSocket...");
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
        setStatus("Disconnected from server. Retrying in 3s...");
        setTimeout(connectWebSocket, 3000); // Basic auto-reconnect
      };
    }

    startBackendAndConnect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (childRef.current) childRef.current.kill();
    };
  }, []);

  // Smart Auto-scroll: Only scroll to bottom when chat updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // --- 2. SERVER EVENT HANDLER ---
  function handleServerEvent(data) {
    switch (data.type) {
      case "CoreContextUpdated":
        setActiveFiles(data.payload.active_files);
        break;
      case "ContextStatsUpdated":
        setStats(data.payload);
        break;
      case "AutocompleteOptions":
        setAutoOptions(data.payload.options);
        setAutoIndex(0);
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
          
          // Safeguard against undefined chunks from backend serialization issues
          const chunk = data.payload?.chunk || "";

          if (lastMsg && lastMsg.role === "assistant" && !lastMsg.isComplete) {
            // ✅ CORRECT: Replace the entire object instead of mutating it
            newChat[newChat.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + chunk
            };
          } else {
            // Push a new safe object
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
            // ✅ CORRECT: Replace object instead of mutating
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
      default:
        break;
    }
  }

  // --- 3. ACTIONS ---
  async function handleOpenFolder() {
    try {
      const selectedPath = await open({ directory: true, multiple: false });
      if (selectedPath && wsRef.current) {
        setWorkspace(selectedPath);
        wsRef.current.send(JSON.stringify({ command: "init_workspace", path: selectedPath }));
      }
    } catch (err) {
      console.error("Failed to open dialog:", err);
    }
  }

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || isGenerating) return;

    setChat((prev) => [...prev, { role: "user", content: input.trim() }]);
    wsRef.current.send(JSON.stringify({ command: "chat", input: input.trim(), mode }));
    
    setInput("");
    setAutoOptions([]);
    setIsGenerating(true);
    setStatus("Thinking...");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleCancel = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ command: "cancel" }));
      setIsGenerating(false);
      setStatus("Cancelled");
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

  // --- 4. INPUT & AUTOCOMPLETE HANDLERS ---
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (wsRef.current && val.trim()) {
      wsRef.current.send(JSON.stringify({ command: "autocomplete", input: val }));
    } else {
      setAutoOptions([]);
    }
  };

  const applyAutocomplete = (selected) => {
    let newVal = input;
    if (input.startsWith("/") && !input.includes(" ")) {
      newVal = selected + " ";
    } else if (input.startsWith("/add ") || input.startsWith("/drop ")) {
      const parts = input.split(" ");
      parts[parts.length - 1] = selected;
      newVal = parts.join(" ") + " ";
    } else {
      const match = input.match(/`?[a-zA-Z0-9_]*$/);
      if (match) {
        newVal = input.slice(0, match.index) + "`" + selected + "` ";
      } else {
        newVal = input + selected + " ";
      }
    }
    setInput(newVal);
    setAutoOptions([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    // Autocomplete Navigation
    if (autoOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutoIndex((prev) => (prev + 1) % autoOptions.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutoIndex((prev) => (prev === 0 ? autoOptions.length - 1 : prev - 1));
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyAutocomplete(autoOptions[autoIndex]);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setAutoOptions([]);
        return;
      }
    } 
    
    // Message Submission
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-container">
      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="brand">
          <Sparkles size={20} color="var(--accent-primary)" />
          Frugaast
        </div>
        
        <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot" />
          {isConnected ? "Core Connected" : "Disconnected"}
        </div>
        
        <button className="btn-outline" onClick={handleOpenFolder} disabled={!isConnected || isGenerating}>
          <FolderOpen size={16} />
          Open Workspace
        </button>
        
        {workspace && (
          <div className="workspace-path" title={workspace}>
            {workspace.split('/').pop() || workspace}
          </div>
        )}
        
        <hr style={{ borderColor: 'var(--border-color)' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="section-title">Context Files ({activeFiles.length})</div>
          <ul className="context-list">
            {activeFiles.length === 0 ? (
              <li style={{ fontSize: 12, color: 'var(--text-muted)' }}>No files in context. Try /add</li>
            ) : (
              activeFiles.map((f, i) => (
                <li key={i} className="context-item">
                  <FileCode2 size={14} color="var(--accent-primary)" />
                  {f}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="stats-panel">
          <div>Tokens: {stats.tokens.toLocaleString()}</div>
          <div>Context Cost: ${stats.cost.toFixed(4)}</div>
          <div className="cost">Session: ${stats.session_cost.toFixed(4)}</div>
        </div>
      </aside>

      {/* --- MAIN CHAT --- */}
      <main className="main-content">
        <div className="chat-history">
          {chat.length === 0 && (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)", marginTop: "20vh" }}>
              <Terminal size={48} opacity={0.2} style={{ marginBottom: 16 }} />
              <h2>How can I help you code today?</h2>
              <p style={{ marginTop: 8, fontSize: 14 }}>Select a workspace and type a prompt, or use <code>/add</code> to include files.</p>
            </div>
          )}

          {chat.map((msg, i) => (
            <div key={i} className={`message-wrapper ${msg.role}`}>
              <span className="message-sender">{msg.role}</span>
              <div className="message-bubble">
                {msg.role === "assistant" ? (
                  // ✅ FIX: Removed className from ReactMarkdown, wrapped in a div instead
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* --- INPUT AREA --- */}
        <div className="input-section">
          <div className="input-container">
            
            {/* Autocomplete Popup */}
            {autoOptions.length > 0 && (
              <div className="autocomplete-menu">
                <div className="autocomplete-header">
                  [↑/↓] Navigate • [Enter/Tab] Select • [Esc] Cancel
                </div>
                {autoOptions.map((opt, i) => (
                  <div 
                    key={opt} 
                    className={`autocomplete-item ${i === autoIndex ? "active" : ""}`}
                    onMouseEnter={() => setAutoIndex(i)} 
                    onClick={() => applyAutocomplete(opt)}
                  >
                    <Hash size={14} /> {opt}
                  </div>
                ))}
              </div>
            )}

            <select className="mode-select" value={mode} onChange={(e) => setMode(e.target.value)} disabled={isGenerating}>
              <option value="code">CODE</option>
              <option value="ask">ASK</option>
            </select>
            
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Message Frugaast... (Shift+Enter for newline)" : "Waiting for backend..."}
              disabled={!isConnected || approvalReq !== null || isGenerating}
              autoFocus
              rows={1}
            />

            {isGenerating ? (
              <button type="button" className="btn-icon stop" onClick={handleCancel} title="Stop Generation">
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button type="button" className="btn-icon" onClick={sendMessage} disabled={!isConnected || !input.trim()} title="Send Message">
                <Send size={16} style={{ marginLeft: 2 }} />
              </button>
            )}
          </div>
          
          <div className="status-bar">
            <span>{status}</span>
            <span>{mode.toUpperCase()} MODE</span>
          </div>
        </div>
      </main>

      {/* --- APPROVAL MODAL --- */}
      {approvalReq && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>File Access Request</h3>
            <p>The assistant is requesting to read the following files to gather context:</p>
            <pre>{approvalReq.files.join("\n")}</pre>
            <div className="modal-actions">
              <button className="btn-deny" onClick={() => handleApproval(false)}>Deny</button>
              <button className="btn-allow" onClick={() => handleApproval(true)}>Allow Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}