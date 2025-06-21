import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp, RotateCcw, Zap, History, Settings } from 'lucide-react';
import { KMPMatcher, BoyerMooreMatcher, RabinKarpMatcher, AhoCorasickMatcher } from '@/utils/stringAlgorithms';

interface FindReplaceProps {
  onClose: () => void;
  code: string;
  onHighlight: (matches: number[]) => void;
  onReplace: (newCode: string) => void;
}

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  multiline: boolean;
  preserveCase: boolean;
}

interface SearchResult {
  index: number;
  length: number;
  text: string;
  line: number;
  column: number;
}

interface SearchHistory {
  pattern: string;
  replacement: string;
  timestamp: number;
  matchCount: number;
}

interface AlgorithmPerformance {
  algorithm: string;
  searchTime: number;
  matchCount: number;
  patternLength: number;
  textLength: number;
}

export const FindReplace: React.FC<FindReplaceProps> = ({
  onClose,
  code,
  onHighlight,
  onReplace
}) => {
  // Search state
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    multiline: false,
    preserveCase: false
  });

  // Algorithm and performance
  const [algorithm, setAlgorithm] = useState<'kmp' | 'boyer-moore' | 'rabin-karp' | 'aho-corasick' | 'native'>('kmp');
  const [performanceData, setPerformanceData] = useState<AlgorithmPerformance[]>([]);
  const [benchmarkMode, setBenchmarkMode] = useState(false);

  // Search results and navigation
  const [matches, setMatches] = useState<SearchResult[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Refs for performance optimization
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Memoized algorithm instances
  const algorithmInstances = useMemo(() => {
    if (!findText) return null;

    const processedPattern = options.caseSensitive ? findText : findText.toLowerCase();

    return {
      kmp: new KMPMatcher(processedPattern, options.caseSensitive),
      boyerMoore: new BoyerMooreMatcher(processedPattern, options.caseSensitive),
      rabinKarp: new RabinKarpMatcher([processedPattern], options.caseSensitive),
      ahoCorasick: new AhoCorasickMatcher([processedPattern])
    };
  }, [findText, options.caseSensitive]);

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();

    // Focus find input
    if (findInputRef.current) {
      findInputRef.current.focus();
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (findText.length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 300);
    } else {
      setMatches([]);
      onHighlight([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [findText, code, options, algorithm]);

  // Enhanced search function with multiple algorithm support
  const performSearch = useCallback(async () => {
    if (!findText) return;

    setIsSearching(true);
    const startTime = performance.now();

    try {
      let foundMatches: number[] = [];
      let searchResults: SearchResult[] = [];

      if (options.useRegex) {
        const results = performRegexSearch();
        foundMatches = results.map(r => r.index);
        searchResults = results;
      } else if (benchmarkMode) {
        const results = await performBenchmarkSearch();
        foundMatches = results.matches.map(r => r.index);
        searchResults = results.matches;
      } else {
        const results = performAlgorithmSearch();
        foundMatches = results.map(r => r.index);
        searchResults = results;
      }

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      // Update performance data
      if (benchmarkMode || algorithm !== 'native') {
        setPerformanceData(prev => [...prev.slice(-9), {
          algorithm,
          searchTime,
          matchCount: foundMatches.length,
          patternLength: findText.length,
          textLength: code.length
        }]);
      }

      setMatches(searchResults);
      setCurrentMatch(0);
      onHighlight(foundMatches);

    } catch (error) {
      console.error('Search failed:', error);
      setMatches([]);
      onHighlight([]);
    } finally {
      setIsSearching(false);
    }
  }, [findText, code, options, algorithm, benchmarkMode]);

  // Benchmark all algorithms
  const performBenchmarkSearch = useCallback(async (): Promise<{ matches: SearchResult[]; performance: AlgorithmPerformance[] }> => {
    const algorithms = ['kmp', 'boyer-moore', 'rabin-karp', 'aho-corasick', 'native'] as const;
    const benchmarkResults: AlgorithmPerformance[] = [];
    let bestMatches: SearchResult[] = [];

    for (const algo of algorithms) {
      const startTime = performance.now();
      let matches: SearchResult[] = [];

      try {
        if (algo === 'native') {
          matches = performNativeSearch();
        } else {
          const indices = performAlgorithmSearchWithAlgo(algo);
          matches = convertIndicesToResults(indices);
        }

        const endTime = performance.now();

        benchmarkResults.push({
          algorithm: algo,
          searchTime: endTime - startTime,
          matchCount: matches.length,
          patternLength: findText.length,
          textLength: code.length
        });

        if (matches.length > 0 && bestMatches.length === 0) {
          bestMatches = matches;
        }

      } catch (error) {
        console.error(`${algo} algorithm failed:`, error);
      }
    }

    setPerformanceData(prev => [...prev, ...benchmarkResults]);
    return { matches: bestMatches, performance: benchmarkResults };
  }, [findText, code, options]);

  // Algorithm-specific search
  const performAlgorithmSearch = useCallback((): SearchResult[] => {
    const indices = performAlgorithmSearchWithAlgo(algorithm);
    return convertIndicesToResults(indices);
  }, [algorithm, findText, code, options]);

  const performAlgorithmSearchWithAlgo = useCallback((algo: string): number[] => {
    if (!algorithmInstances) return [];

    const searchText = options.caseSensitive ? code : code.toLowerCase();
    let foundMatches: number[] = [];

    try {
      switch (algo) {
        case 'kmp':
          foundMatches = algorithmInstances.kmp.findAll(searchText);
          break;
        case 'boyer-moore':
          foundMatches = algorithmInstances.boyerMoore.findAll(searchText);
          break;
        case 'rabin-karp':
          const rabinResults = algorithmInstances.rabinKarp.findAllPatterns(searchText);
          foundMatches = rabinResults.length > 0 ? rabinResults[0].positions : [];
          break;
        case 'aho-corasick':
          const ahoResults = algorithmInstances.ahoCorasick.findAllMatches(searchText);
          foundMatches = ahoResults.map(r => r.position);
          break;
        default:
          foundMatches = performNativeSearch().map(r => r.index);
      }
    } catch (error) {
      console.error(`${algo} search failed:`, error);
      foundMatches = [];
    }

    return foundMatches;
  }, [algorithmInstances, code, options]);

  // Native JavaScript search for comparison
  const performNativeSearch = useCallback((): SearchResult[] => {
    const searchText = options.caseSensitive ? code : code.toLowerCase();
    const pattern = options.caseSensitive ? findText : findText.toLowerCase();
    const results: SearchResult[] = [];

    let index = 0;
    while ((index = searchText.indexOf(pattern, index)) !== -1) {
      results.push(convertIndexToResult(index));
      index += pattern.length;
    }

    return results;
  }, [code, findText, options.caseSensitive]);

  // Regex search with enhanced features
  const performRegexSearch = useCallback((): SearchResult[] => {
    try {
      let pattern = findText;

      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const flags = [
        options.caseSensitive ? '' : 'i',
        'g', // global
        options.multiline ? 'm' : ''
      ].join('');

      const regex = new RegExp(pattern, flags);
      const results: SearchResult[] = [];
      let match: RegExpExecArray | null;

      while ((match = regex.exec(code)) !== null) {
        results.push(convertIndexToResult(match.index, match[0].length));

        // Prevent infinite loop on zero-length matches
        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }

      return results;
    } catch (error) {
      console.error('Invalid regex pattern:', error);
      return [];
    }
  }, [code, findText, options]);

  // Convert match indices to SearchResult objects
  const convertIndicesToResults = useCallback((indices: number[]): SearchResult[] => {
    return indices.map(index => convertIndexToResult(index));
  }, [findText]);

  const convertIndexToResult = useCallback((index: number, length?: number): SearchResult => {
    const matchLength = length || findText.length;
    const textBeforeMatch = code.substring(0, index);
    const lines = textBeforeMatch.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    return {
      index,
      length: matchLength,
      text: code.substring(index, index + matchLength),
      line,
      column
    };
  }, [code, findText]);

  // Navigation functions
  const navigateMatch = useCallback((direction: 'next' | 'prev') => {
    if (matches.length === 0) return;

    if (direction === 'next') {
      setCurrentMatch(prev => (prev + 1) % matches.length);
    } else {
      setCurrentMatch(prev => (prev - 1 + matches.length) % matches.length);
    }
  }, [matches.length]);

  // Replace functions with enhanced features
  const handleReplace = useCallback(() => {
    if (matches.length === 0 || currentMatch >= matches.length) return;

    const match = matches[currentMatch];
    const before = code.substring(0, match.index);
    const after = code.substring(match.index + match.length);

    let replacement = replaceText;

    // Preserve case feature
    if (options.preserveCase && !options.caseSensitive) {
      replacement = preserveCase(match.text, replaceText);
    }

    const newCode = before + replacement + after;
    onReplace(newCode);

    // Add to history
    addToHistory(findText, replaceText, 1);
  }, [matches, currentMatch, code, replaceText, options.preserveCase, findText]);

  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0) return;

    let newCode = code;
    const lengthDiff = replaceText.length - findText.length;
    let totalOffset = 0;

    // Replace from end to start to maintain indices
    const sortedMatches = [...matches].sort((a, b) => b.index - a.index);

    for (const match of sortedMatches) {
      const adjustedIndex = match.index;
      const before = newCode.substring(0, adjustedIndex);
      const after = newCode.substring(adjustedIndex + match.length);

      let replacement = replaceText;

      // Preserve case feature
      if (options.preserveCase && !options.caseSensitive) {
        replacement = preserveCase(match.text, replaceText);
      }

      newCode = before + replacement + after;
    }

    onReplace(newCode);

    // Add to history
    addToHistory(findText, replaceText, matches.length);
  }, [matches, code, replaceText, findText, options.preserveCase]);

  // Case preservation utility
  const preserveCase = useCallback((original: string, replacement: string): string => {
    if (original.length === 0) return replacement;

    // All uppercase
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase();
    }

    // All lowercase
    if (original === original.toLowerCase()) {
      return replacement.toLowerCase();
    }

    // Title case (first letter uppercase)
    if (original[0] === original[0].toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
    }

    // Mixed case - try to preserve pattern
    let result = '';
    for (let i = 0; i < replacement.length; i++) {
      if (i < original.length) {
        result += original[i] === original[i].toUpperCase()
          ? replacement[i].toUpperCase()
          : replacement[i].toLowerCase();
      } else {
        result += replacement[i];
      }
    }

    return result;
  }, []);

  // History management
  const addToHistory = useCallback((pattern: string, replacement: string, matchCount: number) => {
    const newEntry: SearchHistory = {
      pattern,
      replacement,
      timestamp: Date.now(),
      matchCount
    };

    setSearchHistory(prev => {
      const updated = [newEntry, ...prev.filter(entry =>
        entry.pattern !== pattern || entry.replacement !== replacement
      )].slice(0, 20); // Keep last 20 entries

      localStorage.setItem('cosmic-find-replace-history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadSearchHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem('cosmic-find-replace-history');
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  const applyHistoryEntry = useCallback((entry: SearchHistory) => {
    setFindText(entry.pattern);
    setReplaceText(entry.replacement);
    setShowHistory(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          navigateMatch('prev');
        } else if (e.ctrlKey || e.metaKey) {
          handleReplaceAll();
        } else {
          navigateMatch('next');
        }
        e.preventDefault();
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          navigateMatch('prev');
        } else {
          navigateMatch('next');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, navigateMatch, handleReplaceAll]);

  // Get algorithm performance color
  const getPerformanceColor = useCallback((time: number) => {
    if (time < 1) return 'text-green-400';
    if (time < 5) return 'text-yellow-400';
    if (time < 10) return 'text-orange-400';
    return 'text-red-400';
  }, []);

  // Format time for display
  const formatTime = useCallback((time: number) => {
    return time < 1 ? '<1ms' : `${time.toFixed(1)}ms`;
  }, []);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border-b border-blue-500/20 p-4 glow-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Advanced Find & Replace
          </h3>
          {isSearching && (
            <div className="animate-spin w-4 h-4 border border-blue-400 border-t-transparent rounded-full"></div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded transition-colors ${showHistory ? 'bg-blue-500/30 text-blue-300' : 'text-slate-400 hover:text-white'
              }`}
            title="Search History"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2 rounded transition-colors ${showAdvanced ? 'bg-purple-500/30 text-purple-300' : 'text-slate-400 hover:text-white'
              }`}
            title="Advanced Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search History Panel */}
      {showHistory && (
        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-blue-500/20">
          <h4 className="text-xs font-semibold text-blue-400 mb-2">Recent Searches</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {searchHistory.length > 0 ? (
              searchHistory.map((entry, index) => (
                <div
                  key={index}
                  onClick={() => applyHistoryEntry(entry)}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-700/50 cursor-pointer text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-mono truncate">"{entry.pattern}"</div>
                    {entry.replacement && (
                      <div className="text-slate-400 font-mono truncate">→ "{entry.replacement}"</div>
                    )}
                  </div>
                  <div className="text-slate-500 ml-2">
                    {entry.matchCount} matches
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-2">No search history</div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-purple-400">Algorithm Settings</h4>
            <label className="flex items-center space-x-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={benchmarkMode}
                onChange={(e) => setBenchmarkMode(e.target.checked)}
                className="rounded"
              />
              <span>Benchmark Mode</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Search Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as any)}
                className="w-full text-xs bg-slate-700 text-white border border-purple-500/30 rounded px-2 py-1"
              >
                <option value="kmp">KMP - O(n+m)</option>
                <option value="boyer-moore">Boyer-Moore - O(n/m)</option>
                <option value="rabin-karp">Rabin-Karp - O(n+m)</option>
                <option value="aho-corasick">Aho-Corasick - O(n+m+z)</option>
                <option value="native">Native JS - O(nm)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="flex items-center space-x-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={options.multiline}
                  onChange={(e) => setOptions(prev => ({ ...prev, multiline: e.target.checked }))}
                  className="rounded"
                />
                <span>Multiline</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={options.preserveCase}
                  onChange={(e) => setOptions(prev => ({ ...prev, preserveCase: e.target.checked }))}
                  className="rounded"
                />
                <span>Preserve Case</span>
              </label>
            </div>
          </div>

          {/* Performance Display */}
          {performanceData.length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-500/20">
              <h5 className="text-xs font-semibold text-purple-400 mb-2">Performance Metrics</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {performanceData.slice(-4).map((perf, index) => (
                  <div key={index} className="flex justify-between items-center p-1 bg-slate-800/50 rounded">
                    <span className="text-slate-300">{perf.algorithm.toUpperCase()}</span>
                    <span className={getPerformanceColor(perf.searchTime)}>
                      {formatTime(perf.searchTime)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Search Interface */}
      <div className="grid grid-cols-2 gap-4">
        {/* Find Section */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              ref={findInputRef}
              type="text"
              placeholder="Find pattern..."
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="w-full pl-10 pr-20 py-2 bg-slate-900/50 border border-blue-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 glow-border transition-colors font-mono"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <span className="text-xs text-slate-400 min-w-[40px] text-right">
                {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : '0/0'}
              </span>
              <button
                onClick={() => navigateMatch('prev')}
                className="p-1 hover:bg-slate-700 rounded disabled:opacity-50 transition-colors"
                disabled={matches.length === 0}
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="w-3 h-3 text-blue-400" />
              </button>
              <button
                onClick={() => navigateMatch('next')}
                className="p-1 hover:bg-slate-700 rounded disabled:opacity-50 transition-colors"
                disabled={matches.length === 0}
                title="Next match (Enter)"
              >
                <ChevronDown className="w-3 h-3 text-blue-400" />
              </button>
            </div>
          </div>

          {/* Search Options */}
          <div className="flex space-x-3 text-xs">
            <label className="flex items-center space-x-1 text-slate-400 hover:text-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={options.caseSensitive}
                onChange={(e) => setOptions(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                className="rounded"
              />
              <span title="Case Sensitive">Aa</span>
            </label>

            <label className="flex items-center space-x-1 text-slate-400 hover:text-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={options.wholeWord}
                onChange={(e) => setOptions(prev => ({ ...prev, wholeWord: e.target.checked }))}
                className="rounded"
              />
              <span title="Whole Word">Ab</span>
            </label>

            <label className="flex items-center space-x-1 text-slate-400 hover:text-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={options.useRegex}
                onChange={(e) => setOptions(prev => ({ ...prev, useRegex: e.target.checked }))}
                className="rounded"
              />
              <span title="Regular Expression">.*</span>
            </label>
          </div>
        </div>

        {/* Replace Section */}
        <div className="space-y-3">
          <div className="relative">
            <Replace className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input
              ref={replaceInputRef}
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 glow-border transition-colors font-mono"
            />
          </div>

          {/* Replace Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleReplace}
              disabled={matches.length === 0}
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs glow-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Replace current match"
            >
              Replace
            </button>

            <button
              onClick={handleReplaceAll}
              disabled={matches.length === 0}
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs glow-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Replace all matches (Ctrl+Enter)"
            >
              All ({matches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Status and Algorithm Info */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="text-slate-400">
          <span className="font-semibold">Algorithm:</span> {algorithm.toUpperCase()}
          {performanceData.length > 0 && (
            <span className="ml-2">
              • Last search: <span className={getPerformanceColor(performanceData[performanceData.length - 1]?.searchTime || 0)}>
                {formatTime(performanceData[performanceData.length - 1]?.searchTime || 0)}
              </span>
            </span>
          )}
        </div>

        {matches.length > 0 && (
          <div className="text-slate-400">
            <span>Found at lines: </span>
            <span className="font-mono text-blue-400">
              {matches.slice(0, 3).map(m => m.line).join(', ')}
              {matches.length > 3 && '...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};