
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Trie } from '@/utils/trieDataStructure';

interface AutoCompleteProps {
  position: { x: number; y: number };
  currentWord: string;
  onSelect: (suggestion: string, replaceLength: number) => void;
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

// Global Trie instance
const globalTrie = new Trie();

// Built-in suggestions for different contexts
const BUILTIN_SUGGESTIONS: Record<string, Suggestion[]> = {
  javascript: [
    { text: 'console.log', type: 'method', frequency: 100, score: 0, source: 'builtin', description: 'Output to console', icon: '📝' },
    { text: 'setTimeout', type: 'function', frequency: 90, score: 0, source: 'builtin', description: 'Delay execution', icon: '⏰' },
    { text: 'addEventListener', type: 'method', frequency: 85, score: 0, source: 'builtin', description: 'Add event listener', icon: '🎧' },
    { text: 'querySelector', type: 'method', frequency: 80, score: 0, source: 'builtin', description: 'Select DOM element', icon: '🔍' },
    { text: 'fetch', type: 'function', frequency: 95, score: 0, source: 'builtin', description: 'HTTP request', icon: '🌐' }
  ],
  react: [
    { text: 'useState', type: 'function', frequency: 100, score: 0, source: 'builtin', description: 'React state hook', icon: '🪝' },
    { text: 'useEffect', type: 'function', frequency: 95, score: 0, source: 'builtin', description: 'React effect hook', icon: '🪝' },
    { text: 'useCallback', type: 'function', frequency: 80, score: 0, source: 'builtin', description: 'Memoized callback', icon: '🪝' },
    { text: 'useMemo', type: 'function', frequency: 75, score: 0, source: 'builtin', description: 'Memoized value', icon: '🪝' },
    { text: 'useRef', type: 'function', frequency: 70, score: 0, source: 'builtin', description: 'React ref hook', icon: '🪝' }
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

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Enhanced search with better matching
  const performSearch = useCallback(async (word: string) => {
    if (word.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const allSuggestions: Suggestion[] = [];

      // 1. Search in Trie
      const trieMatches = globalTrie.searchPrefix(word);
      trieMatches.forEach(match => {
        if (match !== word) { // Don't suggest the exact current word
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
        }
      });

      // 2. Built-in language suggestions
      const fileType = context?.fileType || 'javascript';
      const builtinSuggestions = getBuiltinSuggestions(word, fileType);
      allSuggestions.push(...builtinSuggestions);

      // 3. Remove duplicates and sort by score
      const uniqueSuggestions = removeDuplicates(allSuggestions);
      const sortedSuggestions = uniqueSuggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setSuggestions(sortedSuggestions);
      setSelectedIndex(0);

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
    const timeoutId = setTimeout(() => {
      performSearch(currentWord);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [currentWord, performSearch]);

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
    }
  }, [suggestions, selectedIndex, onClose]);

  // Fixed selection handling to prevent duplication
  const handleSelect = useCallback((suggestion: Suggestion) => {
    // Calculate how much of the current word should be replaced
    const replaceLength = currentWord.length;
    onSelect(suggestion.text, replaceLength);
    
    // Increase frequency for selected item
    globalTrie.insert(suggestion.text);
  }, [currentWord, onSelect]);

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
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y + 20, window.innerHeight - 300),
        minWidth: '280px',
        maxWidth: '350px'
      }}
    >
      {/* Header */}
      <div className="p-2 border-b border-blue-500/20 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-blue-400 font-semibold flex items-center gap-2">
            🔤 Autocomplete
            {isLoading && <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full" />}
          </span>
          <div className="text-xs text-slate-400">
            {suggestions.length > 0 ? `${selectedIndex + 1}/${suggestions.length}` : '0/0'}
          </div>
        </div>
      </div>

      {/* Suggestions list */}
      <div className="max-h-64 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.text}-${suggestion.source}-${index}`}
            ref={index === selectedIndex ? selectedItemRef : null}
            className={`px-3 py-2 cursor-pointer transition-all duration-200 border-l-2 ${
              index === selectedIndex
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
              {suggestion.frequency > 1 && (
                <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                  {suggestion.frequency}×
                </span>
              )}
            </div>

            {suggestion.description && (
              <div className="text-xs text-slate-400 mt-1 truncate">
                {suggestion.description}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-blue-500/20 bg-slate-800/30">
        <div className="text-xs text-slate-500 text-center">
          ↑↓ Navigate • Enter/Tab Select • Esc Close
        </div>
      </div>
    </div>
  );
};

// Helper functions
function inferSuggestionType(text: string, context?: any): Suggestion['type'] {
  if (text.startsWith('use') && text.length > 3 && /^use[A-Z]/.test(text)) return 'function';
  if (text.includes('.') && !text.startsWith('.')) return 'method';
  if (text.match(/^[A-Z][a-zA-Z]*$/)) return 'class';
  if (text.match(/^I[A-Z][a-zA-Z]*$/)) return 'interface';
  if (text.match(/^[a-z][a-zA-Z]*Type$/)) return 'type';
  if (text.endsWith('()')) return 'function';
  return 'variable';
}

function calculateScore(suggestion: string, query: string, frequency: number, source: 'trie' | 'context' | 'builtin'): number {
  let score = 0;

  // Exact match bonus
  if (suggestion.toLowerCase() === query.toLowerCase()) {
    score += 100;
  }

  // Prefix match bonus
  if (suggestion.toLowerCase().startsWith(query.toLowerCase())) {
    score += 50;
  }

  // Frequency bonus
  score += Math.log(frequency + 1) * 10;

  // Source bonus
  switch (source) {
    case 'context': score += 30; break;
    case 'builtin': score += 20; break;
    case 'trie': score += 10; break;
  }

  // Length penalty (prefer shorter matches)
  score -= suggestion.length * 0.5;

  return Math.max(0, score);
}

function getBuiltinSuggestions(word: string, fileType: string): Suggestion[] {
  const builtins = BUILTIN_SUGGESTIONS[fileType] || BUILTIN_SUGGESTIONS.javascript;
  return builtins
    .filter(s => s.text.toLowerCase().includes(word.toLowerCase()) && s.text !== word)
    .map(s => ({ ...s, score: calculateScore(s.text, word, s.frequency, s.source) }));
}

function removeDuplicates(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = s.text;
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

function generateDescription(word: string, context?: any): string {
  if (word.startsWith('use') && word.length > 3) return 'React Hook';
  if (word.endsWith('Component')) return 'React Component';
  if (word.includes('console')) return 'Console method';
  if (word.includes('document')) return 'DOM method';
  if (word.match(/^[A-Z]/)) return 'Constructor or Class';
  return 'Variable or function';
}
