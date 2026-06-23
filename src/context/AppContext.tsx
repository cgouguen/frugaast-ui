// src/context/AppContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import { sendCommand, ServerEvent } from "../api";

interface AppContextType {
  isConnected: boolean;
  status: string;
  workspace: string | null;
  setWorkspace: (ws: string | null) => void;
  isGenerating: boolean;
  mainView: string;
  setMainView: (view: string) => void;
  chat: any[];
  setChat: React.Dispatch<React.SetStateAction<any[]>>;
  activeFiles: string[];
  stats: { tokens: number; cost: number; session_cost: number };
  approvalReq: any | null;
  maxMapTokens: number;
  setMaxMapTokens: (tokens: number) => void;
  repomapContent: string;
  isRepomapReq: boolean;
  showFuzzySearch: boolean;
  setShowFuzzySearch: (show: boolean) => void;
  fuzzyResults: string[];
  
  // Actions
  initWorkspace: (path: string) => void;
  sendHiddenCommand: (cmd: string) => void;
  sendMessage: (input: string, mode: string) => void;
  fetchRepoMap: () => void;
  handleCancel: () => void;
  handleApproval: (approved: boolean) => void;
  searchFiles: (query: string) => void;
  autocompleteResults: string[];
  fetchAutocomplete: (input: string) => void;
  clearAutocomplete: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("Booting backend...");
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mainView, setMainView] = useState("chat");
  
  const [chat, setChat] = useState<any[]>([]);
  const [activeFiles, setActiveFiles] = useState<string[]>([]);
  const [stats, setStats] = useState({ tokens: 0, cost: 0, session_cost: 0 });
  const [approvalReq, setApprovalReq] = useState<any | null>(null);
  
  const [maxMapTokens, setMaxMapTokens] = useState(4096);
  const [repomapContent, setRepomapContent] = useState("");
  
  const [showFuzzySearch, setShowFuzzySearch] = useState(false);
  const [fuzzyResults, setFuzzyResults] = useState<string[]>([]);
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const childRef = useRef<any>(null);
  const isRepomapReqRef = useRef(false);

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
        break;
      case "CoreUserFileApprovalRequested": setApprovalReq(data.payload); break;
      case "FuzzySearchResults":
        setFuzzyResults(data.payload.files || []);
        break;
      case "AutocompleteOptions":
        setAutocompleteResults(data.payload.options || []);
        break;
    }
  }

  // --- Actions ---
  const sendHiddenCommand = (cmd: string) => sendCommand(wsRef.current, { command: "chat", input: cmd, mode: "ask" });
  
  const initWorkspace = (path: string) => sendCommand(wsRef.current, { command: "init_workspace", path });
  
  const searchFiles = (query: string) => sendCommand(wsRef.current, { command: "fuzzy_search_files", query });

  const fetchAutocomplete = (input: string) => sendCommand(wsRef.current, { command: "autocomplete", input });
  const clearAutocomplete = () => setAutocompleteResults([]);

  const fetchRepoMap = () => {
    if (isGenerating) return;
    isRepomapReqRef.current = true;
    setRepomapContent("");
    sendCommand(wsRef.current, { command: "chat", input: " ", mode: "repomap", max_map_tokens: maxMapTokens });
    setIsGenerating(true); setStatus("Generating RepoMap...");
  };

  const sendMessage = (input: string, mode: string) => {
    setMainView("chat");
    isRepomapReqRef.current = false;
    setChat((prev) => [...prev, { role: "user", content: input }]);
    sendCommand(wsRef.current, { command: "chat", input, mode: mode as "ask" | "code" });
    setIsGenerating(true); setStatus("Generating response...");
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
    <AppContext.Provider value={{
      isConnected, status, workspace, setWorkspace, isGenerating, mainView, setMainView,
      chat, setChat, activeFiles, stats, approvalReq, maxMapTokens, setMaxMapTokens,
      repomapContent, isRepomapReq: isRepomapReqRef.current, showFuzzySearch, setShowFuzzySearch,
      fuzzyResults, autocompleteResults, initWorkspace, sendHiddenCommand, sendMessage, fetchRepoMap, handleCancel,
      handleApproval, searchFiles, fetchAutocomplete, clearAutocomplete
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
