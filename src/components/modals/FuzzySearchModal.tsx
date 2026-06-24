import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { Search, X, FileCode2, Folder } from "lucide-react";
import "./SharedModal.css";
import "./FuzzySearchModal.css";

export const FuzzySearchModal = () => {
  const { showFuzzySearch, setShowFuzzySearch, fuzzyResults, searchFiles, sendHiddenCommand } = useApp();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (showFuzzySearch) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [showFuzzySearch]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [fuzzyResults]);

  useEscapeKey(() => setShowFuzzySearch(false), showFuzzySearch);

  const treeItems = useMemo(() => {
    const root: any = { name: '', path: '', children: {}, isFile: false };
    fuzzyResults.forEach(p => {
      const parts = p.split(/[/\\]/);
      let current = root;
      parts.forEach((part, i) => {
        const isFile = i === parts.length - 1;
        const nodePath = parts.slice(0, i + 1).join('/');
        if (!current.children[part]) {
          current.children[part] = { name: part, path: isFile ? p : nodePath, children: {}, isFile };
        }
        if (isFile) current.children[part].isFile = true;
        current = current.children[part];
      });
    });

    const flatten = (node: any, depth: number = -1): any[] => {
      let result: any[] = [];
      if (depth >= 0) {
        result.push({ name: node.name, path: node.path, isFile: node.isFile, depth });
      }
      const sortedChildren = Object.values(node.children).sort((a: any, b: any) => {
        if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
        return a.isFile ? 1 : -1;
      });
      sortedChildren.forEach(child => {
        result = result.concat(flatten(child, depth + 1));
      });
      return result;
    };

    return flatten(root);
  }, [fuzzyResults]);

  if (!showFuzzySearch) return null;

  const handleSelect = (file: string) => {
    sendHiddenCommand(`/add ${file}`);
    setShowFuzzySearch(false);
  };

  return (
    <div className="modal-backdrop" onClick={() => setShowFuzzySearch(false)}>
      <div className="modal-panel unified-panel" onClick={e => e.stopPropagation()}>
        <div className="unified-header">
          <Search size={18} className="unified-icon" />
          <input 
            type="text" className="fuzzy-input" placeholder="Search files by name..." 
            value={query} 
            onChange={(e) => {
              setQuery(e.target.value);
              searchFiles(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, Math.max(0, treeItems.length - 1))); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
              else if (e.key === "Enter" && treeItems[selectedIndex]) { 
                e.preventDefault(); 
                if (treeItems[selectedIndex].isFile) handleSelect(treeItems[selectedIndex].path); 
              }
            }}
            autoFocus
          />
          <button className="icon-btn-small" onClick={() => setShowFuzzySearch(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="fuzzy-results">
          {treeItems.length === 0 ? <div className="fuzzy-empty">No files found.</div> : (
            treeItems.map((item, i) => (
              <div key={item.path} className={`fuzzy-tree-item ${i === selectedIndex ? 'selected' : ''}`} 
                style={{ paddingLeft: `${12 + item.depth * 16}px` }}
                onClick={() => item.isFile && handleSelect(item.path)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {item.isFile ? <FileCode2 size={16} className="file-icon" /> : <Folder size={16} className="folder-icon" />}
                <span className="fuzzy-tree-name truncate">{item.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
