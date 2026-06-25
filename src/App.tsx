import React, { useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { TitleBar } from "./components/layout/TitleBar";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { ChatView } from "./components/view_chat/ChatView";
import { RepoMapView } from "./components/view_repomap/RepoMapView";
import { FileView } from "./components/view_file/FileView";
import { GlobalInput } from "./components/view_chat/GlobalInput";
import { ApprovalModal } from "./components/modals/ApprovalModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import "./App.css";

function AppContent() {
  const { mainView, sidebarVisible, setSidebarVisible } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Crtl+B = toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarVisible(!sidebarVisible);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarVisible, setSidebarVisible]);

  return (
    <div className="app-layout" style={{ flex: 1, height: 'calc(100vh - 32px)', overflow: 'hidden' }}>
      <Sidebar />
      <main className="main-area">
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

        <GlobalInput />
      </main>

      <ApprovalModal />
      <SettingsModal />
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
