# Init
```
npm install
npm run tauri dev
```

# Sidecar
## Install the JS package
npm install @tauri-apps/plugin-shell

## Install the Rust crate
cargo add tauri-plugin-shell

## ensure it is initialized in your `src-tauri/src/lib.rs` file:
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init()) // <--- Make sure this line is here
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```