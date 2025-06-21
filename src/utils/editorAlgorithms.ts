// Bracket matching using stack
export class BracketMatcher {
  private openBrackets = new Set(['(', '[', '{']);
  private closeBrackets = new Set([')', ']', '}']);
  private bracketPairs = new Map([
    [')', '('],
    [']', '['],
    ['}', '{']
  ]);

  findMatchingBrackets(code: string): Array<{start: number, end: number, type: string}> {
    const stack: Array<{char: string, index: number}> = [];
    const matches: Array<{start: number, end: number, type: string}> = [];
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (this.openBrackets.has(char)) {
        stack.push({char, index: i});
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
    
    return matches;
  }
}

// Undo/Redo system using command pattern with array-based history
export interface EditorCommand {
  execute(): void;
  undo(): void;
  getDescription(): string;
}

export class TextChangeCommand implements EditorCommand {
  constructor(
    private startPos: number,
    private endPos: number,
    private oldText: string,
    private newText: string,
    private onChange: (text: string) => void,
    private getText: () => string
  ) {}

  execute(): void {
    const currentText = this.getText();
    const newFullText = currentText.substring(0, this.startPos) + 
                       this.newText + 
                       currentText.substring(this.endPos);
    this.onChange(newFullText);
  }

  undo(): void {
    const currentText = this.getText();
    const newFullText = currentText.substring(0, this.startPos) + 
                       this.oldText + 
                       currentText.substring(this.startPos + this.newText.length);
    this.onChange(newFullText);
  }

  getDescription(): string {
    return `Text change: "${this.oldText}" → "${this.newText}"`;
  }
}

export class EditorHistory {
  private history: EditorCommand[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 100;

  constructor() {
    this.loadFromStorage();
  }

  executeCommand(command: EditorCommand): void {
    // Remove any commands after current index (when undoing then doing new action)
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new command
    this.history.push(command);
    this.currentIndex++;
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
      this.currentIndex = this.history.length - 1;
    }
    
    // Don't execute here - it's already executed in the component
    this.saveToStorage();
  }

  undo(): boolean {
    if (this.currentIndex >= 0) {
      const command = this.history[this.currentIndex];
      command.undo();
      this.currentIndex--;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      command.execute();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  private saveToStorage(): void {
    try {
      const historyData = {
        currentIndex: this.currentIndex,
        historyCount: this.history.length
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
        this.currentIndex = historyData.currentIndex || -1;
      }
    } catch (error) {
      console.error('Failed to load history from localStorage:', error);
    }
  }
}

// Multiple cursor management using two-pointer technique
export interface CursorPosition {
  line: number;
  column: number;
  index: number;
}

export class MultiCursorManager {
  private cursors: CursorPosition[] = [];
  
  addCursor(position: CursorPosition): void {
    // Use two-pointer technique to maintain sorted order
    let left = 0;
    let right = this.cursors.length - 1;
    let insertIndex = this.cursors.length;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.cursors[mid].index < position.index) {
        left = mid + 1;
      } else if (this.cursors[mid].index > position.index) {
        insertIndex = mid;
        right = mid - 1;
      } else {
        // Cursor already exists at this position
        return;
      }
    }
    
    this.cursors.splice(insertIndex, 0, position);
  }
  
  removeCursor(index: number): void {
    this.cursors = this.cursors.filter(cursor => cursor.index !== index);
  }
  
  getCursors(): CursorPosition[] {
    return [...this.cursors];
  }
  
  clear(): void {
    this.cursors = [];
  }
  
  updateCursorsAfterEdit(editIndex: number, lengthChange: number): void {
    this.cursors = this.cursors.map(cursor => {
      if (cursor.index > editIndex) {
        return {
          ...cursor,
          index: Math.max(editIndex, cursor.index + lengthChange)
        };
      }
      return cursor;
    }).filter(cursor => cursor.index >= 0);
  }
}
