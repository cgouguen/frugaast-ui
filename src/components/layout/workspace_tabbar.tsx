import React from 'react';
import { useApp } from "../../context/AppContext";
import { FolderOpen, X } from "lucide-react";
import "./workspace_tabbar.css";

export const WorkspaceTabBar = () => {
    const { workspace, setWorkspace, initWorkspace, openWorkspaces, setOpenWorkspaces } = useApp();

    if (openWorkspaces.length === 0) return null;

    const handleTabClick = (path: string) => {
        if (path !== workspace) {
            setWorkspace(path);
            initWorkspace(path);
        }
    };

    const handleCloseTab = (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        const newTabs = openWorkspaces.filter(p => p !== path);
        setOpenWorkspaces(newTabs);
        
        // If we closed the active workspace, switch to the first available or null
        if (path === workspace) {
            const nextWs = newTabs.length > 0 ? newTabs[0] : null;
            setWorkspace(nextWs);
            if (nextWs) {
                initWorkspace(nextWs);
            }
        }
    };

    return (
        <div className="workspace-tabbar">
            {openWorkspaces.map((path) => {
                const isActive = path === workspace;
                const folderName = path.split(/[/\\]/).pop();
                return (
                    <div 
                        key={path}
                        className={`workspace-tab ${isActive ? 'active' : ''}`}
                        onClick={() => handleTabClick(path)}
                        title={path}
                    >
                        <FolderOpen size={14} className="workspace-tab-icon" />
                        <span className="workspace-tab-label">{folderName}</span>
                        <div 
                            className="workspace-tab-close"
                            onClick={(e) => handleCloseTab(e, path)}
                        >
                            <X size={12} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
