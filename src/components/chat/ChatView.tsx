import React, { useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { ChatMessage } from "./ChatMessage";
import { Terminal } from "lucide-react";
import "./ChatView.css";

export const ChatView = () => {
  const { chat } = useApp();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

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
      <div className="messages-container">
        {chat.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};
