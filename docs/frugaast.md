The absolute best way to describe a JSON-based WebSocket interface to a modern frontend developer is by providing a **Markdown document containing TypeScript Interfaces** and a brief **Event Flow**. 

TypeScript is the universal language of modern frontend development. If you give them the `types`, they can copy-paste them directly into their React/Vue/Svelte project and immediately get autocomplete and type safety.

Here is the exact documentation you should copy, paste, and hand over to the Tauri developer.

***

# 🔌 Frugaast WebSocket API Documentation

## Overview
The Python backend runs locally as a headless sidecar. 
* **Protocol:** WebSocket (JSON)
* **URL:** `ws://127.0.0.1:8001/ws/chat`
* **Lifecycle:** The Tauri frontend is responsible for spawning the backend executable (using `@tauri-apps/plugin-shell`) before attempting to connect to this WebSocket.

---

## 1. Client-to-Server Messages (What you send)

When sending messages to the server, stringify one of the following JSON payloads.

```typescript
// The base envelope for all messages sent to the server
type ClientMessage = ChatCommand | ApprovalResponse;

// Trigger a new AI interaction
interface ChatCommand {
    command: "chat";
    input: string;           // The user's prompt or slash command (e.g., "/add file.py")
    mode: "ask" | "code";    // "ask" is read-only Q&A, "code" applies file edits
}

// Respond to a blocking request from the AI to read new files
interface ApprovalResponse {
    command: "approval_response";
    approval_id: string;     // The UUID provided by the server's CoreUserFileApprovalRequested event
    approved: boolean;       // true if the user clicked "Yes", false for "No"
}
```

---

## 2. Server-to-Client Events (What you receive)

The server will push JSON events to the frontend. Every event has a `type` string and a `payload` object. 

```typescript
// The base envelope for all messages received from the server
interface ServerEvent<T = any> {
    type: ServerEventType;
    payload: T;
}

type ServerEventType = 
    | "CoreContextUpdated"
    | "CoreAgenticTaskProgress"
    | "CoreLLMChunkReceived"
    | "CoreLLMResponseComplete"
    | "SystemMessage"
    | "CoreUserFileApprovalRequested";

// --- Specific Payloads ---

// Fired when files are added or dropped from the active context.
// Use this to update the right-hand sidebar UI.
interface ContextUpdatedPayload {
    active_files: string[];
}

// Fired to indicate background progress. 
// Use this for transient toast notifications or loading spinners.
interface AgenticTaskProgressPayload {
    message: string; 
}

// Fired multiple times per second while the LLM is streaming text.
// Append this chunk to the current Assistant chat bubble.
interface LLMChunkReceivedPayload {
    chunk: string;
}

// Fired when the LLM stream is finished.
// Use this to unlock the UI/Input bar.
interface LLMResponseCompletePayload {}

// Fired for explicit system notifications (e.g., successful slash commands, errors)
interface SystemMessagePayload {
    message: string;
}

// Fired when the AI halts and asks permission to read untracked files.
// YOU MUST pause the UI, show a Yes/No modal, and send an `ApprovalResponse` back.
interface UserFileApprovalRequestedPayload {
    files: string[];         // List of file paths the AI wants to read
    approval_id: string;     // A unique ID you must echo back in your response
}
```

---

## 3. Standard Interaction Flow

Here is the exact sequence of events for a standard `code` request, so you know how to build the UI state machine.

1. **Frontend:** Sends `{"command": "chat", "input": "Refactor math.py", "mode": "code"}`
2. **Server:** Emits `CoreAgenticTaskProgress` ("Processing input...")
3. **Server:** Emits `CoreAgenticTaskProgress` ("Thinking...")
4. **Server:** Emits `CoreLLMChunkReceived` ("Here is the refactored code...") *(Repeats 50+ times)*
5. **Server:** Emits `CoreLLMResponseComplete` 
6. **Server:** Emits `CoreAgenticTaskProgress` ("Applying 1 change...")
7. **Server:** Emits `CoreAgenticTaskProgress` ("Committed: Refactored math.py")

### Handling the Approval Flow
If the LLM realizes it needs to read a file that isn't in the context, the flow pauses:

1. **Server:** Emits `CoreUserFileApprovalRequested` with `approval_id: "123"`
2. **Frontend:** *(Shows Yes/No Modal)*
3. **Frontend:** Sends `{"command": "approval_response", "approval_id": "123", "approved": true}`
4. **Server:** Emits `CoreContextUpdated` (Showing the newly added file)
5. **Server:** Emits `CoreAgenticTaskProgress` ("Added 1 files. Asking LLM to continue...")
6. **Server:** Resumes streaming `CoreLLMChunkReceived` for turn 2.

***

### Why this format works so well:
1. **No ambiguity:** By defining the exact strings for `type` and `command`, the frontend dev knows exactly what to write in their `switch(data.type)` statement.
2. **Easy code generation:** The frontend developer can feed this exact markdown document into Claude, ChatGPT, or GitHub Copilot and say *"Generate a React hook to manage this WebSocket connection"* and the AI will write perfect, type-safe implementation code instantly.