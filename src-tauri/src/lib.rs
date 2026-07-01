// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod sidebar;
mod fuzzysearch;
use sidebar::list_workspace_files;
use fuzzysearch::fuzzy_search;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn read_file(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init()) 
        .plugin(tauri_plugin_shell::init()) 
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, read_file, list_workspace_files, fuzzy_search])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
