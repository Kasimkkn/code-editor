import { Search, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CodePanel } from './CodePanel';
import { CosmicBackground } from './CosmicBackground';
import { DiffViewer } from './DiffViewer';
import { FindReplace } from './FindReplace';
import { StatusBar } from './StatusBar';

interface CodeVersion {
  content: string;
  timestamp: number;
  id: string;
}

export const CosmicCodeEditor = () => {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [code, setCode] = useState<string>('');
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([]);

  // Save code to localStorage and track versions
  useEffect(() => {
    const savedCode = localStorage.getItem('cosmic-editor-code');
    const savedVersions = localStorage.getItem('cosmic-editor-versions');
    
    if (savedCode) {
      setCode(savedCode);
    }
    
    if (savedVersions) {
      try {
        setCodeVersions(JSON.parse(savedVersions));
      } catch (error) {
        console.error('Failed to parse saved versions:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (code) {
      localStorage.setItem('cosmic-editor-code', code);
      
      // Save version for diff viewer (every significant change)
      const newVersion: CodeVersion = {
        content: code,
        timestamp: Date.now(),
        id: `version-${Date.now()}`
      };
      
      setCodeVersions(prev => {
        const updated = [...prev, newVersion];
        // Keep only last 10 versions
        const trimmed = updated.slice(-10);
        localStorage.setItem('cosmic-editor-versions', JSON.stringify(trimmed));
        return trimmed;
      });
    }
  }, [code]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'f') {
          e.preventDefault();
          setShowFindReplace(true);
        } else if (e.key === 'h') {
          e.preventDefault();
          setShowFindReplace(true);
        } else if (e.key === 'd') {
          e.preventDefault();
          setShowDiff(!showDiff);
        } else if (e.key === 's') {
          e.preventDefault();
          // Format code
          formatCode();
        }
      }
      
      if (e.key === 'Escape') {
        setShowFindReplace(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDiff]);

  const formatCode = () => {
    try {
      // Simple JavaScript/React formatting
      const formatted = formatJavaScriptCode(code);
      setCode(formatted);
    } catch (error) {
      console.error('Failed to format code:', error);
    }
  };

  const formatJavaScriptCode = (code: string): string => {
    let formatted = code;
    let indentLevel = 0;
    const lines = formatted.split('\n');
    const formattedLines: string[] = [];

    for (let line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      if (trimmed) {
        formattedLines.push('  '.repeat(indentLevel) + trimmed);
      } else {
        formattedLines.push('');
      }
      
      if (trimmed.includes('{')) {
        indentLevel++;
      }
    }

    return formattedLines.join('\n');
  };

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
                🚀 Cosmic Code Editor
              </h1>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-blue-400">⚡ DSA-Powered</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFindReplace(!showFindReplace)}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border"
                title="Find & Replace (Ctrl+F)"
              >
                <Search className="w-4 h-4 text-blue-400" />
              </button>
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border"
                title="Diff Viewer (Ctrl+D)"
              >
                <Terminal className="w-4 h-4 text-green-400" />
              </button>
              <button
                onClick={formatCode}
                className="px-3 py-1 text-xs rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border text-purple-400"
                title="Format Code (Ctrl+S)"
              >
                Format
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
                language="javascript"
                searchMatches={searchMatches}
              />
            </div>

            {/* Diff Viewer (when needed) */}
            {showDiff && (
              <div className="w-1/2 border-l border-blue-500/20">
                <DiffViewer codeVersions={codeVersions} />
              </div>
            )}
          </div>

          <StatusBar />
        </div>
      </div>
    </div>
  );
};
