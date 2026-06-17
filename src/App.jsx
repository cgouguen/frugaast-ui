import React, { useState, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import { open } from "@tauri-apps/plugin-dialog";

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("Booting backend...");
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("code"); // Default to code mode
  const [activeFiles, setActiveFiles] = useState([]);
  const [approvalReq, setApprovalReq] = useState(null);
  const [workspace, setWorkspace] = useState(null);

  const wsRef = useRef(null);
  const childRef = useRef(null);

  useEffect(() => {
    async function startBackendAndConnect() {
      try {
        let command;
        if (import.meta.env.DEV) {
          console.log("Starting DEV backend...");
          command = Command.create("run-python", ["../server.py"]);
        } else {
          console.log("Starting PROD sidecar...");
          command = Command.sidecar("binaries/server");
        }

        // Capture Python logs in the browser console for easy debugging
        command.on('error', error => console.error(`[PYTHON] Error: "${error}"`));
        command.stdout.on('data', line => console.log(`[PYTHON STDOUT]: ${line}`));
        command.stderr.on('data', line => console.error(`[PYTHON STDERR]: ${line}`));

        const child = await command.spawn();
        childRef.current = child;
        console.log("Python backend running on PID:", child.pid);
        setStatus("Connecting to WebSocket...");

        // Give FastAPI 1 second to start up
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

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerEvent(data);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatus("Disconnected from server");
      };
    }

    startBackendAndConnect();

    // CLEANUP: Close WS and kill the Python process when React unmounts or hot-reloads
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (childRef.current) {
        console.log("Killing Python process:", childRef.current.pid);
        childRef.current.kill();
      }
    };
  }, []);

  function handleServerEvent(data) {
    switch (data.type) {
      case "CoreContextUpdated":
        setActiveFiles(data.payload.active_files);
        break;

      case "CoreAgenticTaskProgress":
        setStatus(data.payload.message);
        break;

      case "SystemMessage":
        setChat((prev) => [...prev, { role: "system", content: data.payload.message }]);
        break;

      case "CoreLLMChunkReceived":
        setChat((prev) => {
          const newChat = [...prev];
          const lastMsg = newChat[newChat.length - 1];

          // Append to the open assistant message, or create a new one
          if (lastMsg && lastMsg.role === "assistant" && !lastMsg.isComplete) {
            lastMsg.content += data.payload.chunk;
          } else {
            newChat.push({ role: "assistant", content: data.payload.chunk, isComplete: false });
          }
          return newChat;
        });
        break;

      case "CoreLLMResponseComplete":
        setChat((prev) => {
          const newChat = [...prev];
          const lastMsg = newChat[newChat.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            lastMsg.isComplete = true; // Lock the bubble
          }
          return newChat;
        });
        setStatus("Ready");
        break;

      case "CoreUserFileApprovalRequested":
        setApprovalReq(data.payload);
        break;

      default:
        console.warn("Unknown event type:", data.type);
    }
  }

  // --- Folder Picker ---
  async function handleOpenFolder() {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Open Project Workspace",
      });

      if (selectedPath) {
        setWorkspace(selectedPath);
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            command: "init_workspace",
            path: selectedPath
          }));
        }
      }
    } catch (err) {
      console.error("Failed to open dialog:", err);
    }
  }

  // --- Chat Actions ---
  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current) return;

    setChat((prev) => [...prev, { role: "user", content: input }]);
    wsRef.current.send(JSON.stringify({ command: "chat", input, mode }));
    setInput("");
  };

  const handleApproval = (approved) => {
    if (!wsRef.current || !approvalReq) return;

    setChat((prev) => [...prev, { role: "user", content: approved ? "Yes" : "No" }]);
    
    wsRef.current.send(JSON.stringify({
      command: "approval_response",
      approval_id: approvalReq.approval_id,
      approved: approved,
    }));
    
    setApprovalReq(null);
  };

  // --- STYLES ---
  const styles = {
    container: { display: "flex", height: "100vh", fontFamily: "sans-serif", backgroundColor: "#1e1e1e", color: "#eee" },
    sidebar: { width: "260px", borderRight: "1px solid #333", padding: "15px", display: "flex", flexDirection: "column", backgroundColor: "#252526" },
    main: { flex: 1, display: "flex", flexDirection: "column" },
    chatBox: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" },
    bubble: (role) => ({
      padding: "12px 16px", borderRadius: "8px", maxWidth: "85%", whiteSpace: "pre-wrap", lineHeight: "1.4",
      backgroundColor: role === "user" ? "#2b5278" : role === "assistant" ? "#3c3c3c" : "transparent",
      color: role === "system" ? "#f39c12" : "#eee",
      alignSelf: role === "user" ? "flex-end" : "flex-start",
      border: role === "system" ? "1px solid #f39c12" : "none"
    }),
    inputArea: { display: "flex", padding: "15px", borderTop: "1px solid #333", gap: "10px", backgroundColor: "#252526" },
    input: { flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid #555", backgroundColor: "#3c3c3c", color: "white", fontSize: "14px" },
    button: { padding: "10px 15px", cursor: "pointer", border: "none", borderRadius: "6px", backgroundColor: "#0e639c", color: "white", fontWeight: "bold" },
    status: { padding: "6px 15px", backgroundColor: "#007acc", fontSize: "12px" },
    modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" },
    modal: { backgroundColor: "#252526", padding: "25px", borderRadius: "10px", textAlign: "center", border: "1px solid #444", boxShadow: "0 4px 15px rgba(0,0,0,0.5)" }
  };

  return (
    <div style={styles.container}>
      {/* LEFT SIDEBAR (Context Files) */}
      <div style={styles.sidebar}>
        <h2 style={{ marginTop: 0, marginBottom: "5px", color: "#ddd" }}>✨ Frugaast</h2>
        <p style={{ fontSize: "12px", color: isConnected ? "#4caf50" : "#f44336", margin: "0 0 20px 0" }}>
          {isConnected ? "🟢 Connected to Core" : "🔴 Disconnected"}
        </p>
        
        {/* Open Folder Action */}
        <button 
          onClick={handleOpenFolder} 
          style={{...styles.button, backgroundColor: "#333", border: "1px solid #555", width: "100%", marginBottom: "10px"}}
          disabled={!isConnected}
        >
          📁 Open Project Folder
        </button>
        
        <div style={{ fontSize: "11px", color: "#888", marginBottom: "20px", wordBreak: "break-all" }}>
          {workspace ? workspace : "No workspace selected"}
        </div>
        
        <hr style={{ borderColor: "#333", width: "100%", marginBottom: "15px" }} />
        
        <h4 style={{ margin: "0 0 10px 0", color: "#bbb" }}>Context Files</h4>
        <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "#aaa", margin: 0 }}>
          {activeFiles.length === 0 ? <li>No files active</li> : activeFiles.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>

      {/* MAIN CHAT AREA */}
      <div style={styles.main}>
        
        {/* Chat History */}
        <div style={styles.chatBox}>
          {chat.map((msg, i) => (
            <div key={i} style={styles.bubble(msg.role)}>
              <strong style={{ opacity: 0.7, fontSize: "12px", display: "block", marginBottom: "5px" }}>
                {msg.role.toUpperCase()}
              </strong>
              {msg.content}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={sendMessage} style={styles.inputArea}>
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value)} 
            style={{ padding: "0 10px", backgroundColor: "#333", color: "white", border: "1px solid #555", borderRadius: "6px" }}
          >
            <option value="code">CODE</option>
            <option value="ask">ASK</option>
          </select>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? "Type a prompt or /add file.py" : "Waiting for backend..."}
            disabled={!isConnected || approvalReq !== null}
          />
          <button type="submit" style={styles.button} disabled={!isConnected || !input.trim()}>
            Send
          </button>
        </form>

        {/* Task Status Bar */}
        <div style={styles.status}>{status}</div>
      </div>

      {/* APPROVAL MODAL */}
      {approvalReq && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginTop: 0 }}>AI Wants to Read Files</h3>
            <p style={{ color: "#ccc", marginBottom: "15px" }}>
              The assistant needs context from the following files:
            </p>
            <pre style={{ textAlign: "left", backgroundColor: "#1e1e1e", padding: "15px", borderRadius: "6px", overflowX: "auto", border: "1px solid #333" }}>
              {approvalReq.files.join("\n")}
            </pre>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
              <button style={{ ...styles.button, backgroundColor: "#4caf50", flex: 1 }} onClick={() => handleApproval(true)}>Allow</button>
              <button style={{ ...styles.button, backgroundColor: "#f44336", flex: 1 }} onClick={() => handleApproval(false)}>Deny</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}