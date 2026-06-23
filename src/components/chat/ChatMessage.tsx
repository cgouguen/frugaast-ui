import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Settings2 } from "lucide-react";
import "./ChatMessage.css";

export const ChatMessage = ({ msg }: { msg: any }) => {
  return (
    <div className={`message-row ${msg.role}`}>
      <div className="message-avatar">
        {msg.role === "assistant" ? <Bot size={18} /> : msg.role === "user" ? <User size={18} /> : <Settings2 size={18} />}
      </div>
      <div className="message-content">
        {msg.role === "assistant" ? (
          <div className="markdown-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content.includes("⋮") && !msg.content.includes("```")
                ? `\`\`\`text\n${msg.content}\n\`\`\``
                : msg.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="plain-text">{msg.content}</p>
        )}
      </div>
    </div>
  );
};
