import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { invoke } from '@tauri-apps/api/core';
import { watch } from '@tauri-apps/plugin-fs';
import { createHighlighter } from 'shiki';
import './FileView.css';

// SVG Icons
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const FileIcon = () => (
  <svg className="file-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const EmptyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="3" x2="9" y2="21"></line>
  </svg>
);

const ZoomInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 14, height: 14}}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <line x1="11" y1="8" x2="11" y2="14"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

const ZoomOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 14, height: 14}}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 20, height: 20, flexShrink: 0}}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

let globalHighlighter: any = null;

const extMap: Record<string, string> = {
  'js': 'javascript', 'ts': 'typescript', 'jsx': 'jsx', 'tsx': 'tsx',
  'py': 'python', 'rs': 'rust', 'go': 'go', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
  'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown', 'sh': 'bash',
  'yaml': 'yaml', 'yml': 'yaml', 'toml': 'toml', 'xml': 'xml', 'sql': 'sql',
  'txt': 'txt'
};

async function getMemoizedHighlighter(lang: string) {
  if (!globalHighlighter) {
    globalHighlighter = await createHighlighter({
      themes: ['vitesse-dark'],
      langs: ['txt', lang === 'txt' ? [] : lang].flat() as any
    });
  } else {
    const loadedLangs = globalHighlighter.getLoadedLanguages();
    if (!loadedLangs.includes(lang as any)) {
      try {
        await globalHighlighter.loadLanguage(lang as any);
      } catch (e) {
        console.warn(`Could not load language: ${lang}`);
      }
    }
  }
  return globalHighlighter;
}

export const FileView = () => {
  const { openedFile, workspace, activeFiles, sendHiddenCommand, config, updateConfig } = useApp();
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tab: string } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    setTabs([]);
    setActiveTab(null);
  }, [workspace]);

  useEffect(() => {
    if (openedFile) {
      setTabs(prev => {
        if (!prev.includes(openedFile)) {
          return [...prev, openedFile];
        }
        return prev;
      });
      setActiveTab(openedFile);
    }
  }, [openedFile]);

  useEffect(() => {
    if (!activeTab) return;
    let isMounted = true;
    let unwatch: (() => void) | undefined;
    
    const loadFile = async () => {
      setLoading(true);
      setError(null);
      setHtmlContent('');
      try {
        let filePath = activeTab;
        // If the path isn't absolute, join it with the workspace path
        if (workspace && !filePath.startsWith('/') && !filePath.match(/^[a-zA-Z]:[\\/]/)) {
          const sep = workspace.includes('\\') ? '\\' : '/';
          filePath = `${workspace}${workspace.endsWith(sep) ? '' : sep}${filePath}`;
        }

        const readAndHighlight = async () => {
          try {
            const text: string = await invoke('read_file', { path: filePath });
            if (!isMounted) return;
            setContent(text);

            const ext = filePath.split('.').pop()?.toLowerCase() || 'txt';
            const lang = extMap[ext] || 'txt';

            const highlighter = await getMemoizedHighlighter(lang);
            if (!isMounted) return;

            const loadedLangs = highlighter.getLoadedLanguages();
            const finalLang = loadedLangs.includes(lang as any) ? lang : 'txt';

            const html = highlighter.codeToHtml(text, { lang: finalLang, theme: 'vitesse-dark' });
            setHtmlContent(html);
          } catch (err: any) {
            if (!isMounted) return;
            console.error("Failed to read/highlight file", err);
            setError(err.message || 'Failed to read file');
          }
        };

        await readAndHighlight();

        if (isMounted) {
          try {
            unwatch = await watch(filePath, () => {
              if (isMounted) {
                readAndHighlight();
              }
            });
            if (!isMounted && unwatch) {
              unwatch();
            }
          } catch (watchErr) {
            console.warn("Failed to watch file:", watchErr);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to setup file view", err);
        setError(err.message || 'Failed to setup file view');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFile();

    return () => { 
      isMounted = false; 
      if (unwatch) unwatch();
    };
  }, [activeTab, workspace]);

  const isTabInContext = (tabPath: string) => {
    return activeFiles.some(f => {
      const nf = f.replace(/\\/g, '/');
      const nt = tabPath.replace(/\\/g, '/');
      return nf === nt || nt.endsWith('/' + nf) || nf.endsWith('/' + nt);
    });
  };

  const toggleContext = (e: React.MouseEvent, file: string) => {
    e.stopPropagation();
    const inContext = isTabInContext(file);
    sendHiddenCommand(inContext ? `/drop "${file}"` : `/add "${file}"`);
  };

  const closeTab = (tabToClose: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t !== tabToClose);
      setActiveTab(currentActive => {
        if (currentActive === tabToClose) {
          return newTabs.length > 0 ? newTabs[newTabs.length - 1] : null;
        }
        return currentActive;
      });
      return newTabs;
    });
  };

  const closeAllTabs = () => {
    setTabs([]);
    setActiveTab(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        if (activeTab) {
          e.preventDefault();
          closeTab(activeTab);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const fontSize = parseInt(config?.file_view_font_size as any, 10) || 14;
  const handleZoomIn = () => updateConfig("global", { file_view_font_size: fontSize + 1 });
  const handleZoomOut = () => updateConfig("global", { file_view_font_size: Math.max(8, fontSize - 1) });

  if (tabs.length === 0) {
    return (
      <div className="file-view-container">
        <div className="file-view-empty">
          <EmptyIcon />
          <span>Select a file from the repository map to view its contents</span>
        </div>
      </div>
    );
  }

  return (
    <div className="file-view-container">
      <div className="file-view-header">
        <div className="file-view-tabs">
          {tabs.map(tab => {
            const isInContext = isTabInContext(tab);
            return (
              <div 
                key={tab} 
                className={`file-view-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.stopPropagation();
                    closeTab(tab);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, tab });
                }}
                title={tab}
              >
                <FileIcon />
                <span className="tab-name">{tab.split(/[/\\]/).pop()}</span>
                <div className="file-view-tab-actions">
                  <span 
                    className={`file-view-tab-action ${isInContext ? 'in-context' : ''}`}
                    onClick={(e) => toggleContext(e, tab)}
                    title={isInContext ? "Remove from context" : "Add to context"}
                  >
                    {isInContext ? <MinusIcon /> : <PlusIcon />}
                  </span>
                  <span 
                    className="file-view-tab-close" 
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab);
                    }}
                    title="Close"
                  >
                    <CloseIcon />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {contextMenu && (
          <div 
            className="file-view-context-menu" 
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="file-view-context-menu-item" onClick={() => closeTab(contextMenu.tab)}>
              Close Tab
            </div>
            <div className="file-view-context-menu-item" onClick={closeAllTabs}>
              Close All Tabs
            </div>
          </div>
        )}
        <div className="file-view-toolbar">
          <button className="file-view-toolbar-btn" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOutIcon />
          </button>
          <button className="file-view-toolbar-btn" onClick={handleZoomIn} title="Zoom In">
            <ZoomInIcon />
          </button>
        </div>
      </div>
      <div className="file-view-content">
        {loading ? (
          <div className="file-view-loading">
            <SpinnerIcon />
            <span>Loading file...</span>
          </div>
        ) : error ? (
          <div className="file-view-error">
            <ErrorIcon />
            <span>{error}</span>
          </div>
        ) : (
          <div 
            className="shiki-container"
            style={{ fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: htmlContent || `<pre><code>${content}</code></pre>` }}
          />
        )}
      </div>
    </div>
  );
};
