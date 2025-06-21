// Enhanced Bracket matching using stack with optimized performance
export class BracketMatcher {
  private readonly openBrackets = new Set(['(', '[', '{', '<']);
  private readonly closeBrackets = new Set([')', ']', '}', '>']);
  private readonly bracketPairs = new Map([
    [')', '('],
    [']', '['],
    ['}', '{'],
    ['>', '<']
  ]);

  // Cache for performance optimization
  private lastCode = '';
  private cachedMatches: Array<{ start: number, end: number, type: string }> = [];

  findMatchingBrackets(code: string): Array<{ start: number, end: number, type: string }> {
    // Return cached result if code hasn't changed
    if (code === this.lastCode) {
      return this.cachedMatches;
    }

    const stack: Array<{ char: string, index: number }> = [];
    const matches: Array<{ start: number, end: number, type: string }> = [];

    // Skip strings and comments to avoid false bracket matching
    const processedCode = this.preprocessCode(code);

    for (let i = 0; i < processedCode.length; i++) {
      const char = processedCode[i];

      if (char === '\0') continue; // Skip processed characters

      if (this.openBrackets.has(char)) {
        stack.push({ char, index: i });
      } else if (this.closeBrackets.has(char)) {
        const expectedOpen = this.bracketPairs.get(char);

        if (stack.length > 0 && stack[stack.length - 1].char === expectedOpen) {
          const openBracket = stack.pop()!;
          matches.push({
            start: openBracket.index,
            end: i,
            type: 'matched'
          });
        } else {
          // Unmatched closing bracket
          matches.push({
            start: i,
            end: i,
            type: 'unmatched'
          });
        }
      }
    }

    // Add unmatched open brackets
    stack.forEach(bracket => {
      matches.push({
        start: bracket.index,
        end: bracket.index,
        type: 'unmatched'
      });
    });

    // Cache results
    this.lastCode = code;
    this.cachedMatches = matches;

    return matches;
  }

  // Preprocess code to ignore brackets in strings and comments
  private preprocessCode(code: string): string {
    let processed = code.split('');
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultiLineComment = false;

    for (let i = 0; i < processed.length; i++) {
      const char = processed[i];
      const nextChar = processed[i + 1];

      // Handle multi-line comments
      if (!inString && !inComment && char === '/' && nextChar === '*') {
        inMultiLineComment = true;
        processed[i] = processed[i + 1] = '\0';
        i++; // Skip next character
        continue;
      }

      if (inMultiLineComment && char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        processed[i] = processed[i + 1] = '\0';
        i++; // Skip next character
        continue;
      }

      // Handle single-line comments
      if (!inString && !inMultiLineComment && char === '/' && nextChar === '/') {
        inComment = true;
      }

      // Handle strings
      if (!inComment && !inMultiLineComment && (char === '"' || char === "'" || char === '`')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && processed[i - 1] !== '\\') {
          inString = false;
          stringChar = '';
        }
      }

      // Handle line breaks
      if (char === '\n') {
        inComment = false;
      }

      // Null out characters inside strings, comments
      if (inString || inComment || inMultiLineComment) {
        if (!this.openBrackets.has(char) && !this.closeBrackets.has(char)) {
          processed[i] = '\0';
        } else {
          processed[i] = '\0'; // Also null out brackets in strings/comments
        }
      }
    }

    return processed.join('');
  }

  // Get matching bracket for a given position
  findMatchingBracket(code: string, position: number): number | null {
    const matches = this.findMatchingBrackets(code);

    for (const match of matches) {
      if (match.type === 'matched') {
        if (match.start === position) return match.end;
        if (match.end === position) return match.start;
      }
    }

    return null;
  }
}

// Enhanced Undo/Redo system with compound operations and memory optimization
export interface EditorCommand {
  execute(): void;
  undo(): void;
  getDescription(): string;
  canMergeWith?(other: EditorCommand): boolean;
  mergeWith?(other: EditorCommand): EditorCommand;
}

export class TextChangeCommand implements EditorCommand {
  constructor(
    private startPos: number,
    private endPos: number,
    private oldText: string,
    private newText: string,
    private onChange: (text: string) => void,
    private getText: () => string,
    private timestamp: number = Date.now()
  ) { }

