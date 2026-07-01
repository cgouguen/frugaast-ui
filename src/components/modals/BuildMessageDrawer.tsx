import React, { useMemo, useState, useEffect } from 'react';
import { X, Settings, User, Bot, ChevronDown, ChevronRight, Code, Copy, FoldVertical } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './BuildMessageDrawer.css';

const extractText = (content: any): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item: any) => item.text || '').join('\n');
  }
  return JSON.stringify(content, null, 2);
};

const MessageItem = ({ role, content, foldSignal }: { role: string; content: any; foldSignal: number }) => {
  const text = useMemo(() => extractText(content), [content]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (foldSignal > 0) {
      setIsExpanded(false);
    }
  }, [foldSignal]);

  const RoleIcon = role === 'system' ? Settings : role === 'user' ? User : Bot;
  const ToggleIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div className={`msg-block msg-${role} ${!isExpanded ? 'collapsed' : ''}`}>
      <div className="msg-header" onClick={() => setIsExpanded(!isExpanded)}>
        <ToggleIcon size={16} className="msg-toggle-icon" />
        <RoleIcon size={16} />
        <span className="msg-role-name">{role}</span>
      </div>
      {isExpanded && (
        <div className="msg-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
      )}
    </div>
  );
};

export const BuildMessageDrawer = () => {
  const { buildMessage, setBuildMessage } = useApp();
  const [foldSignal, setFoldSignal] = useState(0);

  const parsedMessages = useMemo(() => {
    if (!buildMessage) return null;
    try {
      const parsed = JSON.parse(buildMessage);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }, [buildMessage]);

  if (buildMessage === null) return null;

  const handleCopy = () => {
    if (buildMessage) {
      navigator.clipboard.writeText(buildMessage);
    }
  };

  const handleFoldAll = () => {
    setFoldSignal(s => s + 1);
  };

  return (
    <div className="build-message-overlay" onClick={() => setBuildMessage(null)}>
      <div className="build-message-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <div className="title-icon-wrapper">
              <Code size={18} />
            </div>
            <div className="title-text">
              <h3>Prompt</h3>
              <p className="drawer-subtitle">This is the prompt that will be sent to the LLM</p>
            </div>
          </div>
          <div className="drawer-actions">
            {parsedMessages && (
              <button className="action-btn" onClick={handleFoldAll} title="Fold all">
                <FoldVertical size={14} />
                <span>Fold all</span>
              </button>
            )}
            <button className="action-btn" onClick={handleCopy} title="Copy">
              <Copy size={14} />
              <span>Copy</span>
            </button>
            <button className="close-btn" onClick={() => setBuildMessage(null)} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="drawer-content">
          {parsedMessages ? (
            <div className="messages-container">
              {parsedMessages.map((msg: any, idx: number) => (
                <MessageItem key={idx} role={msg.role} content={msg.content} foldSignal={foldSignal} />
              ))}
            </div>
          ) : (
            <pre>{buildMessage.replace(/\\n/g, '\n')}</pre>
          )}
        </div>
      </div>
    </div>
  );
};
