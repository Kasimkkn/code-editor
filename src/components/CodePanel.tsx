
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AutoComplete } from './AutoComplete';
import { FindReplace } from './FindReplace';
import { BracketMatcher, EditorHistory, TextChangeCommand, MultiCursorManager, PerformanceMonitor } from '@/utils/editorAlgorithms';
import { highlightSyntax } from '@/utils/syntaxHighlighter';

interface CodePanelProps {
  code: string;
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  onChange: (code: string) => void;
  onCursorChange?: (position: { line: number; column: number; index: number }) => void;
  showLineNumbers?: boolean;
  readOnly?: boolean;
  className?: string;
}

interface CursorPosition {
  line: number;
  column: number;
  index: number;
}

export const CodePanel: React.FC<CodePanelProps> = ({
  code,
  language,
  onChange,
  onCursorChange,
  showLineNumbers = true,
  readOnly = false,
  className = ''
}) => {
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 0, column: 0, index: 0 });
  const [autoCompleteVisible, setAutoCompleteVisible] = useState(false);
  const [autoCompletePosition, setAutoCompletePosition] = useState({ x: 0, y: 0 });
  const [currentWord, setCurrentWord] = useState('');
  const [findReplaceVisible, setFindReplaceVisible] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(new EditorHistory());
  const bracketMatcherRef = useRef(new BracketMatcher());
  const multiCursorManagerRef = useRef(new MultiCursorManager());

  // Memoized syntax highlighting - fix the rendering issues
  const highlightedCode = useMemo(() => {
    if (!code) return '';
    const endMeasure = PerformanceMonitor.startMeasurement('syntax-highlight');
    const result = highlightSyntax(code, language);
    endMeasure();
    return result;
  }, [code, language]);

  // Handle text changes properly to prevent duplication
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    
    const newCode = e.target.value;
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Prevent duplicate handling
    if (newCode === code) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Create proper command for undo/redo
    const command = new TextChangeCommand(
      start,
      end,
      code,
      newCode,
      onChange,
      () => code,
      Date.now()
    );

    historyRef.current.executeCommand(command);
  }, [code, onChange, readOnly]);

  // Handle cursor position changes
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lines = code.substring(0, start).split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    const newPosition = { line, column, index: start };
    setCursorPosition(newPosition);
    onCursorChange?.(newPosition);

    // Check for word at cursor for autocomplete
    const wordMatch = getWordAtCursor(code, start);
    if (wordMatch && wordMatch.word.length > 1 && !readOnly) {
      setCurrentWord(wordMatch.word);
      
      // Calculate autocomplete position
      const rect = textarea.getBoundingClientRect();
      const lineHeight = 20;
      const charWidth = 8;
      
      setAutoCompletePosition({
        x: rect.left + (column * charWidth),
        y: rect.top + (line * lineHeight) + lineHeight
      });
      
      setAutoCompleteVisible(true);
    } else {
      setAutoCompleteVisible(false);
      setCurrentWord('');
    }
  }, [code, onCursorChange, readOnly]);

  // Handle autocomplete selection - fix duplication bug
  const handleAutoCompleteSelect = useCallback((suggestion: string, replaceLength: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const wordStart = start - replaceLength;
    
    // Replace only the partial word, not duplicate
    const before = code.substring(0, wordStart);
    const after = code.substring(start);
    const newCode = before + suggestion + after;
    
    onChange(newCode);
    
    setAutoCompleteVisible(false);
    setCurrentWord('');

    // Set cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = wordStart + suggestion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [code, onChange]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          if (!e.shiftKey) {
            e.preventDefault();
            historyRef.current.undo();
          }
          break;
        case 'y':
          e.preventDefault();
          historyRef.current.redo();
          break;
        case 'f':
          e.preventDefault();
          setFindReplaceVisible(true);
          break;
      }
    }

    if (e.key === 'Escape') {
      setAutoCompleteVisible(false);
      setFindReplaceVisible(false);
    }
  }, []);

  // Get word at cursor position
  const getWordAtCursor = (text: string, position: number) => {
    const beforeCursor = text.substring(0, position);
    const afterCursor = text.substring(position);
    
    const wordBefore = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);
    
    if (wordBefore) {
      const word = wordBefore[0];
      const start = position - word.length;
      return { word, start, end: position };
    }
    
    return null;
  };

  // Update cursor position on selection change
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleSelectionChange = () => updateCursorPosition();
    
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);

    return () => {
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [updateCursorPosition]);

  const lines = code.split('\n');

  return (
    <div className={`relative w-full h-full bg-slate-900 rounded-lg border border-blue-500/20 overflow-hidden ${className}`}>
      <div className="flex h-full">
        {/* Line numbers */}
        {showLineNumbers && (
          <div className="flex-shrink-0 w-12 bg-slate-800 border-r border-blue-500/10 text-slate-500 text-sm font-mono p-2">
            {lines.map((_, index) => (
              <div key={index} className="text-right leading-5 h-5">
                {index + 1}
              </div>
            ))}
          </div>
        )}

        {/* Code editor container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Syntax highlighting overlay - fix positioning */}
          <div
            ref={overlayRef}
            className="absolute inset-0 p-4 font-mono text-sm leading-5 whitespace-pre-wrap pointer-events-none overflow-hidden"
            style={{ 
              color: 'transparent',
              zIndex: 1,
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />

          {/* Textarea - fix text synchronization */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-blue-400 font-mono text-sm leading-5 resize-none outline-none overflow-hidden"
            style={{
              caretColor: '#60a5fa',
              background: 'transparent',
              zIndex: 2,
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      {/* Autocomplete */}
      {autoCompleteVisible && (
        <AutoComplete
          position={autoCompletePosition}
          currentWord={currentWord}
          onSelect={handleAutoCompleteSelect}
          onClose={() => setAutoCompleteVisible(false)}
          context={{
            previousWords: [],
            currentLine: lines[cursorPosition.line] || '',
            cursorPosition: cursorPosition.index,
            fileType: language
          }}
        />
      )}

      {/* Find & Replace */}
      {findReplaceVisible && (
        <FindReplace
          code={code}
          onReplace={(newCode) => onChange(newCode)}
          onClose={() => setFindReplaceVisible(false)}
        />
      )}
    </div>
  );
};
