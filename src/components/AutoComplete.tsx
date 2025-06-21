
import React, { useState, useEffect } from 'react';

interface AutoCompleteProps {
  position: { x: number; y: number };
  currentWord: string;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
}

export const AutoComplete: React.FC<AutoCompleteProps> = ({
  position,
  currentWord,
  onSelect,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Trie-based suggestions (simplified)
  const allSuggestions = [
    'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef',
    'React', 'ReactDOM', 'Component', 'Fragment',
    'console', 'document', 'window', 'setTimeout', 'setInterval',
    'function', 'const', 'let', 'var', 'return', 'import', 'export',
    'interface', 'type', 'class', 'extends', 'implements'
  ];

  useEffect(() => {
    const filtered = allSuggestions.filter(suggestion =>
      suggestion.toLowerCase().startsWith(currentWord.toLowerCase())
    ).slice(0, 8);
    
    setSuggestions(filtered);
    setSelectedIndex(0);
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
      className="fixed z-50 bg-slate-800/90 backdrop-blur-lg border border-blue-500/30 rounded-lg shadow-2xl glow-border"
      style={{
        left: position.x,
        top: position.y + 20,
        minWidth: '200px',
        maxHeight: '200px',
        overflow: 'hidden'
      }}
    >
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
          <span className="font-mono text-sm">{suggestion}</span>
          <span className="text-xs text-slate-500 ml-2">
            {suggestion.startsWith('use') ? 'Hook' : 
             suggestion.match(/^[A-Z]/) ? 'Component' : 'Keyword'}
          </span>
        </div>
      ))}
    </div>
  );
};
