use std::path::Path;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};

#[derive(serde::Serialize)]
pub struct MessageNode {
    pub filename: String,
    pub filepath: String,
    pub role: String,
    pub msg_type: String,
    pub timestamp: String,
    pub content: String,
    pub model: Option<String>,
    pub last_transaction_cost: Option<f64>,
    pub session_cost: Option<f64>,
    pub cost: Option<f64>,
}

#[derive(serde::Serialize)]
pub struct SessionNode {
    pub id: String,
    pub messages: Vec<MessageNode>,
}

#[derive(serde::Deserialize)]
struct ChatEntry {
    timestamp: String,
    session_id: String,
    #[serde(rename = "type")]
    msg_type: String,
    role: String,
    content: String,
    model: Option<String>,
    last_transaction_cost: Option<f64>,
    session_cost: Option<f64>,
    cost: Option<f64>,
}

#[tauri::command]
pub fn list_workspace_files(workspace: &str) -> Result<Vec<SessionNode>, String> {
    if workspace.is_empty() {
        return Ok(Vec::new());
    }

    let chat_file_path = Path::new(workspace).join(".frugaast").join("chat.jsonl");
    if !chat_file_path.exists() || !chat_file_path.is_file() {
        return Ok(Vec::new());
    }

    let file = File::open(&chat_file_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);

    let mut sessions_map: HashMap<String, Vec<MessageNode>> = HashMap::new();
    let filepath_str = chat_file_path.to_string_lossy().into_owned();

    for line in reader.lines().flatten() {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(entry) = serde_json::from_str::<ChatEntry>(&line) {
            let msg = MessageNode {
                filename: "chat.jsonl".to_string(),
                filepath: filepath_str.clone(),
                role: entry.role,
                msg_type: entry.msg_type,
                timestamp: entry.timestamp,
                content: entry.content,
                model: entry.model,
                last_transaction_cost: entry.last_transaction_cost,
                session_cost: entry.session_cost,
                cost: entry.cost,
            };
            sessions_map.entry(entry.session_id).or_default().push(msg);
        }
    }

    let mut sessions: Vec<SessionNode> = sessions_map
        .into_iter()
        .map(|(id, mut messages)| {
            // Sort messages chronologically
            messages.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
            SessionNode { id, messages }
        })
        .collect();

    // Sort sessions reverse chronologically by ID
    sessions.sort_by(|a, b| b.id.cmp(&a.id));

    Ok(sessions)
}
