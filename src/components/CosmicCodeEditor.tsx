
import React, { useState, useRef, useEffect } from 'react';
import { CodePanel } from './CodePanel';
import { FindReplace } from './FindReplace';
import { DiffViewer } from './DiffViewer';
import { CosmicBackground } from './CosmicBackground';
import { EditorTabs } from './EditorTabs';
import { Sidebar } from './EditorSidebar';
import { StatusBar } from './StatusBar';
import { Search, Settings, GitBranch, Terminal } from 'lucide-react';

export const CosmicCodeEditor = () => {
  const [activeTab, setActiveTab] = useState('main.tsx');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [code, setCode] = useState(`// Welcome to Cosmic Code Editor - DSA-Powered
import React, { useState, useEffect } from 'react';

const CosmicApp = () => {
  const [count, setCount] = useState(0);
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    console.log('Component mounted');
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleClick = () => {
    setCount(prev => prev + 1);
  };

  const processData = (items) => {
    // Bracket matching example
    const filtered = items.filter(item => {
      return item.active && item.score > 0;
    });
    
    return filtered.map(item => ({
      ...item,
      processed: true
    }));
  };

  return (
    <div className="app">
      <h1>Hello, Cosmic Universe!</h1>
      <p>Advanced features powered by DSA algorithms:</p>
      <ul>
        <li>🔍 KMP/Boyer-Moore pattern matching</li>
        <li>⚡ Trie-based auto-completion</li>
        <li>🧩 Stack-based bracket matching</li>
        <li>🎯 Multi-cursor with two-pointer technique</li>
        <li>💡 Array-based undo/redo system</li>
      </ul>
      
      <button onClick={handleClick}>
        Count: {count}
      </button>
      
      <div className="users">
        {users.map(user => (
          <div key={user.id} className="user-card">
            {user.name} - {user.email}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CosmicApp;`);

  // Save code to localStorage
  useEffect(() => {
    const savedCode = localStorage.getItem('cosmic-editor-code');
    if (savedCode) {
      setCode(savedCode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cosmic-editor-code', code);
  }, [code]);

  const handleHighlight = (matches: number[]) => {
    setSearchMatches(matches);
  };

  const handleReplace = (newCode: string) => {
    setCode(newCode);
  };

  const tabs = [
    { name: 'main.tsx', active: activeTab === 'main.tsx' },
    { name: 'algorithms.ts', active: activeTab === 'algorithms.ts' },
    { name: 'utils.ts', active: activeTab === 'utils.ts' }
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
      <CosmicBackground />
      
      {/* Main Editor Layout */}
      <div className="relative z-10 min-h-screen flex">
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-12 bg-slate-900/50 backdrop-blur-sm border-b border-blue-500/20 flex items-center justify-between px-4 glow-border">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 bg-clip-text text-transparent">
                🚀 Cosmic Code Editor
              </h1>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-blue-400">⚡ DSA-Powered</span>
                <GitBranch className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">main</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowFindReplace(!showFindReplace)}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border"
                title="Smart Find & Replace (KMP/Boyer-Moore)"
              >
                <Search className="w-4 h-4 text-blue-400" />
              </button>
              <button 
                onClick={() => setShowDiff(!showDiff)}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border"
                title="Diff Viewer (LCS Algorithm)"
              >
                <Terminal className="w-4 h-4 text-green-400" />
              </button>
              <button className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border">
                <Settings className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </header>

          {/* Tabs */}
          <EditorTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Find & Replace Panel */}
          {showFindReplace && (
            <FindReplace 
              onClose={() => setShowFindReplace(false)}
              code={code}
              onHighlight={handleHighlight}
              onReplace={handleReplace}
            />
          )}

          {/* Main Editor Area */}
          <div className="flex-1 flex">
            <div className="flex-1 flex flex-col">
              <CodePanel 
                code={code} 
                onChange={setCode}
                language="typescript"
                searchMatches={searchMatches}
              />
            </div>
            
            {/* Diff Viewer (when needed) */}
            {showDiff && (
              <div className="w-1/2 border-l border-blue-500/20">
                <DiffViewer />
              </div>
            )}
          </div>

          <StatusBar />
        </div>
      </div>
    </div>
  );
};
