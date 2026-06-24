// src/api.ts

// 1. COMMANDS (Client -> Server)
export type ClientCommand = 
  | { command: "init_workspace"; path?: string } // Made path optional to match Python
  | { command: "chat"; input: string; mode: "ask" | "code" | "repomap"; max_map_token?: number } // Fixed: token -> token (singular)
  | { command: "cancel" }
  | { command: "fuzzy_search_files"; query: string }
  | { command: "autocomplete"; input: string } // ADDED: Autocomplete command
  | { command: "approval_response"; approval_id: string; approved: boolean }
  | { command: "get_config" }
  | { command: "update_config"; scope: "local" | "global"; updates: Record<string, any> };

// 2. EVENTS (Server -> Client)
export type ServerEvent =
  | { type: "CoreContextUpdated"; payload: { active_files: string[] } }
  | { type: "ContextStatsUpdated"; payload: { tokens: number; cost: number; session_cost: number } }
  | { type: "CoreAgenticTaskProgress"; payload: { message: string } }
  | { type: "SystemMessage"; payload: { message: string } }
  | { type: "CoreLLMChunkReceived"; payload: { chunk?: string } }
  | { type: "CoreLLMResponseComplete"; payload: {} }
  | { type: "CoreUserFileApprovalRequested"; payload: { approval_id: string; files: string[] } }
  | { type: "FuzzySearchResults"; payload: { files: string[] } }
  | { type: "AutocompleteOptions"; payload: { options: string[]; input: string } }
  | { type: "ConfigState"; payload: { config: Record<string, any> } };

// 3. Helper to send typed commands
export function sendCommand(ws: WebSocket | null, cmd: ClientCommand) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(cmd));
    } else {
        console.warn("WebSocket is not connected.");
    }
}
