// src/api.ts

// 1. COMMANDS (Client -> Server)
export type ClientCommand = 
  | { command: "init_workspace"; path: string }
  | { command: "chat"; input: string; mode: "ask" | "code" | "repomap"; max_map_tokens?: number }
  | { command: "cancel" }
  | { command: "fuzzy_search_files"; query: string }
  | { command: "approval_response"; approval_id: string; approved: boolean };

// 2. EVENTS (Server -> Client)
export type ServerEvent =
  | { type: "CoreContextUpdated"; payload: { active_files: string[] } }
  | { type: "ContextStatsUpdated"; payload: { tokens: number; cost: number; session_cost: number } }
  | { type: "CoreAgenticTaskProgress"; payload: { message: string } }
  | { type: "SystemMessage"; payload: { message: string } }
  | { type: "CoreLLMChunkReceived"; payload: { chunk?: string } }
  | { type: "CoreLLMResponseComplete"; payload: {} }
  | { type: "CoreUserFileApprovalRequested"; payload: { approval_id: string; files: string[] } }
  | { type: "FuzzySearchResults"; payload: { files: string[] } };

// 3. Helper to send typed commands
export function sendCommand(ws: WebSocket | null, cmd: ClientCommand) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(cmd));
    } else {
        console.warn("WebSocket is not connected.");
    }
}
