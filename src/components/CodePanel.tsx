import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { BracketMatcher, EditorHistory, MultiCursorManager, TextChangeCommand, PerformanceMonitor } from '@/utils/editorAlgorithms';
import { SyntaxHighlighter } from '@/utils/syntaxHighlighter';
import { AutoComplete } from './AutoComplete';

interface CodePanelProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  searchMatches?: number[];
  onCursorPositionChange?: (position: { line: number; column: number; index: number }) => void;
}

interface ViewportInfo {
  startLine: number;
  endLine: number;
  lineHeight: number;
  totalLines: number;
}

interface CursorState {
  position: { line: number; column: number; index: number };
  selection: { start: number; end: number };
}

export const CodePanel: React.FC<CodePanelProps> = ({
  code,
  onChange,
  language,
  searchMatches = [],
  onCursorPositionChange
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightContainerRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State management
  const [cursorState, setCursorState] = useState<CursorState>({
    position: { line: 1, column: 1, index: 0 },
    selection: { start: 0, end: 0 }
  });
  const [viewport, setViewport] = useState<ViewportInfo>({
    startLine: 0,
    endLine: 50,
    lineHeight: 24,
    totalLines: 1
  });
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompletePosition, setAutoCompletePosition] = useState({ x: 0, y: 0 });
  const [currentWord, setCurrentWord] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [bracketMatches, setBracketMatches] = useState<Array<{ start: number, end: number, type: string }>>([]);
  const [editorFocused, setEditorFocused] = useState(false);
  const [performanceInfo, setPerformanceInfo] = useState<{ renderTime: number; highlightTime: number }>({
    renderTime: 0,
    highlightTime: 0
  });

  // Memoized instances to prevent recreation
  const syntaxHighlighter = useMemo(() => {
    const highlighter = new SyntaxHighlighter(language);
    return highlighter;
  }, [language]);

  const bracketMatcher = useMemo(() => new BracketMatcher(), []);
  const editorHistory = useRef(new EditorHistory());
  const multiCursorManager = useRef(new MultiCursorManager());

  // Memoized lines calculation for performance
  const lines = useMemo(() => {
    const endMeasure = PerformanceMonitor.startMeasurement('calculate-lines');
    const result = (code || '').split('\n');
    endMeasure();
    return result;
  }, [code]);

  // Update viewport when scrolling or resizing
  const updateViewport = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    const lineHeight = 24; // Should match CSS line-height

    const startLine = Math.floor(scrollTop / lineHeight);
    const visibleLines = Math.ceil(containerHeight / lineHeight);
    const endLine = Math.min(startLine + visibleLines + 5, lines.length); // +5 for buffer

    setViewport({
      startLine: Math.max(0, startLine - 5), // -5 for buffer
      endLine,
      lineHeight,
      totalLines: lines.length
    });
  }, [lines.length]);

  // Virtual scrolling for large files
  const visibleLines = useMemo(() => {
    const endMeasure = PerformanceMonitor.startMeasurement('calculate-visible-lines');
    const result = lines.slice(viewport.startLine, viewport.endLine);
    endMeasure();
    return result;
  }, [lines, viewport.startLine, viewport.endLine]);

  // Enhanced bracket matching with caching
  useEffect(() => {
    const endMeasure = PerformanceMonitor.startMeasurement('bracket-matching');
    const matches = bracketMatcher.findMatchingBrackets(code);
    setBracketMatches(matches);
    endMeasure();
  }, [code, bracketMatcher]);

  // Optimized syntax highlighting with viewport awareness
  const highlightedCode = useMemo(() => {
    const endMeasure = PerformanceMonitor.startMeasurement('syntax-highlighting');

    // Only highlight visible portion for large files
    const shouldOptimize = lines.length > 1000;
    const codeToHighlight = shouldOptimize
      ? visibleLines.join('\n')
      : code;

    const result = syntaxHighlighter.highlightCode(codeToHighlight);
    endMeasure();

    setPerformanceInfo(prev => ({
      ...prev,
      highlightTime: PerformanceMonitor.getAverageTime('syntax-highlighting')
    }));

    return result;
  }, [code, syntaxHighlighter, visibleLines, lines.length]);

  // Enhanced keyboard handling with better shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editorFocused) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              editorHistory.current.redo();
            } else {
              editorHistory.current.undo();
            }
            break;
          case 'y':
            e.preventDefault();
            editorHistory.current.redo();
            break;
          case 'd':
            e.preventDefault();
            addCursorBelow();
            break;
          case 'l':
            e.preventDefault();
            selectCurrentLine();
            break;
          case '/':
            e.preventDefault();
            toggleLineComment();
            break;
          case '[':
            e.preventDefault();
            indentSelection(-1);
            break;
          case ']':
            e.preventDefault();
            indentSelection(1);
            break;
          case 'Enter':
            e.preventDefault();
            insertLineBelow();
            break;
        }
      }

      // Auto-closing brackets and quotes
      if (!isCtrlOrCmd && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case '(':
            e.preventDefault();
            insertPair('(', ')');
            break;
          case '[':
            e.preventDefault();
            insertPair('[', ']');
            break;
          case '{':
            e.preventDefault();
            insertPair('{', '}');
            break;
          case '"':
            e.preventDefault();
            insertPair('"', '"');
            break;
          case "'":
            e.preventDefault();
            insertPair("'", "'");
            break;
          case 'Tab':
            e.preventDefault();
            if (e.shiftKey) {
              indentSelection(-1);
            } else {
              indentSelection(1);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editorFocused, code]);

  const updateAutoComplete = useCallback((newCode: string, cursorPos: number, textarea: HTMLTextAreaElement) => {
    try {
      const textBeforeCursor = newCode.substring(0, cursorPos);
      const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const currentLineEnd = newCode.indexOf('\n', cursorPos);
      const currentLine = newCode.substring(currentLineStart, currentLineEnd === -1 ? newCode.length : currentLineEnd);

      // Enhanced word detection
      const wordMatch = textBeforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);
      const currentWordText = wordMatch ? wordMatch[0] : '';

      // Get context for better suggestions
      const previousWords = textBeforeCursor.split(/\s+/).slice(-5).filter(w => w.length > 0);
      const context = {
        previousWords,
        currentLine,
        cursorPosition: cursorPos,
        fileType: language
      };

      if (currentWordText.length > 1) {
        setCurrentWord(currentWordText);
        setShowAutoComplete(true);

        // Calculate position for autocomplete dropdown
        const rect = textarea.getBoundingClientRect();
        const lines = textBeforeCursor.split('\n');
        const currentLineNumber = lines.length - 1;
        const columnPosition = lines[lines.length - 1].length - currentWordText.length;

        setAutoCompletePosition({
          x: Math.min(rect.left + 64 + (columnPosition * 8.4), window.innerWidth - 400),
          y: Math.min(rect.top + (currentLineNumber * 24) + 40, window.innerHeight - 200)
        });
      } else {
        setShowAutoComplete(false);
        setCurrentWord('');
      }
    } catch (error) {
      console.error('Error in updateAutoComplete:', error);
      setShowAutoComplete(false);
    }
  }, [language]);
  // Fixed handleInputChange function
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isComposing) return; // Don't process during IME composition

    const endMeasure = PerformanceMonitor.startMeasurement('input-change');

    const newCode = e.target.value;
    const textarea = e.target;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    // 🔥 CRITICAL FIX: Update the code state FIRST
    onChange(newCode);

    // Calculate cursor position
    const textBeforeCursor = newCode.substring(0, selectionStart);
    const linesBeforeCursor = textBeforeCursor.split('\n');
    const newCursorPosition = {
      line: linesBeforeCursor.length,
      column: linesBeforeCursor[linesBeforeCursor.length - 1].length + 1,
      index: selectionStart
    };

    // Update cursor state
    setCursorState({
      position: newCursorPosition,
      selection: { start: selectionStart, end: selectionEnd }
    });

    // Notify parent of cursor position change
    onCursorPositionChange?.(newCursorPosition);

    // Create command for undo/redo - SIMPLIFIED VERSION
    try {
      const lengthChange = newCode.length - code.length;

      // Only create undo command for significant changes
      if (Math.abs(lengthChange) > 0) {
        const command = new TextChangeCommand(
          selectionStart - Math.max(0, lengthChange), // Approximate old start
          selectionStart, // Approximate old end
          code.substring(Math.max(0, selectionStart - Math.abs(lengthChange)), selectionStart), // Old text
          lengthChange > 0 ? newCode.substring(selectionStart - lengthChange, selectionStart) : '', // New text
          onChange,
          () => newCode // Use the new code
        );

        // Don't execute the command since we already updated the state
        // Just add it to history for undo functionality
        editorHistory.current.executeCommand(command);
      }

      // Update multi-cursor positions
      multiCursorManager.current.updateCursorsAfterEdit(selectionStart, lengthChange);

      // Enhanced auto-complete logic
      updateAutoComplete(newCode, selectionStart, textarea);

    } catch (error) {
      console.error('Error in input change handler:', error);
      // Fallback: just ensure the code is updated
      if (newCode !== code) {
        onChange(newCode);
      }
    }

    endMeasure();
  }, [isComposing, code, onChange, onCursorPositionChange, updateAutoComplete]);
  // Smart auto-complete triggering

  // Auto-complete selection handler
  const handleAutoCompleteSelect = useCallback((suggestion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = code.substring(0, selectionStart);
    const wordMatch = textBeforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);

    if (wordMatch) {
      const currentWordStart = selectionStart - wordMatch[0].length;
      const newCode = code.substring(0, currentWordStart) +
        suggestion +
        code.substring(selectionStart);

      onChange(newCode);
      setShowAutoComplete(false);

      // Focus back and set cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = currentWordStart + suggestion.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  }, [code, onChange]);

  // Advanced editing operations
  const addCursorBelow = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentPos = textarea.selectionStart;
    const lines = code.split('\n');
    const currentLineStart = code.lastIndexOf('\n', currentPos - 1) + 1;
    const currentLineEnd = code.indexOf('\n', currentPos);
    const lineEnd = currentLineEnd === -1 ? code.length : currentLineEnd;
    const nextLineStart = lineEnd + 1;

    if (nextLineStart < code.length) {
      const nextLineEnd = code.indexOf('\n', nextLineStart);
      const nextLineLength = nextLineEnd === -1 ? code.length - nextLineStart : nextLineEnd - nextLineStart;
      const columnOffset = currentPos - currentLineStart;
      const newCursorPos = nextLineStart + Math.min(columnOffset, nextLineLength);

      multiCursorManager.current.addCursor({
        line: 0, // Will be calculated
        column: 0, // Will be calculated
        index: newCursorPos
      });
    }
  }, [code]);

  const selectCurrentLine = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentPos = textarea.selectionStart;
    const lineStart = code.lastIndexOf('\n', currentPos - 1) + 1;
    const lineEnd = code.indexOf('\n', currentPos);
    const endPos = lineEnd === -1 ? code.length : lineEnd + 1;

    textarea.setSelectionRange(lineStart, endPos);
  }, [code]);

  const toggleLineComment = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lines = code.split('\n');
    const startLine = code.substring(0, start).split('\n').length - 1;
    const endLine = code.substring(0, end).split('\n').length - 1;

    const modifiedLines = lines.map((line, index) => {
      if (index >= startLine && index <= endLine) {
        if (line.trim().startsWith('//')) {
          return line.replace(/^(\s*)\/\/\s?/, '$1');
        } else {
          return line.replace(/^(\s*)/, '$1// ');
        }
      }
      return line;
    });

    onChange(modifiedLines.join('\n'));
  }, [code, onChange]);

  const indentSelection = useCallback((direction: 1 | -1) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lines = code.split('\n');
    const startLine = code.substring(0, start).split('\n').length - 1;
    const endLine = code.substring(0, end).split('\n').length - 1;

    const modifiedLines = lines.map((line, index) => {
      if (index >= startLine && index <= endLine) {
        if (direction === 1) {
          return '  ' + line; // Add 2 spaces
        } else {
          return line.replace(/^  /, ''); // Remove 2 spaces
        }
      }
      return line;
    });

    onChange(modifiedLines.join('\n'));
  }, [code, onChange]);

  const insertLineBelow = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentPos = textarea.selectionStart;
    const lineEnd = code.indexOf('\n', currentPos);
    const insertPos = lineEnd === -1 ? code.length : lineEnd;
    const newCode = code.substring(0, insertPos) + '\n' + code.substring(insertPos);

    onChange(newCode);

    setTimeout(() => {
      textarea.setSelectionRange(insertPos + 1, insertPos + 1);
    }, 0);
  }, [code, onChange]);

  const insertPair = useCallback((openChar: string, closeChar: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = code.substring(start, end);
    const newCode = code.substring(0, start) +
      openChar + selectedText + closeChar +
      code.substring(end);

    onChange(newCode);

    setTimeout(() => {
      const newPos = start + openChar.length + selectedText.length;
      if (selectedText) {
        textarea.setSelectionRange(start + openChar.length, newPos);
      } else {
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [code, onChange]);

  // Scroll synchronization
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const scrollLeft = e.currentTarget.scrollLeft;

    // Sync all scrollable elements
    if (highlightContainerRef.current) {
      highlightContainerRef.current.scrollTop = scrollTop;
      highlightContainerRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }

    // Update viewport for virtual scrolling
    updateViewport();
  }, [updateViewport]);

  // IME composition handling
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    // Trigger input change after composition
    handleInputChange(e as any);
  }, [handleInputChange]);

  // Focus management
  const handleFocus = useCallback(() => {
    setEditorFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setEditorFocused(false);
  }, []);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const report = PerformanceMonitor.getPerformanceReport();
      setPerformanceInfo({
        renderTime: report['render-component']?.avg || 0,
        highlightTime: report['syntax-highlighting']?.avg || 0
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Viewport update on resize
  useEffect(() => {
    const handleResize = () => updateViewport();
    window.addEventListener('resize', handleResize);
    updateViewport(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [updateViewport]);

  // Render optimized line numbers
  const renderLineNumbers = useMemo(() => {
    const endMeasure = PerformanceMonitor.startMeasurement('render-line-numbers');

    const result = Array.from({ length: viewport.totalLines }, (_, i) => {
      const lineNumber = i + 1;
      const isVisible = i >= viewport.startLine && i <= viewport.endLine;

      return (
        <div
          key={lineNumber}
          className={`text-right pr-2 select-none leading-6 h-6 ${isVisible ? 'text-slate-400' : 'text-transparent'
            }`}
          style={{ minHeight: '24px' }}
        >
          {isVisible ? lineNumber : ''}
        </div>
      );
    });

    endMeasure();
    return result;
  }, [viewport]);

  // Get bracket color styling
  const getBracketHighlightStyle = useCallback((match: { start: number, end: number, type: string }, index: number) => {
    const colors = [
      'rgba(59, 130, 246, 0.3)', // blue
      'rgba(16, 185, 129, 0.3)', // green
      'rgba(139, 92, 246, 0.3)', // purple
      'rgba(245, 158, 11, 0.3)', // yellow
      'rgba(236, 72, 153, 0.3)', // pink
      'rgba(6, 182, 212, 0.3)'   // cyan
    ];

    const shadowColors = [
      'rgba(59, 130, 246, 0.6)',
      'rgba(16, 185, 129, 0.6)',
      'rgba(139, 92, 246, 0.6)',
      'rgba(245, 158, 11, 0.6)',
      'rgba(236, 72, 153, 0.6)',
      'rgba(6, 182, 212, 0.6)'
    ];

    if (match.type === 'unmatched') {
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
      };
    }

    const colorIndex = index % colors.length;
    return {
      backgroundColor: colors[colorIndex],
      boxShadow: `0 0 8px ${shadowColors[colorIndex]}`
    };
  }, []);

  return (
    <div className="flex-1 relative bg-slate-900/30 backdrop-blur-sm glow-border overflow-hidden">
      {/* Performance indicator */}
      {performanceInfo.highlightTime > 50 && (
        <div className="absolute top-2 right-2 z-10 text-xs text-yellow-400 bg-slate-800/80 px-2 py-1 rounded">
          Highlight: {performanceInfo.highlightTime.toFixed(1)}ms
        </div>
      )}

      {/* Main editor container */}
      <div className="flex h-full">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="w-16 bg-slate-800/50 border-r border-blue-500/20 p-2 text-sm font-mono overflow-hidden"
          style={{ height: '100%' }}
        >
          {renderLineNumbers}
        </div>

        {/* Code editor area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-auto scroll-glow"
            onScroll={handleScroll}
          >
            {/* Syntax highlighted code (background) */}
            <div
              ref={highlightContainerRef}
              className="absolute top-0 left-0 p-4 font-mono text-sm leading-6 pointer-events-none whitespace-pre-wrap"
              style={{
                minHeight: `${viewport.totalLines * viewport.lineHeight}px`,
                paddingTop: `${viewport.startLine * viewport.lineHeight}px`
              }}
            >
              <pre
                className="text-white m-0 p-0"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            </div>

            {/* Bracket highlights */}
            {bracketMatches.map((match, index) => {
              const lineNumber = code.substring(0, match.start).split('\n').length - 1;
              const isVisible = lineNumber >= viewport.startLine && lineNumber <= viewport.endLine;

              if (!isVisible) return null;

              return (
                <div
                  key={`bracket-${index}-${match.start}`}
                  className="absolute pointer-events-none w-2 h-6 rounded transition-all duration-200"
                  style={{
                    left: `calc(1rem + ${(match.start % 100) * 8.4}px)`,
                    top: `calc(1rem + ${lineNumber * 24}px)`,
                    ...getBracketHighlightStyle(match, index)
                  }}
                />
              );
            })}

            {/* Search match highlights */}
            {searchMatches.map((matchIndex, index) => {
              const lineNumber = code.substring(0, matchIndex).split('\n').length - 1;
              const isVisible = lineNumber >= viewport.startLine && lineNumber <= viewport.endLine;

              if (!isVisible) return null;

              return (
                <div
                  key={`search-${index}-${matchIndex}`}
                  className="absolute pointer-events-none bg-yellow-400/40 rounded transition-all duration-200"
                  style={{
                    left: `calc(1rem + ${(matchIndex % 100) * 7.8}px)`,
                    top: `calc(0.3rem + ${lineNumber}px)`,
                    width: '0.4rem',
                    height: '1rem',
                    boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)'
                  }}
                />
              );
            })}

            {/* Multi-cursor highlights */}
            {multiCursorManager.current.getCursors().map((cursor, index) => {
              const lineNumber = code.substring(0, cursor.index).split('\n').length - 1;
              const isVisible = lineNumber >= viewport.startLine && lineNumber <= viewport.endLine;

              if (!isVisible) return null;

              return (
                <div
                  key={cursor.id}
                  className="absolute pointer-events-none w-0.5 h-6 bg-blue-400 animate-pulse"
                  style={{
                    left: `calc(1rem + ${cursor.column * 8.4}px)`,
                    top: `calc(1rem + ${(lineNumber) * 24}px)`,
                    boxShadow: '0 0 15px rgba(96, 165, 250, 0.8)'
                  }}
                />
              );
            })}

            {/* Code input textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleInputChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="absolute top-0 left-0 w-full h-full p-4 bg-transparent text-transparent caret-blue-400 font-mono text-sm leading-6 resize-none outline-none selection:bg-blue-500/30"
              style={{
                caretColor: '#60a5fa',
                minHeight: `${viewport.totalLines * viewport.lineHeight + 100}px`
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={language === 'javascript' ? "// Start coding in JavaScript..." : `// Start coding in ${language}...`}
            />
          </div>
        </div>
      </div>

      {/* Auto Complete Dropdown */}
      {showAutoComplete && (
        <AutoComplete
          position={autoCompletePosition}
          currentWord={currentWord}
          onSelect={handleAutoCompleteSelect}
          onClose={() => setShowAutoComplete(false)}
          context={{
            previousWords: [],
            currentLine: '',
            cursorPosition: cursorState.position.index,
            fileType: language
          }}
        />
      )}

      {/* Status indicators */}
      <div className="absolute bottom-2 right-2 flex gap-2 text-xs">
        {editorFocused && (
          <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded">
            Focused
          </div>
        )}
        {multiCursorManager.current.getCursors().length > 0 && (
          <div className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
            {multiCursorManager.current.getCursors().length + 1} cursors
          </div>
        )}
        <div className="bg-slate-700/50 text-slate-400 px-2 py-1 rounded">
          Ln {cursorState.position.line}, Col {cursorState.position.column}
        </div>
      </div>
    </div>
  );
};