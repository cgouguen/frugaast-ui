#[derive(serde::Serialize)]
pub struct FileNode {
    pub name: String,
    pub is_dir: bool,
}

#[tauri::command]
pub fn list_workspace_files(workspace: &str) -> Result<Vec<FileNode>, String> {
    let mut entries = Vec::new();
    if workspace.is_empty() {
        return Ok(entries);
    }
    let paths = std::fs::read_dir(workspace).map_err(|e| e.to_string())?;
    for path in paths {
        if let Ok(entry) = path {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
            entries.push(FileNode { name, is_dir });
        }
    }
    
    // Sort directories first, then alphabetically by name
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}
