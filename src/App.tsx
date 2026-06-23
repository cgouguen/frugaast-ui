import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { ChatView } from "./components/chat/ChatView";
import { RepoMapView } from "./components/repomap/RepoMapView";
import { GlobalInput } from "./components/chat/GlobalInput";
import { FuzzySearchModal } from "./components/modals/FuzzySearchModal";
import { ApprovalModal } from "./components/modals/ApprovalModal";
import "./App.css";

function AppContent() {
  const { mainView } = useApp();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-area">
        <TopBar />
        
        <div className="view-content-wrapper">
          {mainView === "chat" ? <ChatView /> : <RepoMapView />}
        </div>

        <GlobalInput />
      </main>

      <FuzzySearchModal />
      <ApprovalModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}