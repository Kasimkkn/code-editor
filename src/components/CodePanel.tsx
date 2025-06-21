
import React, { useState, useRef, useEffect } from 'react';
import { AutoComplete } from './AutoComplete';
import { SyntaxHighlighter } from '@/utils/syntaxHighlighter';
import { BracketMatcher } from '@/utils/editorAlgorithms';
import { EditorHistory, TextChangeCommand } from '@/utils/editorAlgorithms';
import { MultiCursorManager, CursorPosition } from '@/utils/editorAlgorithms';

interface CodePanelProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  searchMatches?: number[];
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CodePanel: React.FC<CodePanelProps> = ({ 
  code, 
  onChange, 
  language, 
  searchMatches = [],
  onUndo,
  onRedo 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompletePosition, setAutoCompletePosition] = useState({ x: 0, y: 0 });
  const [currentWord, setCurrentWord] = useState('');
  const [bracketMatches, setBracketMatches] = useState<Array<{start: number, end: number, type: string}>>([]);
  
  // Initialize utilities
  const syntaxHighlighter = new SyntaxHighlighter();
  const bracketMatcher = new BracketMatcher();
  const editorHistory = useRef(new EditorHistory());
  const multiCursorManager = useRef(new MultiCursorManager());

  // Update bracket matching when code changes
  useEffect(() => {
    const matches = bracketMatcher.findMatchingBrackets(code);
    setBracketMatches(matches);
  }, [code]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (editorHistory.current.canUndo()) {
            editorHistory.current.undo();
            onUndo?.();
          }
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          if (editorHistory.current.canRedo()) {
            editorHistory.current.redo();
            onRedo?.();
          }
        } else if (e.key === 'd') {
          e.preventDefault();
          // Add multiple cursor at current position
          const textarea = textareaRef.current;
          if (textarea) {
            const position = textarea.selectionStart;
            const lines = code.substring(0, position).split('\n');
            multiCursorManager.current.addCursor({
              line: lines.length,
              column: lines[lines.length - 1].length + 1,
              index: position
            });
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [code, onUndo, onRedo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    const textarea = e.target;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    
    // Create command for undo/redo
    const command = new TextChangeCommand(
      selectionStart,
      selectionEnd,
      code.substring(selectionStart, selectionEnd),
      newCode.substring(selectionStart, selectionStart + (newCode.length - code.length)),
      onChange,
      () => code
    );
    
    // Don't execute command here, just update state
    onChange(newCode);
    
    // Update cursor position
    const lines = newCode.substring(0, selectionStart).split('\n');
    setCursorPosition({
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    });

    // Auto-complete logic
    const textBeforeCursor = newCode.substring(0, selectionStart);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (currentWord.length > 1 && /^[a-zA-Z_$]/.test(currentWord)) {
      setCurrentWord(currentWord);
      setShowAutoComplete(true);
      
      // Calculate position for autocomplete dropdown
      const rect = textarea.getBoundingClientRect();
      setAutoCompletePosition({
        x: rect.left + 50, // Offset for line numbers
        y: rect.top + (lines.length - 1) * 24 + 40 // Approximate line height
      });
    } else {
      setShowAutoComplete(false);
    }
  };

  const handleAutoCompleteSelect = (suggestion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = code.substring(0, selectionStart);
    const words = textBeforeCursor.split(/\s+/);
    const currentWordStart = selectionStart - words[words.length - 1].length;
    
    const newCode = code.substring(0, currentWordStart) + 
                   suggestion + 
                   code.substring(selectionStart);
    
    onChange(newCode);
    setShowAutoComplete(false);
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = currentWordStart + suggestion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Render highlighted code with search matches and bracket highlights
  const renderHighlightedCode = () => {
    let highlightedCode = syntaxHighlighter.highlightCode(code);
    
    // Add search match highlights
    if (searchMatches.length > 0) {
      // This is a simplified approach - in a real implementation, 
      // you'd need to carefully handle HTML escaping and positioning
      searchMatches.forEach(matchIndex => {
        // Add search highlight styling
      });
    }
    
    // Add bracket match highlights
    bracketMatches.forEach(match => {
      if (match.type === 'matched') {
        // Add matched bracket highlighting
      } else {
        // Add unmatched bracket highlighting (error)
      }
    });
    
    return highlightedCode;
  };

  const lines = code.split('\n');

  return (
    <div className="flex-1 relative bg-slate-900/30 backdrop-blur-sm glow-border">
      {/* Line Numbers */}
      <div className="absolute left-0 top-0 w-12 bg-slate-800/50 border-r border-blue-500/20 p-2 text-sm text-slate-400 font-mono leading-6">
        {lines.map((_, index) => (
          <div key={index} className="text-right pr-2 select-none">
            {index + 1}
          </div>
        ))}
      </div>

      {/* Code Display (Syntax Highlighted) */}
      <div className="absolute left-12 top-0 right-0 p-4 font-mono text-sm leading-6 pointer-events-none overflow-hidden">
        <pre 
          className="whitespace-pre-wrap text-white"
          dangerouslySetInnerHTML={{ __html: renderHighlightedCode() }}
        />
      </div>

      {/* Multiple Cursors Overlay */}
      {multiCursorManager.current.getCursors().map((cursor, index) => (
        <div
          key={index}
          className="absolute pointer-events-none w-0.5 h-6 bg-blue-400 animate-pulse"
          style={{
            left: `calc(3rem + ${cursor.column * 0.6}em)`,
            top: `calc(1rem + ${(cursor.line - 1) * 1.5}rem)`,
            boxShadow: '0 0 10px rgba(96, 165, 250, 0.8), 0 0 20px rgba(96, 165, 250, 0.4)'
          }}
        />
      ))}

      {/* Bracket Match Highlights */}
      {bracketMatches.map((match, index) => (
        <div
          key={index}
          className={`absolute pointer-events-none w-2 h-6 rounded ${
            match.type === 'matched' ? 'bg-green-400/30' : 'bg-red-400/30'
          }`}
          style={{
            left: `calc(3rem + ${(match.start % 80) * 0.6}em)`, // Simplified positioning
            top: `calc(1rem + ${Math.floor(match.start / 80) * 1.5}rem)`,
            boxShadow: match.type === 'matched' 
              ? '0 0 5px rgba(34, 197, 94, 0.5)' 
              : '0 0 5px rgba(239, 68, 68, 0.5)'
          }}
        />
      ))}

      {/* Code Input */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={handleInputChange}
        className="absolute left-12 top-0 right-0 w-full h-full p-4 bg-transparent text-transparent caret-blue-400 font-mono text-sm leading-6 resize-none outline-none selection:bg-blue-500/30 scroll-glow"
        style={{
          caretColor: '#60a5fa',
          textShadow: '0 0 8px rgba(96, 165, 250, 0.5)'
        }}
        spellCheck={false}
      />

      {/* Cursor Glow Effect */}
      <div 
        className="absolute pointer-events-none w-0.5 h-6 bg-blue-400 cursor-glow"
        style={{
          left: `calc(3rem + ${cursorPosition.column * 0.6}em)`,
          top: `calc(1rem + ${(cursorPosition.line - 1) * 1.5}rem)`,
        }}
      />

      {/* Auto Complete Dropdown */}
      {showAutoComplete && (
        <AutoComplete
          position={autoCompletePosition}
          currentWord={currentWord}
          onSelect={handleAutoCompleteSelect}
          onClose={() => setShowAutoComplete(false)}
        />
      )}

      {/* Algorithm Status Display */}
      <div className="absolute bottom-4 right-4 bg-slate-800/70 backdrop-blur-sm rounded-lg p-2 text-xs text-slate-400 glow-border">
        <div>🧩 Brackets: Stack-based matching</div>
        <div>🎯 Multi-cursor: Two-pointer technique</div>
        <div>🎨 Syntax: Regex tokenizer</div>
        <div>⏮️ History: {editorHistory.current.canUndo() ? 'Can undo' : 'No undo'}</div>
      </div>
    </div>
  );
};
