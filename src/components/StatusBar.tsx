import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Clock,
  FileText,
  Users,
  Wifi,
  WifiOff,
  Save,
  AlertCircle,
  CheckCircle,
  Cpu,
  Activity,
  Eye,
  Code2
} from 'lucide-react';

interface StatusBarProps {
  cursorPosition: { line: number; column: number; index: number };
  codeAnalysis: {
    lines: number;
    words: number;
    characters: number;
    charactersNoSpaces: number;
    estimatedReadTime: number;
  };
  editorStats: {
    totalSessions: number;
    totalLinesWritten: number;
    totalCharactersTyped: number;
    averageSessionTime: number;
    lastUsed: number;
  };
  hasUnsavedChanges: boolean;
  isAutoSaving: boolean;
  language: string;
}

interface SystemStats {
  isOnline: boolean;
  memoryUsage?: number;
  performanceLevel: 'excellent' | 'good' | 'fair' | 'poor';
  lastSaveTime?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorPosition,
  codeAnalysis,
  editorStats,
  hasUnsavedChanges,
  isAutoSaving,
  language
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStats, setSystemStats] = useState<SystemStats>({
    isOnline: navigator.onLine,
    performanceLevel: 'excellent'
  });
  const [showExtendedStats, setShowExtendedStats] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnlineStatus = () => {
      setSystemStats(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Monitor performance and memory usage
  useEffect(() => {
    const monitorPerformance = () => {
      // Check memory usage if available
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const memoryUsage = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;

        let performanceLevel: SystemStats['performanceLevel'] = 'excellent';
        if (memoryUsage > 80) performanceLevel = 'poor';
        else if (memoryUsage > 60) performanceLevel = 'fair';
        else if (memoryUsage > 40) performanceLevel = 'good';

        setSystemStats(prev => ({
          ...prev,
          memoryUsage,
          performanceLevel
        }));
      }

      // Check if document is visible (tab switching optimization)
      if (document.hidden) return;

      // Monitor frame rate
      let lastFrameTime = performance.now();
      const checkFrameRate = () => {
        const now = performance.now();
        const frameTime = now - lastFrameTime;

        if (frameTime > 50) { // Less than 20 FPS
          setSystemStats(prev => ({ ...prev, performanceLevel: 'poor' }));
        }

        lastFrameTime = now;
      };

      requestAnimationFrame(checkFrameRate);
    };

    const performanceInterval = setInterval(monitorPerformance, 5000);
    return () => clearInterval(performanceInterval);
  }, []);

  // Track session time
  useEffect(() => {
    const sessionStart = Date.now();
    const timer = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Memoized calculations
  const fileStats = useMemo(() => {
    const sizeInBytes = new Blob([]).size; // Rough estimate
    const encoding = 'UTF-8';
    const lineEnding = '\n'; // Unix-style

    return {
      encoding,
      lineEnding,
      size: `${(codeAnalysis.characters / 1024).toFixed(1)}KB`
    };
  }, [codeAnalysis.characters]);

  const productivityStats = useMemo(() => {
    const wordsPerMinute = sessionTime > 0 ? Math.round((codeAnalysis.words / sessionTime) * 60) : 0;
    const linesPerMinute = sessionTime > 0 ? Math.round((codeAnalysis.lines / sessionTime) * 60) : 0;
    const efficiency = codeAnalysis.charactersNoSpaces / Math.max(codeAnalysis.characters, 1);

    return {
      wordsPerMinute,
      linesPerMinute,
      efficiency: Math.round(efficiency * 100)
    };
  }, [sessionTime, codeAnalysis]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getLanguageIcon = (lang: string): string => {
    const icons: Record<string, string> = {
      'javascript': '🟨',
      'typescript': '🔷',
      'react': '⚛️',
      'css': '🎨',
      'json': '📋',
      'html': '🌐',
      'markdown': '📝',
      'python': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'go': '🐹'
    };
    return icons[lang] || '📄';
  };

  const getPerformanceColor = (level: SystemStats['performanceLevel']): string => {
    switch (level) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getPerformanceIcon = (level: SystemStats['performanceLevel']) => {
    switch (level) {
      case 'excellent': return <Zap className="w-3 h-3" />;
      case 'good': return <CheckCircle className="w-3 h-3" />;
      case 'fair': return <AlertCircle className="w-3 h-3" />;
      case 'poor': return <AlertCircle className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <div className="h-7 bg-slate-900/80 backdrop-blur-sm border-t border-blue-500/20 flex items-center justify-between px-4 text-xs glow-border relative overflow-hidden">
      {/* Left Section - File and Cursor Info */}
      <div className="flex items-center space-x-4">
        {/* Language and file info */}
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1">
            <span>{getLanguageIcon(language)}</span>
            <span className="text-blue-400 font-medium">{language.toUpperCase()}</span>
          </span>

          <span className="text-slate-500">•</span>

          <span className="text-slate-400">{fileStats.encoding}</span>
          <span className="text-slate-400">{fileStats.size}</span>
        </div>

        {/* Cursor position */}
        <div className="flex items-center space-x-1 text-slate-400">
          <span>Ln {cursorPosition.line}</span>
          <span className="text-slate-500">•</span>
          <span>Col {cursorPosition.column}</span>
          <span className="text-slate-500">•</span>
          <span>Pos {cursorPosition.index}</span>
        </div>

        {/* File statistics */}
        <div className="flex items-center space-x-3 text-slate-400">
          <span className="flex items-center space-x-1">
            <FileText className="w-3 h-3" />
            <span>{codeAnalysis.lines} lines</span>
          </span>

          <span className="flex items-center space-x-1">
            <Eye className="w-3 h-3" />
            <span>{codeAnalysis.words} words</span>
          </span>

          <span className="flex items-center space-x-1">
            <Code2 className="w-3 h-3" />
            <span>{codeAnalysis.characters} chars</span>
          </span>
        </div>
      </div>

      {/* Center Section - Productivity Stats (when extended) */}
      {showExtendedStats && (
        <div className="flex items-center space-x-4 text-slate-400">
          <span className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>{productivityStats.wordsPerMinute} WPM</span>
          </span>

          <span className="flex items-center space-x-1">
            <Cpu className="w-3 h-3" />
            <span>{productivityStats.efficiency}% efficiency</span>
          </span>

          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(sessionTime)} session</span>
          </span>

          {codeAnalysis.estimatedReadTime > 0 && (
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{codeAnalysis.estimatedReadTime}min read</span>
            </span>
          )}
        </div>
      )}

      {/* Right Section - System Status */}
      <div className="flex items-center space-x-4">
        {/* Save status */}
        <div className="flex items-center space-x-1">
          {isAutoSaving ? (
            <>
              <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-blue-400">Saving...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-orange-400">Unsaved</span>
            </>
          ) : (
            <>
              <Save className="w-3 h-3 text-green-400" />
              <span className="text-green-400">Saved</span>
            </>
          )}
        </div>

        {/* Performance indicator */}
        <div
          className={`flex items-center space-x-1 cursor-pointer hover:bg-slate-800/50 px-2 py-1 rounded transition-colors ${getPerformanceColor(systemStats.performanceLevel)}`}
          onClick={() => setShowExtendedStats(!showExtendedStats)}
          title={`Performance: ${systemStats.performanceLevel}${systemStats.memoryUsage ? ` • Memory: ${systemStats.memoryUsage.toFixed(1)}%` : ''}`}
        >
          {getPerformanceIcon(systemStats.performanceLevel)}
          <span>{systemStats.performanceLevel}</span>
          {systemStats.memoryUsage && (
            <span className="text-xs opacity-75">
              {systemStats.memoryUsage.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Network status */}
        <div className={`flex items-center space-x-1 ${systemStats.isOnline ? 'text-green-400' : 'text-red-400'}`}>
          {systemStats.isOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </div>

        {/* Current time */}
        <div className="flex items-center space-x-1 text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{currentTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })}</span>
        </div>

        {/* Editor stats button */}
        <button
          onClick={() => setShowExtendedStats(!showExtendedStats)}
          className="flex items-center space-x-1 text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-slate-800/50"
          title="Toggle extended statistics"
        >
          <Users className="w-3 h-3" />
          <span>Stats</span>
          <span className="text-blue-400">{showExtendedStats ? '−' : '+'}</span>
        </button>
      </div>

      {/* Extended Stats Tooltip */}
      {showExtendedStats && (
        <div className="absolute bottom-full right-4 mb-1 p-3 bg-slate-800/95 backdrop-blur-sm border border-blue-500/30 rounded-lg shadow-2xl glow-border z-50 min-w-[300px]">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">📊 Editor Statistics</h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Current Session */}
            <div className="space-y-1">
              <h5 className="font-medium text-slate-300">Current Session</h5>
              <div className="space-y-0.5 text-slate-400">
                <div>Duration: {formatTime(sessionTime)}</div>
                <div>Words/min: {productivityStats.wordsPerMinute}</div>
                <div>Lines/min: {productivityStats.linesPerMinute}</div>
                <div>Code density: {productivityStats.efficiency}%</div>
              </div>
            </div>

            {/* All Time Stats */}
            <div className="space-y-1">
              <h5 className="font-medium text-slate-300">All Time</h5>
              <div className="space-y-0.5 text-slate-400">
                <div>Sessions: {editorStats.totalSessions}</div>
                <div>Lines written: {editorStats.totalLinesWritten.toLocaleString()}</div>
                <div>Characters: {editorStats.totalCharactersTyped.toLocaleString()}</div>
                <div>Avg session: {formatTime(Math.round(editorStats.averageSessionTime / 1000))}</div>
              </div>
            </div>

            {/* File Analysis */}
            <div className="space-y-1">
              <h5 className="font-medium text-slate-300">Current File</h5>
              <div className="space-y-0.5 text-slate-400">
                <div>Lines: {codeAnalysis.lines}</div>
                <div>Words: {codeAnalysis.words}</div>
                <div>Characters: {codeAnalysis.characters}</div>
                <div>Read time: ~{codeAnalysis.estimatedReadTime}min</div>
              </div>
            </div>

            {/* System Info */}
            <div className="space-y-1">
              <h5 className="font-medium text-slate-300">System</h5>
              <div className="space-y-0.5 text-slate-400">
                <div className="flex items-center space-x-1">
                  <span>Performance:</span>
                  <span className={getPerformanceColor(systemStats.performanceLevel)}>
                    {systemStats.performanceLevel}
                  </span>
                </div>
                {systemStats.memoryUsage && (
                  <div>Memory: {systemStats.memoryUsage.toFixed(1)}%</div>
                )}
                <div className="flex items-center space-x-1">
                  <span>Network:</span>
                  <span className={systemStats.isOnline ? 'text-green-400' : 'text-red-400'}>
                    {systemStats.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div>Language: {language}</div>
              </div>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="mt-3 pt-2 border-t border-slate-600/30">
            <h5 className="text-xs font-medium text-slate-300 mb-1">💡 Tips</h5>
            <div className="text-xs text-slate-500 space-y-0.5">
              <div>• Click performance indicator for system details</div>
              <div>• All data is stored locally and private</div>
              <div>• Statistics reset when browser data is cleared</div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowExtendedStats(false)}
            className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Performance warning overlay */}
      {systemStats.performanceLevel === 'poor' && (
        <div className="absolute top-0 left-0 right-0 bg-red-500/10 border-t border-red-500/30 p-1 text-center">
          <span className="text-red-400 text-xs flex items-center justify-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>Performance degraded - consider refreshing or closing other tabs</span>
          </span>
        </div>
      )}
    </div>
  );
};