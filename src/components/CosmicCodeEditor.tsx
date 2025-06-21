
import React, { useState, useCallback, useEffect } from 'react';
import { CodePanel } from './CodePanel';
import { EditorTabs } from './EditorTabs';
import { StatusBar } from './StatusBar';
import { DiffViewer } from './DiffViewer';
import { useCodeStorage } from '@/hooks/useCodeStorage';

interface EditorTab {
  id: string;
  name: string;
  content: string;
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  isModified: boolean;
}

interface CursorPosition {
  line: number;
  column: number;
  index: number;
}

export const CosmicCodeEditor: React.FC = () => {
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: '1',
      name: 'App.jsx',
      content: `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>Cosmic Code Editor</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

export default App;`,
      language: 'jsx',
      isModified: false
    }
  ]);

  const [activeTabId, setActiveTabId] = useState('1');
  const [diffViewerVisible, setDiffViewerVisible] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 0, column: 0, index: 0 });

  const { saveCodeVersion, saveEditorState, loadEditorState } = useCodeStorage();

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content: newCode, isModified: true }
          : tab
      )
    );

    // Save version for diff tracking
    if (activeTab) {
      saveCodeVersion(newCode, activeTab.language);
    }
  }, [activeTabId, activeTab, saveCodeVersion]);

  // Handle tab changes
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  // Handle tab close
  const handleTabClose = useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);

    // If closing active tab, switch to another
    if (tabId === activeTabId && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }
  }, [tabs, activeTabId]);

  // Create new tab
  const handleNewTab = useCallback(() => {
    const newTab: EditorTab = {
      id: Date.now().toString(),
      name: `untitled-${tabs.length + 1}.jsx`,
      content: '// New file\n',
      language: 'jsx',
      isModified: false
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  // Handle cursor position changes
  const handleCursorChange = useCallback((position: CursorPosition) => {
    setCursorPosition(position);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'd':
            e.preventDefault();
            setDiffViewerVisible(prev => !prev);
            break;
          case 'n':
            e.preventDefault();
            handleNewTab();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNewTab]);

  // Save editor state periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveEditorState({
        tabs,
        activeTabId,
        cursorPosition
      });
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [tabs, activeTabId, cursorPosition, saveEditorState]);

  // Load editor state on mount
  useEffect(() => {
    const savedState = loadEditorState();
    if (savedState && savedState.tabs && savedState.tabs.length > 0) {
      setTabs(savedState.tabs);
      setActiveTabId(savedState.activeTabId || savedState.tabs[0].id);
    }
  }, [loadEditorState]);

  if (!activeTab) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">
          No files open. 
          <button 
            onClick={handleNewTab}
            className="ml-2 text-blue-400 hover:text-blue-300 underline"
          >
            Create new file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex-shrink-0">
        <EditorTabs 
          tabs={tabs.map(tab => ({
            id: tab.id,
            name: tab.name,
            active: tab.id === activeTabId,
            modified: tab.isModified
          }))}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
          onNewTab={handleNewTab}
        />
      </div>

      {/* Editor content */}
      <div className="flex-1 min-h-0">
        {diffViewerVisible ? (
          <DiffViewer />
        ) : (
          <CodePanel
            code={activeTab.content}
            language={activeTab.language}
            onChange={handleCodeChange}
            onCursorChange={handleCursorChange}
            showLineNumbers={true}
            readOnly={false}
            className="h-full"
          />
        )}
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0">
        <StatusBar 
          cursorPosition={cursorPosition}
          language={activeTab.language}
          fileName={activeTab.name}
        />
      </div>
    </div>
  );
};
