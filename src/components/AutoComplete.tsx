import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Trie } from '@/utils/trieDataStructure';

interface AutoCompleteProps {
  position: { x: number; y: number };
  currentWord: string;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  context?: {
    previousWords: string[];
    currentLine: string;
    cursorPosition: number;
    fileType: string;
  };
}

interface Suggestion {
  text: string;
  type: 'keyword' | 'function' | 'variable' | 'method' | 'property' | 'class' | 'interface' | 'type' | 'snippet';
  frequency: number;
  score: number;
  source: 'trie' | 'context' | 'builtin';
  description?: string;
  snippet?: string;
  icon?: string;
}

// Global Trie instance with enhanced features
const globalTrie = new Trie();

// Built-in suggestions for different contexts
const BUILTIN_SUGGESTIONS: Record<string, Suggestion[]> = {
  javascript: [
    { text: 'console.log', type: 'method', frequency: 100, score: 0, source: 'builtin', description: 'Output to console', snippet: 'console.log(${1:value})', icon: '📝' },
    { text: 'setTimeout', type: 'function', frequency: 90, score: 0, source: 'builtin', description: 'Delay execution', snippet: 'setTimeout(() => {\n  ${1:// code}\n}, ${2:1000})', icon: '⏰' },
    { text: 'addEventListener', type: 'method', frequency: 85, score: 0, source: 'builtin', description: 'Add event listener', snippet: 'addEventListener(\'${1:event}\', ${2:handler})', icon: '🎧' },
    { text: 'querySelector', type: 'method', frequency: 80, score: 0, source: 'builtin', description: 'Select DOM element', snippet: 'querySelector(\'${1:selector}\')', icon: '🔍' },
    { text: 'fetch', type: 'function', frequency: 95, score: 0, source: 'builtin', description: 'HTTP request', snippet: 'fetch(\'${1:url}\')\n  .then(response => response.json())\n  .then(data => ${2:console.log(data)})', icon: '🌐' }
  ],
  react: [
    { text: 'useState', type: 'function', frequency: 100, score: 0, source: 'builtin', description: 'React state hook', snippet: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue})', icon: '🪝' },
    { text: 'useEffect', type: 'function', frequency: 95, score: 0, source: 'builtin', description: 'React effect hook', snippet: 'useEffect(() => {\n  ${1:// effect}\n  return () => {\n    ${2:// cleanup}\n  }\n}, [${3:dependencies}])', icon: '🪝' },
    { text: 'useCallback', type: 'function', frequency: 80, score: 0, source: 'builtin', description: 'Memoized callback', snippet: 'useCallback(${1:callback}, [${2:dependencies}])', icon: '🪝' },
    { text: 'useMemo', type: 'function', frequency: 75, score: 0, source: 'builtin', description: 'Memoized value', snippet: 'useMemo(() => ${1:computation}, [${2:dependencies}])', icon: '🪝' },
    { text: 'useRef', type: 'function', frequency: 70, score: 0, source: 'builtin', description: 'React ref hook', snippet: 'const ${1:ref} = useRef(${2:initialValue})', icon: '🪝' }
  ]
};

