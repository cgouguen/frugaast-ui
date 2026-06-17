import React, { useState, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("Booting backend...");
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("ask");
  const [activeFiles, setActiveFiles] = useState([]);
  const [approvalReq, setApprovalReq] = useState(null);

  const wsRef = useRef(null);

  useEffect(() => {
    async function startBackendAndConnect() {
      try {
        let command;
        if (import.meta.env.DEV) {
          console.log("DEV MODE: Assuming Python is already running on port 8002...");
          setTimeout(connectWebSocket, 500);
          return; // Exit early, do not spawn!
        } else {
          console.log("Starting PROD sidecar...");
          command = Command.sidecar("binaries/server");
        }

        // --- NEW: Capture Python Logs ---
        command.on('close', data => console.log(`[PYTHON] Process exited with code ${data.code}`));
        command.on('error', error => console.error(`[PYTHON] Command failed: "${error}"`));
        command.stdout.on('data', line => console.log(`[PYTHON STDOUT]: ${line}`));
        command.stderr.on('data', line => console.error(`[PYTHON STDERR]: ${line}`));
        // ---------------------------------

        const child = await command.spawn();
        console.log("Python backend running on PID:", child.pid);
        setStatus("Connecting to WebSocket...");

        // Wait 2 seconds just in case it's a slow boot
        setTimeout(connectWebSocket, 2000);
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

    // Cleanup: close WebSocket when React unmounts
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
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

          // If the last message is an open assistant message, append to it
          if (lastMsg && lastMsg.role === "assistant" && !lastMsg.isComplete) {
            lastMsg.content += data.payload.chunk;
          } else {
            // Otherwise, start a new assistant message bubble
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
            lastMsg.isComplete = true;
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

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current) return;

    // Add user message to UI immediately
    setChat((prev) => [...prev, { role: "user", content: input }]);
    
    // Send to Python server
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

  // --- MINIMALIST INLINE STYLES ---
  const styles = {
    container: { display: "flex", height: "100vh", fontFamily: "sans-serif", backgroundColor: "#1e1e1e", color: "#eee" },
    sidebar: { width: "250px", borderRight: "1px solid #333", padding: "10px", display: "flex", flexDirection: "column" },
    main: { flex: 1, display: "flex", flexDirection: "column" },
    chatBox: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" },
    bubble: (role) => ({
      padding: "10px", borderRadius: "8px", maxWidth: "80%", whiteSpace: "pre-wrap",
      backgroundColor: role === "user" ? "#2b5278" : role === "assistant" ? "#3c3c3c" : "transparent",
      color: role === "system" ? "#f39c12" : "#eee",
      alignSelf: role === "user" ? "flex-end" : "flex-start",
      border: role === "system" ? "1px solid #f39c12" : "none"
    }),
    inputArea: { display: "flex", padding: "10px", borderTop: "1px solid #333", gap: "10px", backgroundColor: "#252526" },
    input: { flex: 1, padding: "10px", borderRadius: "4px", border: "1px solid #555", backgroundColor: "#3c3c3c", color: "white" },
    button: { padding: "10px 20px", cursor: "pointer", border: "none", borderRadius: "4px", backgroundColor: "#0e639c", color: "white" },
    status: { padding: "5px 10px", backgroundColor: "#007acc", fontSize: "12px", textAlign: "center" },
    modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center" },
    modal: { backgroundColor: "#333", padding: "20px", borderRadius: "8px", textAlign: "center" }
  };

  return (
    <div style={styles.container}>
      {/* LEFT SIDEBAR (Context Files) */}
      <div style={styles.sidebar}>
        <h3>✨ Frugaast</h3>
        <p style={{ fontSize: "12px", color: isConnected ? "#4caf50" : "#f44336" }}>
          {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </p>
        <hr style={{ borderColor: "#333", width: "100%" }} />
        <h4>Context Files</h4>
        <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "#aaa" }}>
          {activeFiles.length === 0 ? <li>No files active</li> : activeFiles.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>

      {/* MAIN CHAT AREA */}
      <div style={styles.main}>
        {/* Chat History */}
        <div style={styles.chatBox}>
          {chat.map((msg, i) => (
            <div key={i} style={styles.bubble(msg.role)}>
              <strong>{msg.role.toUpperCase()}</strong><br />
              {msg.content}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={sendMessage} style={styles.inputArea}>
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value)} 
            style={{ padding: "10px", backgroundColor: "#333", color: "white", border: "none" }}
          >
            <option value="ask">ASK</option>
            <option value="code">CODE</option>
          </select>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? "Type a prompt or /add file.py" : "Waiting for backend..."}
            disabled={!isConnected || approvalReq !== null}
          />
          <button type="submit" style={styles.button} disabled={!isConnected}>Send</button>
        </form>

        {/* Status Bar */}
        <div style={styles.status}>{status}</div>
      </div>

      {/* APPROVAL MODAL (Intercepts AI requests to read new files) */}
      {approvalReq && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>AI Wants to Read Files</h3>
            <p>The AI needs context from the following files:</p>
            <pre style={{ textAlign: "left", backgroundColor: "#1e1e1e", padding: "10px" }}>
              {approvalReq.files.join("\n")}
            </pre>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
              <button style={{ ...styles.button, backgroundColor: "#4caf50" }} onClick={() => handleApproval(true)}>Allow</button>
              <button style={{ ...styles.button, backgroundColor: "#f44336" }} onClick={() => handleApproval(false)}>Deny</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}