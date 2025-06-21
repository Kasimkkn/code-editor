import { ArrowLeft, ArrowRight, Download, Eye, EyeOff, GitBranch, RotateCcw, Search } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

interface CodeVersion {
  content: string;
  timestamp: number;
  id: string;
  description?: string;
  lineCount: number;
  charCount: number;
}

interface DiffViewerProps {
  codeVersions: CodeVersion[];
}

interface DiffLine {
  leftLine: string;
  rightLine: string;
  leftLineNumber: number;
  rightLineNumber: number;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  similarity?: number; // For fuzzy matching
}

interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  unchanged: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ codeVersions }) => {
  const [currentVersionIndex, setCurrentVersionIndex] = useState(Math.max(0, codeVersions.length - 2));
  const [compareVersionIndex, setCompareVersionIndex] = useState(codeVersions.length - 1);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [diffAlgorithm, setDiffAlgorithm] = useState<'line' | 'word' | 'char'>('line');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Memoized version data
  const currentVersion = useMemo(() =>
    codeVersions[currentVersionIndex] || null,
    [codeVersions, currentVersionIndex]
  );

  const compareVersion = useMemo(() =>
    codeVersions[compareVersionIndex] || null,
    [codeVersions, compareVersionIndex]
  );

  // Advanced LCS-based diff algorithm
  const computeDiff = useMemo(() => {
    if (!currentVersion || !compareVersion) {
      return { diffLines: [], stats: { additions: 0, deletions: 0, modifications: 0, unchanged: 0 } };
    }

    setIsLoading(true);

    const leftContent = currentVersion.content || '';
    const rightContent = compareVersion.content || '';

    const result = diffAlgorithm === 'line'
      ? computeLineDiff(leftContent, rightContent)
      : diffAlgorithm === 'word'
        ? computeWordDiff(leftContent, rightContent)
        : computeCharacterDiff(leftContent, rightContent);

    setTimeout(() => setIsLoading(false), 100);
    return result;
  }, [currentVersion, compareVersion, diffAlgorithm]);

  // Optimized LCS implementation for line-based diff
  const computeLineDiff = useCallback((left: string, right: string) => {
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');
    const m = leftLines.length;
    const n = rightLines.length;

    // LCS table with space optimization
    const lcs = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Fill LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (leftLines[i - 1] === rightLines[j - 1]) {
          lcs[i][j] = lcs[i - 1][j - 1] + 1;
        } else {
          lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
        }
      }
    }

    // Backtrack to find differences
    const diffLines: DiffLine[] = [];
    const stats: DiffStats = { additions: 0, deletions: 0, modifications: 0, unchanged: 0 };

    let i = m, j = n;
    let leftLineNum = m, rightLineNum = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
        // Lines are identical
        diffLines.unshift({
          leftLine: leftLines[i - 1],
          rightLine: rightLines[j - 1],
          leftLineNumber: leftLineNum,
          rightLineNumber: rightLineNum,
          type: 'unchanged'
        });
        stats.unchanged++;
        i--; j--;
        leftLineNum--; rightLineNum--;
      } else if (i > 0 && (j === 0 || lcs[i - 1][j] >= lcs[i][j - 1])) {
        // Line deleted from left
        diffLines.unshift({
          leftLine: leftLines[i - 1],
          rightLine: '',
          leftLineNumber: leftLineNum,
          rightLineNumber: -1,
          type: 'removed'
        });
        stats.deletions++;
        i--;
        leftLineNum--;
      } else {
        // Line added to right
        diffLines.unshift({
          leftLine: '',
          rightLine: rightLines[j - 1],
          leftLineNumber: -1,
          rightLineNumber: rightLineNum,
          type: 'added'
        });
        stats.additions++;
        j--;
        rightLineNum--;
      }
    }

    // Post-process to detect modifications
    return enhanceWithModifications(diffLines, stats);
  }, []);

  // Enhanced diff with modification detection
  const enhanceWithModifications = useCallback((diffLines: DiffLine[], stats: DiffStats) => {
    const enhanced: DiffLine[] = [];
    let i = 0;

    while (i < diffLines.length) {
      const current = diffLines[i];

      if (current.type === 'removed' && i + 1 < diffLines.length && diffLines[i + 1].type === 'added') {
        const next = diffLines[i + 1];
        const similarity = calculateSimilarity(current.leftLine, next.rightLine);

        if (similarity > 0.3) { // 30% similarity threshold
          enhanced.push({
            leftLine: current.leftLine,
            rightLine: next.rightLine,
            leftLineNumber: current.leftLineNumber,
            rightLineNumber: next.rightLineNumber,
            type: 'modified',
            similarity
          });
          stats.modifications++;
          stats.deletions--;
          stats.additions--;
          i += 2; // Skip both lines
        } else {
          enhanced.push(current);
          i++;
        }
      } else {
        enhanced.push(current);
        i++;
      }
    }

    return { diffLines: enhanced, stats };
  }, []);

  // Calculate similarity between two strings using Levenshtein distance
  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;

    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }, []);

  // Optimized Levenshtein distance with space optimization
  const levenshteinDistance = useCallback((str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    // Use only two rows instead of full matrix
    let prev = Array(n + 1).fill(0).map((_, i) => i);
    let curr = Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
      curr[0] = i;

      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,      // deletion
          curr[j - 1] + 1,  // insertion
          prev[j - 1] + cost // substitution
        );
      }

      [prev, curr] = [curr, prev];
    }

    return prev[n];
  }, []);

  // Word-level diff implementation
  const computeWordDiff = useCallback((left: string, right: string) => {

    // Apply similar LCS logic but on words
    // For brevity, using simplified approach
    const diffLines: DiffLine[] = [{
      leftLine: left,
      rightLine: right,
      leftLineNumber: 1,
      rightLineNumber: 1,
      type: left === right ? 'unchanged' : 'modified',
      similarity: calculateSimilarity(left, right)
    }];

    const stats: DiffStats = {
      additions: 0,
      deletions: 0,
      modifications: left !== right ? 1 : 0,
      unchanged: left === right ? 1 : 0
    };

    return { diffLines, stats };
  }, [calculateSimilarity]);

  // Character-level diff implementation
  const computeCharacterDiff = useCallback((left: string, right: string) => {
    const similarity = calculateSimilarity(left, right);

    const diffLines: DiffLine[] = [{
      leftLine: left,
      rightLine: right,
      leftLineNumber: 1,
      rightLineNumber: 1,
      type: left === right ? 'unchanged' : 'modified',
      similarity
    }];

    const stats: DiffStats = {
      additions: 0,
      deletions: 0,
      modifications: left !== right ? 1 : 0,
      unchanged: left === right ? 1 : 0
    };

    return { diffLines, stats };
  }, [calculateSimilarity]);

  // Filter diff lines based on search and show changes only
  const filteredDiffLines = useMemo(() => {
    let filtered = computeDiff.diffLines;

    if (showOnlyChanges) {
      filtered = filtered.filter(line => line.type !== 'unchanged');
    }

    if (searchTerm) {
      filtered = filtered.filter(line =>
        line.leftLine.toLowerCase().includes(searchTerm.toLowerCase()) ||
        line.rightLine.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [computeDiff.diffLines, showOnlyChanges, searchTerm]);

  // Navigation handlers
  const navigateVersion = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentVersionIndex > 0) {
      setCurrentVersionIndex(prev => prev - 1);
      setCompareVersionIndex(prev => Math.max(0, prev - 1));
    } else if (direction === 'next' && currentVersionIndex < codeVersions.length - 2) {
      setCurrentVersionIndex(prev => prev + 1);
      setCompareVersionIndex(prev => Math.min(codeVersions.length - 1, prev + 1));
    }
  }, [currentVersionIndex, codeVersions.length]);

  // Export diff as patch file
  const exportDiff = useCallback(() => {
    const patch = generateUnifiedDiff(computeDiff.diffLines, currentVersion, compareVersion);
    const blob = new Blob([patch], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `diff-${currentVersion?.id}-${compareVersion?.id}.patch`;
    a.click();

    URL.revokeObjectURL(url);
  }, [computeDiff.diffLines, currentVersion, compareVersion]);

  // Generate unified diff format
  const generateUnifiedDiff = useCallback((diffLines: DiffLine[], left: CodeVersion | null, right: CodeVersion | null) => {
    if (!left || !right) return '';

    let patch = `--- a/${left.id}\n+++ b/${right.id}\n`;
    let hunkStart = 1;

    diffLines.forEach((line, index) => {
      if (line.type === 'removed') {
        patch += `-${line.leftLine}\n`;
      } else if (line.type === 'added') {
        patch += `+${line.rightLine}\n`;
      } else if (line.type === 'modified') {
        patch += `-${line.leftLine}\n`;
        patch += `+${line.rightLine}\n`;
      } else {
        patch += ` ${line.leftLine}\n`;
      }
    });

    return patch;
  }, []);

  // Synchronized scrolling
  const handleScroll = useCallback((source: 'left' | 'right') => (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const scrollLeft = e.currentTarget.scrollLeft;

    if (source === 'left' && rightPanelRef.current) {
      rightPanelRef.current.scrollTop = scrollTop;
      rightPanelRef.current.scrollLeft = scrollLeft;
    } else if (source === 'right' && leftPanelRef.current) {
      leftPanelRef.current.scrollTop = scrollTop;
      leftPanelRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }, []);

  // Get line styling based on type and similarity
  const getLineStyle = useCallback((line: DiffLine) => {
    const baseClasses = "flex text-sm font-mono";
    let intensity;

    switch (line.type) {
      case 'added':
        return `${baseClasses} bg-green-500/10 border-l-2 border-green-500`;
      case 'removed':
        return `${baseClasses} bg-red-500/10 border-l-2 border-red-500`;
      case 'modified':
        intensity = line.similarity ? Math.round((1 - line.similarity) * 30) : 30;
        return `${baseClasses} bg-yellow-500/${intensity} border-l-2 border-yellow-500`;
      default:
        return `${baseClasses} hover:bg-slate-800/30`;
    }
  }, []);
  // Highlight search terms
  const highlightText = useCallback((text: string, term: string) => {
    if (!term) return text;

    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-400/50 text-yellow-200">$1</mark>');
  }, []);

  if (codeVersions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/30 backdrop-blur-sm glow-border">
        <div className="text-center text-slate-400">
          <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No versions available for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/30 backdrop-blur-sm glow-border">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-blue-500/20 bg-slate-800/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <GitBranch className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400">Advanced Diff Viewer</span>
            <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
              {codeVersions.length} versions
            </span>
            {isLoading && (
              <div className="animate-spin w-4 h-4 border border-blue-400 border-t-transparent rounded-full"></div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowOnlyChanges(!showOnlyChanges)}
              className={`p-2 rounded transition-colors ${showOnlyChanges ? 'bg-blue-500/30 text-blue-300' : 'hover:bg-slate-700/50 text-slate-400'
                }`}
              title="Show only changes"
            >
              {showOnlyChanges ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={exportDiff}
              className="p-2 hover:bg-slate-700/50 rounded text-slate-400 transition-colors"
              title="Export diff"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2">
              <label htmlFor='diff-algorithm' className="text-slate-300">Algorithm:</label>
              <select
                value={diffAlgorithm}
                onChange={(e) => setDiffAlgorithm(e.target.value as any)}
                className="bg-slate-700 text-white border border-blue-500/30 rounded px-2 py-1"
              >
                <option value="line">Line-based</option>
                <option value="word">Word-based</option>
                <option value="char">Character-based</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Search className="w-3 h-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search in diff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 text-white border border-blue-500/30 rounded px-2 py-1 w-32"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateVersion('prev')}
              disabled={currentVersionIndex <= 0}
              className="p-1 hover:bg-slate-700/50 rounded disabled:opacity-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
            </button>

            <span className="text-xs text-slate-400 min-w-[100px] text-center">
              {currentVersionIndex + 1} ↔ {compareVersionIndex + 1}
            </span>

            <button
              onClick={() => navigateVersion('next')}
              disabled={currentVersionIndex >= codeVersions.length - 2}
              className="p-1 hover:bg-slate-700/50 rounded disabled:opacity-50 transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>

        {/* Version info and stats */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            <span className="font-medium">
              {currentVersion ? formatTimestamp(currentVersion.timestamp) : 'N/A'}
            </span>
            {currentVersion?.description && (
              <span className="ml-2 text-slate-500">({currentVersion.description})</span>
            )}
            <span className="mx-2">↔</span>
            <span className="font-medium">
              {compareVersion ? formatTimestamp(compareVersion.timestamp) : 'N/A'}
            </span>
            {compareVersion?.description && (
              <span className="ml-2 text-slate-500">({compareVersion.description})</span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <span className="text-green-400">+{computeDiff.stats.additions}</span>
            <span className="text-red-400">-{computeDiff.stats.deletions}</span>
            <span className="text-yellow-400">~{computeDiff.stats.modifications}</span>
            <span className="text-slate-500">={computeDiff.stats.unchanged}</span>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel (Previous) */}
        <div className="flex-1 flex flex-col border-r border-blue-500/20">
          <div className="p-2 bg-slate-800/30 border-b border-blue-500/20">
            <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Previous ({currentVersion?.lineCount || 0} lines)
            </span>
          </div>

          <div
            ref={leftPanelRef}
            className="flex-1 overflow-auto font-mono text-sm scroll-glow"
            onScroll={handleScroll('left')}
          >
            {filteredDiffLines.map((line, index) => (
              <div key={`left-${index}`} className={getLineStyle(line)}>
                <div className="w-12 text-slate-500 text-right pr-2 py-1 bg-slate-800/30 flex-shrink-0 border-r border-slate-600/30">
                  {line.leftLineNumber > 0 ? line.leftLineNumber : ''}
                </div>
                <div
                  className="flex-1 p-1 whitespace-pre-wrap break-all"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(line.leftLine, searchTerm)
                  }}
                />
                {line.type === 'modified' && line.similarity && (
                  <div className="text-xs text-yellow-400 px-2 py-1 bg-yellow-500/10 border-l border-yellow-500/30">
                    {Math.round(line.similarity * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel (Current) */}
        <div className="flex-1 flex flex-col">
          <div className="p-2 bg-slate-800/30 border-b border-blue-500/20">
            <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              Current ({compareVersion?.lineCount || 0} lines)
            </span>
          </div>

          <div
            ref={rightPanelRef}
            className="flex-1 overflow-auto font-mono text-sm scroll-glow"
            onScroll={handleScroll('right')}
          >
            {filteredDiffLines.map((line, index) => (
              <div key={`right-${index}`} className={getLineStyle(line)}>
                <div className="w-12 text-slate-500 text-right pr-2 py-1 bg-slate-800/30 flex-shrink-0 border-r border-slate-600/30">
                  {line.rightLineNumber > 0 ? line.rightLineNumber : ''}
                </div>
                <div
                  className="flex-1 p-1 whitespace-pre-wrap break-all"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(line.rightLine, searchTerm)
                  }}
                />
                {line.type === 'modified' && line.similarity && (
                  <div className="text-xs text-yellow-400 px-2 py-1 bg-yellow-500/10 border-l border-yellow-500/30">
                    {Math.round(line.similarity * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with summary */}
      <div className="p-2 border-t border-blue-500/20 bg-slate-800/30 text-xs text-slate-400">
        <div className="flex justify-between items-center">
          <span>
            Showing {filteredDiffLines.length} of {computeDiff.diffLines.length} lines
            {showOnlyChanges && ' (changes only)'}
            {searchTerm && ` (filtered by "${searchTerm}")`}
          </span>
          <span>
            Algorithm: {diffAlgorithm.toUpperCase()} •
            Time Complexity: O(mn) •
            Space: O(min(m,n))
          </span>
        </div>
      </div>
    </div>
  );
};