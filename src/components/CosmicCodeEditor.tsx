import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Search, Terminal, Settings, Save, Download, Upload, Zap, GitBranch, Eye, Code } from 'lucide-react';
import { CodePanel } from './CodePanel';
import { DiffViewer } from './DiffViewer';
import { FindReplace } from './FindReplace';
import { StatusBar } from './StatusBar';

interface CodeVersion {
  content: string;
  timestamp: number;
  id: string;
  description?: string;
  lineCount: number;
  charCount: number;
}

interface EditorSettings {
  theme: 'dark' | 'darker' | 'cosmic';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  showMinimap: boolean;
  autoSave: boolean;
  language: 'javascript' | 'typescript' | 'react' | 'css' | 'json';
}

interface EditorStats {
  totalSessions: number;
  totalLinesWritten: number;
  totalCharactersTyped: number;
  averageSessionTime: number;
  lastUsed: number;
}

export const CosmicCodeEditor: React.FC = () => {
  // Core state
  const [code, setCode] = useState<string>('');
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([]);
  const [currentCursorPosition, setCurrentCursorPosition] = useState({ line: 1, column: 1, index: 0 });

  // UI state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Performance state
  const [editorStats, setEditorStats] = useState<EditorStats>({
    totalSessions: 0,
    totalLinesWritten: 0,
    totalCharactersTyped: 0,
    averageSessionTime: 0,
    lastUsed: Date.now()
  });

  // Settings state
  const [settings, setSettings] = useState<EditorSettings>({
    theme: 'cosmic',
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    showMinimap: false,
    autoSave: true,
    language: 'javascript'
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionStartTime = useRef<number>(Date.now());
  const lastCodeLength = useRef<number>(0);

  // Memoized calculations
  const codeAnalysis = useMemo(() => {
    const lines = code.split('\n');
    const words = code.split(/\s+/).filter(w => w.length > 0);
    const chars = code.length;
    const nonWhitespaceChars = code.replace(/\s/g, '').length;

    return {
      lines: lines.length,
      words: words.length,
      characters: chars,
      charactersNoSpaces: nonWhitespaceChars,
      estimatedReadTime: Math.ceil(words.length / 200) // 200 words per minute
    };
  }, [code]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    trackSession();

    // Cleanup on unmount
    return () => {
      saveSessionStats();
    };
  }, []);

  // Enhanced auto-save with debouncing
  useEffect(() => {
    if (code && settings.autoSave) {
      setHasUnsavedChanges(true);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000); // 2 second debounce
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [code, settings.autoSave]);

  // Track typing statistics
  useEffect(() => {
    const newLength = code.length;
    const lengthDiff = newLength - lastCodeLength.current;

    if (lengthDiff > 0) {
      setEditorStats(prev => ({
        ...prev,
        totalCharactersTyped: prev.totalCharactersTyped + lengthDiff,
        totalLinesWritten: prev.totalLinesWritten + (code.split('\n').length - (lastCodeLength.current === 0 ? 0 : code.substring(0, lastCodeLength.current).split('\n').length))
      }));
    }

    lastCodeLength.current = newLength;
  }, [code]);

  const loadInitialData = useCallback(() => {
    try {
      // Load code
      const savedCode = localStorage.getItem('cosmic-editor-code');
      if (savedCode) {
        setCode(savedCode);
        setHasUnsavedChanges(false);
      }

      // Load versions
      const savedVersions = localStorage.getItem('cosmic-editor-versions');
      if (savedVersions) {
        const versions = JSON.parse(savedVersions);
        setCodeVersions(versions);
      }

      // Load settings
      const savedSettings = localStorage.getItem('cosmic-editor-settings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }

      // Load stats
      const savedStats = localStorage.getItem('cosmic-editor-stats');
      if (savedStats) {
        setEditorStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error('Failed to load editor data:', error);
    }
  }, []);

  const trackSession = useCallback(() => {
    setEditorStats(prev => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
      lastUsed: Date.now()
    }));
  }, []);

  const saveSessionStats = useCallback(() => {
    const sessionDuration = Date.now() - sessionStartTime.current;

    setEditorStats(prev => {
      const newAverageTime = prev.totalSessions > 0
        ? (prev.averageSessionTime * (prev.totalSessions - 1) + sessionDuration) / prev.totalSessions
        : sessionDuration;

      const updatedStats = {
        ...prev,
        averageSessionTime: newAverageTime
      };

      localStorage.setItem('cosmic-editor-stats', JSON.stringify(updatedStats));
      return updatedStats;
    });
  }, []);

  const handleAutoSave = useCallback(async () => {
    setIsAutoSaving(true);

    try {
      // Save code
      localStorage.setItem('cosmic-editor-code', code);

      // Create version with enhanced metadata
      const newVersion: CodeVersion = {
        content: code,
        timestamp: Date.now(),
        id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: generateVersionDescription(code),
        lineCount: code.split('\n').length,
        charCount: code.length
      };

      setCodeVersions(prev => {
        // Smart version management: keep important versions
        const updatedVersions = [...prev, newVersion];
        const optimizedVersions = optimizeVersionHistory(updatedVersions);

        localStorage.setItem('cosmic-editor-versions', JSON.stringify(optimizedVersions));
        return optimizedVersions;
      });

      setHasUnsavedChanges(false);

      // Brief success indication
      setTimeout(() => setIsAutoSaving(false), 500);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setIsAutoSaving(false);
    }
  }, [code]);

  const optimizeVersionHistory = useCallback((versions: CodeVersion[]): CodeVersion[] => {
    if (versions.length <= 15) return versions;

    // Keep recent versions (last 10)
    const recentVersions = versions.slice(-10);

    // Keep milestone versions (every 5th version from older ones)
    const olderVersions = versions.slice(0, -10);
    const milestoneVersions = olderVersions.filter((_, index) => index % 5 === 0);

    return [...milestoneVersions, ...recentVersions];
  }, []);

  const generateVersionDescription = useCallback((content: string): string => {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);

    if (nonEmptyLines.length === 0) return 'Empty file';
    if (nonEmptyLines.length < 5) return 'Small changes';

    // Detect significant changes
    const hasFunction = /function|const.*=|class/.test(content);
    const hasImports = /import|require/.test(content);
    const hasComments = /\/\/|\/\*/.test(content);

    if (hasFunction && hasImports) return 'Added function with imports';
    if (hasFunction) return 'Added function';
    if (hasImports) return 'Added imports';
    if (hasComments) return 'Added documentation';

    return `${nonEmptyLines.length} lines of code`;
  }, []);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            setShowFindReplace(true);
            break;
          case 'h':
            e.preventDefault();
            setShowFindReplace(true);
            break;
          case 'd':
            if (!e.shiftKey) { // Prevent conflict with CodePanel's Ctrl+D
              e.preventDefault();
              setShowDiff(!showDiff);
            }
            break;
          case 's':
            e.preventDefault();
            handleManualSave();
            break;
          case ',':
            e.preventDefault();
            setShowSettings(true);
            break;
          case 'o':
            e.preventDefault();
            handleFileImport();
            break;
          case 'e':
            e.preventDefault();
            handleFileExport();
            break;
        }
      }

      if (e.key === 'Escape') {
        setShowFindReplace(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDiff]);

  const handleManualSave = useCallback(() => {
    handleAutoSave();
  }, [handleAutoSave]);

  // Enhanced code formatting with multiple languages support
  const formatCode = useCallback(() => {
    try {
      let formatted: string;

      switch (settings.language) {
        case 'javascript':
        case 'typescript':
        case 'react':
          formatted = formatJavaScriptCode(code, settings.tabSize);
          break;
        case 'css':
          formatted = formatCSSCode(code, settings.tabSize);
          break;
        case 'json':
          formatted = formatJSONCode(code, settings.tabSize);
          break;
        default:
          formatted = formatJavaScriptCode(code, settings.tabSize);
      }

      setCode(formatted);
    } catch (error) {
      console.error('Failed to format code:', error);
    }
  }, [code, settings.language, settings.tabSize]);

  const formatJavaScriptCode = (code: string, tabSize: number): string => {
    const indent = ' '.repeat(tabSize);
    let indentLevel = 0;
    const lines = code.split('\n');
    const formattedLines: string[] = [];

    for (let line of lines) {
      const trimmed = line.trim();

      // Handle closing braces
      if (trimmed.includes('}') && !trimmed.includes('{')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Handle else, catch, finally
      if (/^(else|catch|finally)/.test(trimmed)) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      if (trimmed) {
        formattedLines.push(indent.repeat(indentLevel) + trimmed);
      } else {
        formattedLines.push('');
      }

      // Handle opening braces
      if (trimmed.includes('{') && !trimmed.includes('}')) {
        indentLevel++;
      }

      // Handle else, catch, finally
      if (/^(else|catch|finally)/.test(trimmed) && trimmed.includes('{')) {
        indentLevel++;
      }
    }

    return formattedLines.join('\n');
  };

  const formatCSSCode = (code: string, tabSize: number): string => {
    const indent = ' '.repeat(tabSize);
    let indentLevel = 0;
    const lines = code.split('\n');
    const formattedLines: string[] = [];

    for (let line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      if (trimmed) {
        formattedLines.push(indent.repeat(indentLevel) + trimmed);
      } else {
        formattedLines.push('');
      }

      if (trimmed.includes('{')) {
        indentLevel++;
      }
    }

    return formattedLines.join('\n');
  };

  const formatJSONCode = (code: string, tabSize: number): string => {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, tabSize);
    } catch {
      return code; // Return original if invalid JSON
    }
  };

  const handleFileImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.ts,.jsx,.tsx,.css,.json,.txt';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            setCode(content);

            // Auto-detect language
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (extension) {
              const languageMap: Record<string, EditorSettings['language']> = {
                'js': 'javascript',
                'jsx': 'react',
                'ts': 'typescript',
                'tsx': 'react',
                'css': 'css',
                'json': 'json'
              };

              const detectedLanguage = languageMap[extension];
              if (detectedLanguage) {
                setSettings(prev => ({ ...prev, language: detectedLanguage }));
              }
            }
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }, []);

  const handleFileExport = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const extension = {
      'javascript': 'js',
      'typescript': 'ts',
      'react': 'jsx',
      'css': 'css',
      'json': 'json'
    }[settings.language] || 'txt';

    a.href = url;
    a.download = `cosmic-code-${Date.now()}.${extension}`;
    a.click();

    URL.revokeObjectURL(url);
  }, [code, settings.language]);

  const handleHighlight = useCallback((matches: number[]) => {
    setSearchMatches(matches);
  }, []);

  const handleReplace = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleCursorPositionChange = useCallback((position: { line: number; column: number; index: number }) => {
    setCurrentCursorPosition(position);
  }, []);

  const handleSettingsChange = useCallback((newSettings: Partial<EditorSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('cosmic-editor-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <div className={`relative min-h-screen text-white overflow-hidden ${settings.theme === 'cosmic' ? 'bg-slate-950' :
      settings.theme === 'darker' ? 'bg-gray-900' : 'bg-slate-900'
      }`}>
      {/* Cosmic background effects */}
      {settings.theme === 'cosmic' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-3/4 left-3/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>
      )}

      {/* Main Editor Layout */}
      <div className="relative z-10 min-h-screen flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Enhanced Header */}
          <header className="h-14 bg-slate-900/50 backdrop-blur-sm border-b border-blue-500/20 flex items-center justify-between px-4 glow-border">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 bg-clip-text text-transparent">
                🚀 Cosmic Code Editor
              </h1>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-blue-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  DSA-Powered
                </span>
                <span className="text-green-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {codeAnalysis.lines} lines
                </span>
                <span className="text-purple-400 flex items-center gap-1">
                  <Code className="w-3 h-3" />
                  {settings.language}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Auto-save indicator */}
              {isAutoSaving && (
                <div className="flex items-center space-x-1 text-xs text-blue-400">
                  <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                  <span>Saving...</span>
                </div>
              )}

              {hasUnsavedChanges && !isAutoSaving && (
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" title="Unsaved changes"></div>
              )}

              {/* Toolbar buttons */}
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
                <GitBranch className="w-4 h-4 text-green-400" />
              </button>

              <button
                onClick={formatCode}
                className="px-3 py-2 text-xs rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border text-purple-400"
                title="Format Code (Ctrl+S)"
              >
                Format
              </button>

              <button
                onClick={handleFileImport}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border"
                title="Import File (Ctrl+O)"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
              </button>

              <button
                onClick={handleFileExport}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border"
                title="Export File (Ctrl+E)"
              >
                <Download className="w-4 h-4 text-yellow-400" />
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors glow-border"
                title="Settings (Ctrl+,)"
              >
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </header>

          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-slate-800/50 backdrop-blur-sm border-b border-blue-500/20 p-4 glow-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-blue-400">⚙️ Editor Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block text-slate-300 mb-1">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingsChange({ language: e.target.value as EditorSettings['language'] })}
                    className="w-full bg-slate-700 text-white border border-blue-500/30 rounded px-2 py-1"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="react">React/JSX</option>
                    <option value="css">CSS</option>
                    <option value="json">JSON</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => handleSettingsChange({ theme: e.target.value as EditorSettings['theme'] })}
                    className="w-full bg-slate-700 text-white border border-blue-500/30 rounded px-2 py-1"
                  >
                    <option value="cosmic">Cosmic</option>
                    <option value="dark">Dark</option>
                    <option value="darker">Darker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Tab Size</label>
                  <select
                    value={settings.tabSize}
                    onChange={(e) => handleSettingsChange({ tabSize: parseInt(e.target.value) })}
                    className="w-full bg-slate-700 text-white border border-blue-500/30 rounded px-2 py-1"
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces</option>
                    <option value={8}>8 spaces</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-6 mt-4">
                <label className="flex items-center space-x-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(e) => handleSettingsChange({ autoSave: e.target.checked })}
                    className="rounded"
                  />
                  <span>Auto Save</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.wordWrap}
                    onChange={(e) => handleSettingsChange({ wordWrap: e.target.checked })}
                    className="rounded"
                  />
                  <span>Word Wrap</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.showMinimap}
                    onChange={(e) => handleSettingsChange({ showMinimap: e.target.checked })}
                    className="rounded"
                  />
                  <span>Show Minimap</span>
                </label>
              </div>
            </div>
          )}

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
                language={settings.language}
                searchMatches={searchMatches}
                onCursorPositionChange={handleCursorPositionChange}
              />
            </div>

            {/* Diff Viewer (when enabled) */}
            {showDiff && (
              <div className="w-1/2 border-l border-blue-500/20">
                <DiffViewer codeVersions={codeVersions} />
              </div>
            )}
          </div>

          {/* Enhanced Status Bar */}
          <StatusBar
            cursorPosition={currentCursorPosition}
            codeAnalysis={codeAnalysis}
            editorStats={editorStats}
            hasUnsavedChanges={hasUnsavedChanges}
            isAutoSaving={isAutoSaving}
            language={settings.language}
          />
        </div>
      </div>
    </div>
  );
};