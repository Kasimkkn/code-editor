
import React, { useState, useRef, useEffect } from 'react';
import { AutoComplete } from './AutoComplete';

interface CodePanelProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
}

export const CodePanel: React.FC<CodePanelProps> = ({ code, onChange, language }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompletePosition, setAutoCompletePosition] = useState({ x: 0, y: 0 });
  const [currentWord, setCurrentWord] = useState('');

  // Syntax highlighting function
  const highlightSyntax = (code: string) => {
    const keywords = ['import', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'export', 'default', 'interface', 'type', 'useState', 'useEffect'];
    const strings = /(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g;
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
    const numbers = /\b\d+\.?\d*\b/g;

    let highlighted = code;
    
    // Highlight strings
    highlighted = highlighted.replace(strings, '<span class="text-green-400">$&</span>');
    
    // Highlight comments
    highlighted = highlighted.replace(comments, '<span class="text-gray-500 italic">$&</span>');
    
    // Highlight numbers
    highlighted = highlighted.replace(numbers, '<span class="text-yellow-400">$&</span>');
    
    // Highlight keywords
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-blue-400 font-semibold">${keyword}</span>`);
    });

    return highlighted;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    onChange(newCode);

    // Update cursor position
    const textarea = e.target;
    const lines = newCode.substring(0, textarea.selectionStart).split('\n');
    setCursorPosition({
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    });

    // Auto-complete logic
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = newCode.substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (currentWord.length > 1) {
      setCurrentWord(currentWord);
      setShowAutoComplete(true);
      
      // Calculate position for autocomplete dropdown
      const rect = textarea.getBoundingClientRect();
      setAutoCompletePosition({
        x: rect.left,
        y: rect.top + 20
      });
    } else {
      setShowAutoComplete(false);
    }
  };

  const lines = code.split('\n');

  return (
    <div className="flex-1 relative bg-slate-900/30 backdrop-blur-sm glow-border">
      {/* Line Numbers */}
      <div className="absolute left-0 top-0 w-12 bg-slate-800/50 border-r border-blue-500/20 p-2 text-sm text-slate-400 font-mono leading-6">
        {lines.map((_, index) => (
          <div key={index} className="text-right pr-2">
            {index + 1}
          </div>
        ))}
      </div>

      {/* Code Display (Syntax Highlighted) */}
      <div className="absolute left-12 top-0 right-0 p-4 font-mono text-sm leading-6 pointer-events-none overflow-hidden">
        <pre 
          className="whitespace-pre-wrap text-white"
          dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }}
        />
      </div>

      {/* Code Input */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={handleInputChange}
        className="absolute left-12 top-0 right-0 w-full h-full p-4 bg-transparent text-transparent caret-blue-400 font-mono text-sm leading-6 resize-none outline-none selection:bg-blue-500/30"
        style={{
          caretColor: '#60a5fa',
          textShadow: '0 0 8px rgba(96, 165, 250, 0.5)'
        }}
        spellCheck={false}
      />

      {/* Cursor Glow Effect */}
      <div 
        className="absolute pointer-events-none w-0.5 h-6 bg-blue-400 animate-pulse"
        style={{
          left: `calc(3rem + ${cursorPosition.column * 0.6}em)`,
          top: `calc(1rem + ${(cursorPosition.line - 1) * 1.5}rem)`,
          boxShadow: '0 0 10px rgba(96, 165, 250, 0.8), 0 0 20px rgba(96, 165, 250, 0.4)'
        }}
      />

      {/* Auto Complete Dropdown */}
      {showAutoComplete && (
        <AutoComplete
          position={autoCompletePosition}
          currentWord={currentWord}
          onSelect={(suggestion) => {
            // Handle auto-complete selection
            setShowAutoComplete(false);
          }}
          onClose={() => setShowAutoComplete(false)}
        />
      )}
    </div>
  );
};