export const AutoComplete: React.FC<AutoCompleteProps> = ({
  position,
  currentWord,
  onSelect,
  onClose,
  context
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStats, setSearchStats] = useState<{ trieMatches: number; contextMatches: number; builtinMatches: number }>({
    trieMatches: 0,
    contextMatches: 0,
    builtinMatches: 0
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Debounced search to prevent excessive computation
  const debouncedSearch = useCallback(
    debounce((word: string) => {
      if (word.length > 0) {
        performSearch(word);
      } else {
        setSuggestions([]);
        setSearchStats({ trieMatches: 0, contextMatches: 0, builtinMatches: 0 });
      }
    }, 150),
    [context]
  );

  // Enhanced search with multiple sources and ranking
  const performSearch = useCallback(async (word: string) => {
    setIsLoading(true);

    try {
      const allSuggestions: Suggestion[] = [];
      let trieCount = 0, contextCount = 0, builtinCount = 0;

      // 1. Search in Trie (O(k) where k is prefix length)
      const trieMatches = globalTrie.searchPrefix(word);
      trieCount = trieMatches.length;

      trieMatches.forEach(match => {
        const frequency = globalTrie.getFrequency(match);
        allSuggestions.push({
          text: match,
          type: inferSuggestionType(match, context),
          frequency,
          score: calculateScore(match, word, frequency, 'trie'),
          source: 'trie',
          description: generateDescription(match, context),
          icon: getTypeIcon(inferSuggestionType(match, context))
        });
      });

      // 2. Fuzzy search in Trie for better matching
      if (word.length >= 3) {
        const fuzzyMatches = globalTrie.fuzzySearch(word, 2);
        fuzzyMatches.forEach(match => {
          if (!trieMatches.includes(match)) {
            const frequency = globalTrie.getFrequency(match);
            allSuggestions.push({
              text: match,
              type: inferSuggestionType(match, context),
              frequency,
              score: calculateScore(match, word, frequency, 'trie') * 0.8, // Lower score for fuzzy
              source: 'trie',
              description: `Fuzzy match: ${generateDescription(match, context)}`,
              icon: getTypeIcon(inferSuggestionType(match, context))
            });
          }
        });
      }

      // 3. Context-aware suggestions
      if (context) {
        const contextSuggestions = getContextualSuggestions(word, context);
        contextCount = contextSuggestions.length;
        allSuggestions.push(...contextSuggestions);
      }

      // 4. Built-in language suggestions
      const fileType = context?.fileType || 'javascript';
      const builtinSuggestions = getBuiltinSuggestions(word, fileType);
      builtinCount = builtinSuggestions.length;
      allSuggestions.push(...builtinSuggestions);

      // 5. Remove duplicates and sort by score
      const uniqueSuggestions = removeDuplicates(allSuggestions);
      const sortedSuggestions = uniqueSuggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 15); // Limit to top 15 suggestions

      setSuggestions(sortedSuggestions);
      setSelectedIndex(0);
      setSearchStats({ trieMatches: trieCount, contextMatches: contextCount, builtinMatches: builtinCount });

      // Learn from user's typing patterns
      if (word.length > 2) {
        globalTrie.insert(word);
      }

    } catch (error) {
      console.error('Error in autocomplete search:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  // Perform search when currentWord changes
  useEffect(() => {
    debouncedSearch(currentWord);
    return () => debouncedSearch.cancel?.();
  }, [currentWord, debouncedSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'PageDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 5, suggestions.length - 1));
        break;
      case 'PageUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 5, 0));
        break;
    }
  }, [suggestions, selectedIndex, onClose]);

  // Enhanced selection handling with snippet support
  const handleSelect = useCallback((suggestion: Suggestion) => {
    if (suggestion.snippet) {
      // Handle snippet insertion (simplified - in real implementation, cursor positioning would be more complex)
      const snippetText = suggestion.snippet.replace(/\$\{\d+:?([^}]*)\}/g, '$1');
      onSelect(snippetText);
    } else {
      onSelect(suggestion.text);
    }

    // Increase frequency for selected item
    globalTrie.insert(suggestion.text);
  }, [onSelect]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-slate-800/95 backdrop-blur-lg border border-blue-500/30 rounded-lg shadow-2xl glow-border max-h-80 overflow-hidden"
      style={{
        left: Math.min(position.x, window.innerWidth - 400),
        top: Math.min(position.y + 20, window.innerHeight - 300),
        minWidth: '320px',
        maxWidth: '450px'
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-blue-500/20 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-blue-400 font-semibold flex items-center gap-2">
            🔤 Smart Autocomplete
            {isLoading && <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full" />}
          </span>
          <div className="text-xs text-slate-400">
            {suggestions.length > 0 ? `${selectedIndex + 1}/${suggestions.length}` : '0/0'}
          </div>
        </div>

        {/* Search statistics */}
        <div className="mt-2 flex gap-4 text-xs text-slate-500">
          <span>Trie: {searchStats.trieMatches}</span>
          <span>Context: {searchStats.contextMatches}</span>
          <span>Built-in: {searchStats.builtinMatches}</span>
        </div>
      </div>

      {/* Suggestions list */}
      <div className="max-h-64 overflow-y-auto scroll-glow">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.text}-${suggestion.source}-${index}`}
            ref={index === selectedIndex ? selectedItemRef : null}
            className={`px-3 py-2 cursor-pointer transition-all duration-200 border-l-2 ${index === selectedIndex
                ? 'bg-blue-500/30 text-blue-300 glow-text border-blue-400'
                : 'text-slate-300 hover:bg-slate-700/50 border-transparent hover:border-slate-600'
              }`}
            onClick={() => handleSelect(suggestion)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm">{suggestion.icon}</span>
                <span className="font-mono text-sm font-medium truncate">
                  {highlightMatch(suggestion.text, currentWord)}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded text-slate-800 font-medium ${getTypeBadgeColor(suggestion.type)}`}>
                  {suggestion.type}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {suggestion.frequency > 1 && (
                  <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                    {suggestion.frequency}×
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {suggestion.source === 'trie' ? '📚' : suggestion.source === 'context' ? '🧠' : '⚡'}
                </span>
              </div>
            </div>

            {suggestion.description && (
              <div className="text-xs text-slate-400 mt-1 truncate">
                {suggestion.description}
              </div>
            )}

            {suggestion.snippet && index === selectedIndex && (
              <div className="text-xs text-slate-500 mt-2 p-2 bg-slate-900/50 rounded border font-mono whitespace-pre-wrap">
                {formatSnippetPreview(suggestion.snippet)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer with shortcuts */}
      <div className="p-2 border-t border-blue-500/20 bg-slate-800/30">
        <div className="flex justify-between text-xs text-slate-500">
          <span>↑↓ Navigate • Enter/Tab Select • Esc Close</span>
          <span>Algorithm: Trie + Fuzzy + Context</span>
        </div>
      </div>
    </div>
  );
};

// Helper functions

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel?: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  }) as T & { cancel?: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

function inferSuggestionType(text: string, context?: any): Suggestion['type'] {
  if (text.startsWith('use') && text.length > 3 && /^use[A-Z]/.test(text)) return 'function';
  if (text.includes('.') && !text.startsWith('.')) return 'method';
  if (text.match(/^[A-Z][a-zA-Z]*$/)) return 'class';
  if (text.match(/^I[A-Z][a-zA-Z]*$/)) return 'interface';
  if (text.match(/^[a-z][a-zA-Z]*Type$/)) return 'type';
  if (text.endsWith('()')) return 'function';
  if (context?.previousWords?.includes('function')) return 'function';
  if (context?.previousWords?.includes('class')) return 'class';
  if (context?.previousWords?.includes('interface')) return 'interface';
  if (context?.previousWords?.includes('type')) return 'type';
  return 'variable';
}

function calculateScore(
  suggestion: string,
  query: string,
  frequency: number,
  source: 'trie' | 'context' | 'builtin'
): number {
  let score = 0;

  // Exact match bonus
  if (suggestion.toLowerCase() === query.toLowerCase()) {
    score += 100;
  }

  // Prefix match bonus
  if (suggestion.toLowerCase().startsWith(query.toLowerCase())) {
    score += 50;
  }

  // Frequency bonus (logarithmic scale)
  score += Math.log(frequency + 1) * 10;

  // Source bonus
  switch (source) {
    case 'context': score += 30; break;
    case 'builtin': score += 20; break;
    case 'trie': score += 10; break;
  }

  // Length penalty (prefer shorter matches)
  score -= suggestion.length * 0.5;

  // Common words bonus
  const commonWords = ['useState', 'useEffect', 'console', 'function', 'const', 'let'];
  if (commonWords.includes(suggestion)) {
    score += 25;
  }

  return Math.max(0, score);
}

function getContextualSuggestions(word: string, context: any): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Previous words context
  if (context.previousWords) {
    const lastWord = context.previousWords[context.previousWords.length - 1];

    if (lastWord === 'import') {
      suggestions.push(
        { text: 'React', type: 'class', frequency: 50, score: 0, source: 'context', description: 'React library', icon: '⚛️' },
        { text: 'useState', type: 'function', frequency: 45, score: 0, source: 'context', description: 'React hook import', icon: '🪝' }
      );
    }

    if (lastWord === 'export') {
      suggestions.push(
        { text: 'default', type: 'keyword', frequency: 40, score: 0, source: 'context', description: 'Default export', icon: '📤' },
        { text: 'const', type: 'keyword', frequency: 35, score: 0, source: 'context', description: 'Named export', icon: '📤' }
      );
    }
  }

  // Current line context
  if (context.currentLine) {
    if (context.currentLine.includes('console.')) {
      suggestions.push(
        { text: 'log', type: 'method', frequency: 30, score: 0, source: 'context', description: 'Console log method', icon: '📝' },
        { text: 'error', type: 'method', frequency: 25, score: 0, source: 'context', description: 'Console error method', icon: '❌' },
        { text: 'warn', type: 'method', frequency: 20, score: 0, source: 'context', description: 'Console warn method', icon: '⚠️' }
      );
    }

    if (context.currentLine.includes('document.')) {
      suggestions.push(
        { text: 'getElementById', type: 'method', frequency: 35, score: 0, source: 'context', description: 'Get element by ID', icon: '🔍' },
        { text: 'querySelector', type: 'method', frequency: 40, score: 0, source: 'context', description: 'Query selector', icon: '🔍' },
        { text: 'addEventListener', type: 'method', frequency: 30, score: 0, source: 'context', description: 'Add event listener', icon: '🎧' }
      );
    }
  }

  return suggestions
    .filter(s => s.text.toLowerCase().includes(word.toLowerCase()))
    .map(s => ({ ...s, score: calculateScore(s.text, word, s.frequency, s.source) }));
}

function getBuiltinSuggestions(word: string, fileType: string): Suggestion[] {
  const builtins = BUILTIN_SUGGESTIONS[fileType] || BUILTIN_SUGGESTIONS.javascript;

  return builtins
    .filter(s => s.text.toLowerCase().includes(word.toLowerCase()))
    .map(s => ({ ...s, score: calculateScore(s.text, word, s.frequency, s.source) }));
}

function removeDuplicates(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = `${s.text}-${s.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTypeIcon(type: Suggestion['type']): string {
  const icons: Record<Suggestion['type'], string> = {
    'keyword': '🔑',
    'function': '⚡',
    'variable': '📦',
    'method': '🔧',
    'property': '🏷️',
    'class': '🏗️',
    'interface': '📋',
    'type': '🏷️',
    'snippet': '📝'
  };
  return icons[type] || '📄';
}

function getTypeBadgeColor(type: Suggestion['type']): string {
  const colors: Record<Suggestion['type'], string> = {
    'keyword': 'bg-purple-400',
    'function': 'bg-blue-400',
    'variable': 'bg-green-400',
    'method': 'bg-cyan-400',
    'property': 'bg-orange-400',
    'class': 'bg-red-400',
    'interface': 'bg-pink-400',
    'type': 'bg-yellow-400',
    'snippet': 'bg-indigo-400'
  };
  return colors[type] || 'bg-slate-400';
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-400/30 text-yellow-300 rounded px-0.5">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

function formatSnippetPreview(snippet: string): string {
  return snippet
    .replace(/\$\{\d+:([^}]*)\}/g, '⎮$1⎮')
    .replace(/\$\{\d+\}/g, '⎮⎮')
    .replace(/\n/g, '\n');
}

function generateDescription(word: string, context?: any): string {
  // Simple description generation - could be enhanced with AI/ML
  if (word.startsWith('use') && word.length > 3) return 'React Hook';
  if (word.endsWith('Component')) return 'React Component';
  if (word.includes('console')) return 'Console method';
  if (word.includes('document')) return 'DOM method';
  if (word.match(/^[A-Z]/)) return 'Constructor or Class';
  return 'Variable or function';
}