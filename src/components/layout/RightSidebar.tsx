import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "../../context/AppContext";
import "./RightSidebar.css";

interface FileNode {
  name: string;
  is_dir: boolean;
}

export const RightSidebar = () => {
  const { rightSidebarVisible, workspace } = useApp();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (rightSidebarVisible && workspace) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [workspace, rightSidebarVisible]);

  async function fetchFiles() {
    if (!workspace) return;
    try {
      setError("");
      const result = await invoke<FileNode[]>("list_workspace_files", { workspace });
      setFiles(result);
    } catch (err: any) {
      console.error("Failed to list files:", err);
      setError(err.toString());
    }
  }

  if (!rightSidebarVisible) return null;

  return (
    <div className="right-sidebar">
      <div className="right-sidebar-header">
        <h2>Workspace Explorer</h2>
      </div>
      <div className="right-sidebar-content">
        <p className="workspace-path" title={workspace || ""}>
          {workspace ? workspace : "No workspace selected"}
        </p>
        {workspace && (
          <button className="refresh-button" onClick={fetchFiles}>Refresh</button>
        )}
        {error && <p className="error-msg">{error}</p>}
        <ul className="file-list">
          {files.map((file, idx) => (
            <li key={idx} className={file.is_dir ? "is-dir" : "is-file"}>
              <span className="file-icon">{file.is_dir ? "📁" : "📄"}</span>
              <span className="file-name">{file.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
