
import React, { useState, useEffect } from 'react';
import { Trie } from '@/utils/trieDataStructure';

interface AutoCompleteProps {
  position: { x: number; y: number };
  currentWord: string;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
}

// Global Trie instance
const globalTrie = new Trie();

export const AutoComplete: React.FC<AutoCompleteProps> = ({
  position,
  currentWord,
  onSelect,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (currentWord.length > 0) {
      // Use Trie for O(k) prefix search where k is prefix length
      const trieSuggestions = globalTrie.searchPrefix(currentWord);
      setSuggestions(trieSuggestions);
      setSelectedIndex(0);
      
      // Add current word to Trie for future suggestions
      if (currentWord.length > 2) {
        globalTrie.insert(currentWord);
      }
    } else {
      setSuggestions([]);
    }
  }, [currentWord]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        onSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex]);

  if (suggestions.length === 0) return null;

  return (
    <div 
      className="fixed z-50 bg-slate-800/90 backdrop-blur-lg border border-blue-500/30 rounded-lg shadow-2xl glow-border max-h-64 overflow-y-auto scroll-glow"
      style={{
        left: position.x,
        top: position.y + 20,
        minWidth: '200px'
      }}
    >
      <div className="p-2 border-b border-blue-500/20">
        <span className="text-xs text-blue-400 font-semibold">🔤 Trie-Powered Suggestions</span>
      </div>
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion}
          className={`px-3 py-2 cursor-pointer transition-all duration-200 ${
            index === selectedIndex
              ? 'bg-blue-500/30 text-blue-300 glow-text'
              : 'text-slate-300 hover:bg-slate-700/50'
          }`}
          onClick={() => onSelect(suggestion)}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">{suggestion}</span>
            <span className="text-xs text-slate-500">
              {suggestion.startsWith('use') ? '🪝' : 
               suggestion.match(/^[A-Z]/) ? '🧩' : '⚡'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Prefix match: O(k) time complexity
          </div>
        </div>
      ))}
    </div>
  );
};
