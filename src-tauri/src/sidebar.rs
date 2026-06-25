use std::path::Path;

#[derive(serde::Serialize)]
pub struct MessageNode {
    pub filename: String,
    pub filepath: String,
    pub role: String,
    pub msg_type: String,
    pub timestamp: String,
}

#[derive(serde::Serialize)]
pub struct SessionNode {
    pub id: String,
    pub messages: Vec<MessageNode>,
}

#[tauri::command]
pub fn list_workspace_files(workspace: &str) -> Result<Vec<SessionNode>, String> {
    let mut sessions = Vec::new();
    if workspace.is_empty() {
        return Ok(sessions);
    }

    let history_dir = Path::new(workspace).join(".frugaast").join("llm_history");
    if !history_dir.exists() || !history_dir.is_dir() {
        return Ok(sessions);
    }

    let session_paths = std::fs::read_dir(history_dir).map_err(|e| e.to_string())?;
    for session_entry in session_paths.flatten() {
        if session_entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
            let session_id = session_entry.file_name().to_string_lossy().into_owned();
            let mut messages = Vec::new();

            if let Ok(msg_paths) = std::fs::read_dir(session_entry.path()) {
                for msg_entry in msg_paths.flatten() {
                    if msg_entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
                        let filename = msg_entry.file_name().to_string_lossy().into_owned();
                        if !filename.ends_with(".md") {
                            continue;
                        }

                        // Parse filename: {time_prefix}_{role}_{safe_type}.md
                        let stem = filename.strip_suffix(".md").unwrap();
                        let parts: Vec<&str> = stem.split('_').collect();
                        
                        let (timestamp, role, msg_type) = if parts.len() >= 5 && parts[2].len() == 6 && parts[2].chars().all(|c| c.is_ascii_digit()) {
                            let ts = format!("{}_{}_{}", parts[0], parts[1], parts[2]);
                            let role = parts[3].to_string();
                            let msg_type = parts[4..].join("_");
                            (ts, role, msg_type)
                        } else if parts.len() >= 4 {
                            let ts = format!("{}_{}", parts[0], parts[1]);
                            let role = parts[2].to_string();
                            let msg_type = parts[3..].join("_");
                            (ts, role, msg_type)
                        } else {
                            (stem.to_string(), "unknown".to_string(), "unknown".to_string())
                        };

                        let filepath = msg_entry.path().to_string_lossy().into_owned();

                        messages.push(MessageNode {
                            filename,
                            filepath,
                            role,
                            msg_type,
                            timestamp,
                        });
                    }
                }
            }

            // Sort messages chronologically
            messages.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

            sessions.push(SessionNode {
                id: session_id,
                messages,
            });
        }
    }

    // Sort sessions reverse chronologically by ID
    sessions.sort_by(|a, b| b.id.cmp(&a.id));

    Ok(sessions)
}
