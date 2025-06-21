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

  // Memoized syntax highlighting
  const highlightedCode = useMemo(() => {
    const endMeasure = PerformanceMonitor.startMeasurement('syntax-highlight');
    const result = highlightSyntax(code, language);
    endMeasure();
    return result;
  }, [code, language]);

  // Handle text changes with proper command pattern
  const handleChange = useCallback((newCode: string) => {
    if (readOnly) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const oldText = code.substring(start, end);
    const newText = newCode.substring(start, start + (newCode.length - code.length + (end - start)));

    const command = new TextChangeCommand(
      start,
      end,
      oldText,
      newText,
      onChange,
      () => code,
      Date.now()
    );

    historyRef.current.executeCommand(command);
    
    // Update multi-cursor positions
    const lengthChange = newCode.length - code.length;
    multiCursorManagerRef.current.updateCursorsAfterEdit(start, lengthChange);

    // Save to localStorage for diff tracking
    saveCodeVersion(newCode);
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
    if (wordMatch && wordMatch.word.length > 0 && !readOnly) {
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

  // Handle autocomplete selection with proper text replacement
  const handleAutoCompleteSelect = useCallback((suggestion: string, replaceLength: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const wordStart = start - replaceLength;
    
    // Replace the current word with the suggestion
    const before = code.substring(0, wordStart);
    const after = code.substring(start);
    const newCode = before + suggestion + after;
    
    // Create command for undo/redo
    const command = new TextChangeCommand(
      wordStart,
      start,
      code.substring(wordStart, start),
      suggestion,
      onChange,
      () => code,
      Date.now()
    );

    historyRef.current.executeCommand(command);
    
    setAutoCompleteVisible(false);
    setCurrentWord('');

    // Set cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = wordStart + suggestion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
      updateCursorPosition();
    }, 0);
  }, [code, onChange, updateCursorPosition]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          if (!e.shiftKey) {
            e.preventDefault();
            historyRef.current.undo();
          }
          break;
        case 'y':
        case 'Z':
          if (e.shiftKey || e.key === 'y') {
            e.preventDefault();
            historyRef.current.redo();
          }
          break;
        case 'f':
          e.preventDefault();
          setFindReplaceVisible(true);
          break;
        case 's':
          e.preventDefault();
          formatCode();
          break;
      }
    }

    if (e.key === 'Escape') {
      setAutoCompleteVisible(false);
      setFindReplaceVisible(false);
    }
  }, []);

  // Format code function
  const formatCode = useCallback(() => {
    if (readOnly) return;

    try {
      // Simple JavaScript/React formatting
      let formatted = code
        .replace(/\s*{\s*/g, ' {\n  ')
        .replace(/\s*}\s*/g, '\n}\n')
        .replace(/;\s*/g, ';\n')
        .replace(/,\s*/g, ',\n  ')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');

      onChange(formatted);
    } catch (error) {
      console.error('Formatting error:', error);
    }
  }, [code, onChange, readOnly]);

  // Save code version for diff tracking
  const saveCodeVersion = useCallback((newCode: string) => {
    try {
      const versions = JSON.parse(localStorage.getItem('cosmic-editor-versions') || '[]');
      const newVersion = {
        id: Date.now(),
        code: newCode,
        timestamp: new Date().toISOString(),
        language
      };
      
      versions.push(newVersion);
      
      // Keep only last 10 versions
      if (versions.length > 10) {
        versions.splice(0, versions.length - 10);
      }
      
      localStorage.setItem('cosmic-editor-versions', JSON.stringify(versions));
    } catch (error) {
      console.error('Failed to save code version:', error);
    }
  }, [language]);

  // Get word at cursor position
  const getWordAtCursor = (text: string, position: number) => {
    const beforeCursor = text.substring(0, position);
    const afterCursor = text.substring(position);
    
    const wordBefore = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);
    const wordAfter = afterCursor.match(/^[a-zA-Z0-9_$]*/);
    
    if (wordBefore) {
      const word = wordBefore[0] + (wordAfter ? wordAfter[0] : '');
      const start = position - wordBefore[0].length;
      return { word: wordBefore[0], start, end: position };
    }
    
    return null;
  };

  // Event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Update cursor position on selection change
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleSelectionChange = () => updateCursorPosition();
    
    textarea.addEventListener('selectionchange', handleSelectionChange);
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);

    return () => {
      textarea.removeEventListener('selectionchange', handleSelectionChange);
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [updateCursorPosition]);

  const lines = code.split('\n');

  return (
    <div className={`relative w-full h-full bg-slate-900/50 rounded-lg border border-blue-500/20 overflow-hidden ${className}`}>
      <div className="flex h-full">
        {/* Line numbers */}
        {showLineNumbers && (
          <div className="flex-shrink-0 w-12 bg-slate-800/30 border-r border-blue-500/10 text-slate-500 text-sm font-mono">
            {lines.map((_, index) => (
              <div key={index} className="px-2 py-0.5 text-right">
                {index + 1}
              </div>
            ))}
          </div>
        )}

        {/* Code editor container */}
        <div className="flex-1 relative">
          {/* Syntax highlighting overlay */}
          <div
            ref={overlayRef}
            className="absolute inset-0 p-4 font-mono text-sm leading-5 whitespace-pre-wrap pointer-events-none z-10"
            style={{ color: 'transparent' }}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            readOnly={readOnly}
            className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-blue-400 font-mono text-sm leading-5 resize-none outline-none z-20"
            style={{
              caretColor: '#60a5fa',
              background: 'transparent',
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
          onChange={onChange}
          onClose={() => setFindReplaceVisible(false)}
        />
      )}
    </div>
  );
};
