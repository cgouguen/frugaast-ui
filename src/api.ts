// src/api.ts

// 1. COMMANDS (Client -> Server)
export type ClientCommand = 
  | { command: "init_workspace"; path?: string } // Made path optional to match Python
  | { command: "chat"; input: string; mode: "ask" | "code" }
  | { command: "get_repo_map"; user_input: string; max_map_tokens: number }
  | { command: "get_context" }
  | { command: "get_build_message"; user_input: string }
  | { command: "cancel" }
  | { command: "fuzzy_search_files"; query: string }
  | { command: "autocomplete"; input: string } // ADDED: Autocomplete command
  | { command: "approval_response"; approval_id: string; approved: boolean }
  | { command: "get_config" }
  | { command: "update_config"; scope: "local" | "global"; updates: Record<string, any> }
  | { command: "get_models" }
  | { command: "load_model"; model_id: string; save_as_default?: boolean };

// 2. EVENTS (Server -> Client)
export type ServerEvent =
  | { type: "CoreContextUpdated"; payload: { active_files: string[] } }
  | { type: "ContextStatsUpdated"; payload: { tokens: number; cost: number; session_cost: number } }
  | { type: "CoreAgenticTaskProgress"; payload: { message: string } }
  | { type: "SystemMessage"; payload: { message: string } }
  | { type: "CoreLLMChunkReceived"; payload: { chunk?: string } }
  | { type: "CoreLLMResponseComplete"; payload: {} }
  | { type: "ContentResponse"; payload: { text: string } }
  | { type: "CoreUserFileApprovalRequested"; payload: { approval_id: string; files: string[] } }
  | { type: "FuzzySearchResults"; payload: { files: string[] } }
  | { type: "AutocompleteOptions"; payload: { options: string[]; input: string } }
  | { type: "ConfigState"; payload: { config: Record<string, any> } }
  | { type: "AvailableModels"; payload: { models: { name: string; id: string }[]; current_model?: string } };

// 3. Helper to send typed commands
export function sendCommand(ws: WebSocket | null, cmd: ClientCommand) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(cmd));
    } else {
        console.warn("WebSocket is not connected.");
    }
}
