import React, { useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { ChatMessage } from "./ChatMessage";
import { Terminal, Trash2 } from "lucide-react";
import "./ChatView.css";

export const ChatView = () => {
  const { chat, setChat } = useApp();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat?")) {
      setChat([]);
    }
  };

  return (
    <div className="chat-scroll-area">
      {chat.length === 0 && (
        <div className="welcome-screen">
          <div className="welcome-icon-wrapper">
            <Terminal size={40} />
          </div>
          <h2>Ready to build.</h2>
          <p>Add files to your context and start exploring your code.</p>
        </div>
      )}
      {chat.length > 0 && (
        <div className="chat-actions">
          <button className="clear-chat-btn" onClick={handleClearChat} title="Clear Chat History">
            <Trash2 size={16} />
            <span>Clear Chat</span>
          </button>
        </div>
      )}
      <div className="messages-container">
        {chat.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};
