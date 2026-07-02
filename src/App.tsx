import React, { useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { TitleBar } from "./components/layout/TitleBar";
import { Sidebar } from "./components/layout/LeftSidebar";
import { TopBar } from "./components/layout/TopBar";
import { ChatView } from "./components/view_chat/ChatView";
import { RepoMapView } from "./components/view_repomap/RepoMapView";
import { FileView } from "./components/view_file/FileView";
import { ApprovalModal } from "./components/modals/ApprovalModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { RightSidebar } from "./components/layout/RightSidebar";
import { WorkspaceTabBar } from "./components/layout/workspace_tabbar";
import "./App.css";

function AppContent() {
  const { mainView, sidebarVisible, setSidebarVisible, rightSidebarVisible, setRightSidebarVisible } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Crtl+B = toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarVisible(!sidebarVisible);
      }
      // Ctrl+J = toggle right sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setRightSidebarVisible(!rightSidebarVisible);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarVisible, setSidebarVisible, rightSidebarVisible, setRightSidebarVisible]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: 'calc(100vh - 32px)', overflow: 'hidden' }}>
      <WorkspaceTabBar />
      <div className="app-layout" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <Sidebar />
        <main className="main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        
        <div className="view-content-wrapper">
          <div style={{ display: mainView === "chat" ? "contents" : "none" }}>
            <ChatView />
          </div>
          <div style={{ display: mainView === "repomap" ? "contents" : "none" }}>
            <RepoMapView />
          </div>
          <div style={{ display: mainView === "file" ? "contents" : "none" }}>
            <FileView />
          </div>
        </div>
      </main>

        <RightSidebar />

        <ApprovalModal />
        <SettingsModal />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <TitleBar />
        <AppContent />
      </div>
    </AppProvider>
  );
}
