
import { Search, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CodePanel } from './CodePanel';
import { CosmicBackground } from './CosmicBackground';
import { DiffViewer } from './DiffViewer';
import { FindReplace } from './FindReplace';
import { StatusBar } from './StatusBar';

export const CosmicCodeEditor = () => {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [code, setCode] = useState<string>();

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

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden">
      <CosmicBackground />

      {/* Main Editor Layout */}
      <div className="relative z-10 min-h-screen flex">

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-12 bg-slate-900/50 backdrop-blur-sm border-b border-blue-500/20 flex items-center justify-between px-4 glow-border">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 bg-clip-text text-transparent">
                🚀 Code Editor
              </h1>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-blue-400">⚡ DSA-Powered</span>
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
            </div>
          </header>

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