  execute(): void {
    const currentText = this.getText();
    const before = currentText.substring(0, this.startPos);
    const after = currentText.substring(this.endPos);
    const newFullText = before + this.newText + after;
    this.onChange(newFullText);
  }

  undo(): void {
    const currentText = this.getText();
    const before = currentText.substring(0, this.startPos);
    const after = currentText.substring(this.startPos + this.newText.length);
    const newFullText = before + this.oldText + after;
    this.onChange(newFullText);
  }

  getDescription(): string {
    if (this.oldText === '' && this.newText !== '') {
      return `Insert "${this.newText.substring(0, 20)}${this.newText.length > 20 ? '...' : ''}"`;
    } else if (this.oldText !== '' && this.newText === '') {
      return `Delete "${this.oldText.substring(0, 20)}${this.oldText.length > 20 ? '...' : ''}"`;
    } else {
      return `Replace "${this.oldText}" → "${this.newText}"`;
    }
  }

  // Allow merging consecutive typing operations
  canMergeWith(other: EditorCommand): boolean {
    if (!(other instanceof TextChangeCommand)) return false;

    const timeDiff = Math.abs(this.timestamp - other.timestamp);
    const isConsecutive = this.startPos + this.newText.length === other.startPos;
    const isSimpleInsert = this.oldText === '' && other.oldText === '';

    return timeDiff < 1000 && isConsecutive && isSimpleInsert;
  }

  mergeWith(other: EditorCommand): EditorCommand {
    if (!(other instanceof TextChangeCommand) || !this.canMergeWith(other)) {
      throw new Error('Cannot merge commands');
    }

    return new TextChangeCommand(
      this.startPos,
      this.endPos,
      this.oldText,
      this.newText + other.newText,
      this.onChange,
      this.getText,
      this.timestamp
    );
  }
}

export class CompoundCommand implements EditorCommand {
  constructor(private commands: EditorCommand[], private description: string) { }

  execute(): void {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  getDescription(): string {
    return this.description;
  }
}

export class EditorHistory {
  private history: EditorCommand[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 100;
  private saveDebounceTimeout: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 100) {
    this.maxHistorySize = maxSize;
    this.loadFromStorage();
  }

  executeCommand(command: EditorCommand): void {
    try {
      // Try to merge with the last command if possible
      if (this.currentIndex >= 0 && this.history[this.currentIndex]?.canMergeWith?.(command)) {
        const mergedCommand = this.history[this.currentIndex].mergeWith!(command);
        this.history[this.currentIndex] = mergedCommand;
        this.debouncedSave();
        return;
      }

      // Remove any commands after current index (when undoing then doing new action)
      this.history = this.history.slice(0, this.currentIndex + 1);

      // Add new command
      this.history.push(command);
      this.currentIndex++;

      // Limit history size
      if (this.history.length > this.maxHistorySize) {
        const removeCount = this.history.length - this.maxHistorySize;
        this.history = this.history.slice(removeCount);
        this.currentIndex = this.history.length - 1;
      }

      this.debouncedSave();
    } catch (error) {
      console.error('Error executing command:', error);
    }
  }

  undo(): boolean {
    try {
      if (this.canUndo()) {
        const command = this.history[this.currentIndex];
        command.undo();
        this.currentIndex--;
        this.debouncedSave();
        return true;
      }
    } catch (error) {
      console.error('Error during undo:', error);
    }
    return false;
  }

  redo(): boolean {
    try {
      if (this.canRedo()) {
        this.currentIndex++;
        const command = this.history[this.currentIndex];
        command.execute();
        this.debouncedSave();
        return true;
      }
    } catch (error) {
      console.error('Error during redo:', error);
    }
    return false;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getHistoryInfo(): { canUndo: boolean; canRedo: boolean; undoDescription: string; redoDescription: string } {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDescription: this.canUndo() ? this.history[this.currentIndex].getDescription() : '',
      redoDescription: this.canRedo() ? this.history[this.currentIndex + 1].getDescription() : ''
    };
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.saveToStorage();
  }

  private debouncedSave(): void {
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
    }
    this.saveDebounceTimeout = setTimeout(() => {
      this.saveToStorage();
    }, 1000);
  }

