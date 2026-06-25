import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { invoke } from '@tauri-apps/api/core';
import { createHighlighter } from 'shiki';
import './FileView.css';

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
  const { openedFile, workspace } = useApp();
  const [content, setContent] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!openedFile) return;
    let isMounted = true;
    
    const loadFile = async () => {
      setLoading(true);
      setError(null);
      setHtmlContent('');
      try {
        let filePath = openedFile;
        // If the path isn't absolute, join it with the workspace path
        if (workspace && !filePath.startsWith('/') && !filePath.match(/^[a-zA-Z]:[\\/]/)) {
          const sep = workspace.includes('\\') ? '\\' : '/';
          filePath = `${workspace}${workspace.endsWith(sep) ? '' : sep}${filePath}`;
        }

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
        console.error("Failed to read file", err);
        setError(err.message || 'Failed to read file');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFile();

    return () => { isMounted = false; };
  }, [openedFile]);

  if (!openedFile) {
    return (
      <div className="file-view-container">
        <div className="empty-state">No file selected.</div>
      </div>
    );
  }

  return (
    <div className="file-view-container">
      <div className="file-view-header">
        <span className="file-view-title truncate">{openedFile}</span>
      </div>
      <div className="file-view-content">
        {loading ? (
          <div className="file-view-loading empty-state">Loading...</div>
        ) : error ? (
          <div className="file-view-error empty-state">Error: {error}</div>
        ) : (
          <div 
            className="shiki-container"
            dangerouslySetInnerHTML={{ __html: htmlContent || `<pre><code>${content}</code></pre>` }}
          />
        )}
      </div>
    </div>
  );
};
