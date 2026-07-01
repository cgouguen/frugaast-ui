use std::path::Path;
use ignore::WalkBuilder;
use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;

#[tauri::command]
pub fn fuzzy_search(workspace: &str, query: &str) -> Result<Vec<String>, String> {
    let matcher = SkimMatcherV2::default();
    let mut results = Vec::new();

    let mut builder = WalkBuilder::new(workspace);
    
    // 1. Parse rules from .gitignore
    builder.git_ignore(true);
    
    // 2. Parse rules from .git/info/exclude
    builder.git_exclude(true);
    
    // 3. Parse rules from .frugaastignore
    builder.add_custom_ignore_filename(".frugaastignore");
    
    // 4. Include hidden files (like .env or .github/) by setting hidden to false
    builder.hidden(false);

    // 5. Explicitly PRUNE the .git folder so we don't waste time scanning git internals
    builder.filter_entry(|e| e.file_name() != ".git");

    // Hide these configuration files from appearing in the user's search results
    let ignored_files_from_ui = [".gitignore", ".frugaastignore"];

    for result in builder.build() {
        if let Ok(entry) = result {
            let path = entry.path();
            
            // Skip the root workspace directory itself
            if path == Path::new(workspace) { 
                continue; 
            }

            // Get the relative path (strip the workspace prefix)
            let rel_path = path.strip_prefix(workspace)
                .unwrap_or(path)
                .to_string_lossy();
                
            // Standardize path separators to forward slashes for the frontend UI
            let normalized_path = rel_path.replace('\\', "/");

            // Hide the ignore files themselves from the search results
            if ignored_files_from_ui.contains(&normalized_path.as_str()) {
                continue;
            }

            // If query is empty, return all files. 
            // If not, use the fuzzy matcher to score the path.
            if query.is_empty() {
                results.push((normalized_path, 0));
            } else if let Some(score) = matcher.fuzzy_match(&normalized_path, query) {
                results.push((normalized_path, score));
            }
        }
    }

    // Sort by best fuzzy match score (highest score first)
    results.sort_by(|a, b| b.1.cmp(&a.1));

    // Map back to just the file paths to send to the frontend
    Ok(results.into_iter().map(|(path, _score)| path).collect())
}