  private saveToStorage(): void {
    try {
      const historyData = {
        currentIndex: this.currentIndex,
        historyCount: this.history.length,
        timestamp: Date.now()
      };
      localStorage.setItem('cosmic-editor-history', JSON.stringify(historyData));
    } catch (error) {
      console.error('Failed to save history to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('cosmic-editor-history');
      if (stored) {
        const historyData = JSON.parse(stored);
        this.currentIndex = historyData.currentIndex ?? -1;
        // Note: We can't restore actual commands from storage, only metadata
      }
    } catch (error) {
      console.error('Failed to load history from localStorage:', error);
    }
  }
}

// Enhanced Multiple cursor management with optimized operations
export interface CursorPosition {
  line: number;
  column: number;
  index: number;
  id: string;
}

export class MultiCursorManager {
  private cursors: CursorPosition[] = [];
  private nextId = 1;

  addCursor(position: Omit<CursorPosition, 'id'>): string {
    const id = `cursor-${this.nextId++}`;
    const cursor: CursorPosition = { ...position, id };

    // Use binary search to find insertion point
    const insertIndex = this.binarySearchInsertionPoint(cursor.index);

    // Check if cursor already exists at this position
    if (insertIndex < this.cursors.length && this.cursors[insertIndex].index === cursor.index) {
      return this.cursors[insertIndex].id; // Return existing cursor ID
    }

    this.cursors.splice(insertIndex, 0, cursor);
    return id;
  }

  removeCursor(id: string): boolean {
    const index = this.cursors.findIndex(cursor => cursor.id === id);
    if (index !== -1) {
      this.cursors.splice(index, 1);
      return true;
    }
    return false;
  }

  removeCursorAtIndex(index: number): boolean {
    const cursorIndex = this.cursors.findIndex(cursor => cursor.index === index);
    if (cursorIndex !== -1) {
      this.cursors.splice(cursorIndex, 1);
      return true;
    }
    return false;
  }

  getCursors(): CursorPosition[] {
    return [...this.cursors];
  }

  getCursorById(id: string): CursorPosition | null {
    return this.cursors.find(cursor => cursor.id === id) || null;
  }

  clear(): void {
    this.cursors = [];
    this.nextId = 1;
  }

  updateCursorsAfterEdit(editIndex: number, lengthChange: number): void {
    this.cursors = this.cursors
      .map(cursor => {
        if (cursor.index > editIndex) {
          const newIndex = Math.max(editIndex, cursor.index + lengthChange);
          return {
            ...cursor,
            index: newIndex
          };
        } else if (cursor.index === editIndex && lengthChange < 0) {
          // Handle deletion at cursor position
          return {
            ...cursor,
            index: editIndex
          };
        }
        return cursor;
      })
      .filter(cursor => cursor.index >= 0); // Remove cursors with invalid positions

    // Re-sort after updates
    this.cursors.sort((a, b) => a.index - b.index);
  }

  mergeCursorsAtSamePosition(): void {
    const unique = new Map<number, CursorPosition>();

    this.cursors.forEach(cursor => {
      if (!unique.has(cursor.index)) {
        unique.set(cursor.index, cursor);
      }
    });

    this.cursors = Array.from(unique.values());
  }

  getSelectionRanges(): Array<{ start: number, end: number }> {
    // For multi-cursor selections, each cursor represents a point selection
    return this.cursors.map(cursor => ({
      start: cursor.index,
      end: cursor.index
    }));
  }

  private binarySearchInsertionPoint(targetIndex: number): number {
    let left = 0;
    let right = this.cursors.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.cursors[mid].index < targetIndex) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }
}

// Performance monitor for editor operations
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static startMeasurement(operation: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;

      if (!this.measurements.has(operation)) {
        this.measurements.set(operation, []);
      }

      const measurements = this.measurements.get(operation)!;
      measurements.push(duration);

      // Keep only last 100 measurements
      if (measurements.length > 100) {
        measurements.shift();
      }

      // Log if operation is slow
      if (duration > 16) { // 60 FPS threshold
        console.warn(`Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  static getAverageTime(operation: string): number {
    const measurements = this.measurements.get(operation);
    if (!measurements || measurements.length === 0) return 0;

    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }

  static getPerformanceReport(): Record<string, { avg: number, count: number, max: number }> {
    const report: Record<string, { avg: number, count: number, max: number }> = {};

    this.measurements.forEach((times, operation) => {
      report[operation] = {
        avg: times.reduce((sum, time) => sum + time, 0) / times.length,
        count: times.length,
        max: Math.max(...times)
      };
    });

    return report;
  }
}