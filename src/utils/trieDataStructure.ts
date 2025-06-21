
// Enhanced Trie data structure with better performance and bug fixes
export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  frequency: number;
  depth: number;

  constructor(depth: number = 0) {
    this.children = new Map();
    this.isEndOfWord = false;
    this.frequency = 0;
    this.depth = depth;
  }
}

export class Trie {
  private root: TrieNode;
  private wordCount: number;
  private maxDepth: number;

  constructor() {
    this.root = new TrieNode();
    this.wordCount = 0;
    this.maxDepth = 0;
    this.loadFromStorage();
  }

  insert(word: string): void {
    if (!word || word.trim().length === 0) return;

    word = word.trim().toLowerCase();
    let current = this.root;
    let depth = 0;

    for (const char of word) {
      if (!current.children.has(char)) {
        depth++;
        current.children.set(char, new TrieNode(depth));
      }
      current = current.children.get(char)!;
      depth = current.depth;
    }

    const wasNewWord = !current.isEndOfWord;
    current.isEndOfWord = true;
    current.frequency++;

    if (wasNewWord) {
      this.wordCount++;
      this.maxDepth = Math.max(this.maxDepth, word.length);
    }

    this.debouncedSave();
  }

  searchPrefix(prefix: string): string[] {
    if (!prefix || prefix.trim().length === 0) {
      return this.getMostFrequentWords(5);
    }

    prefix = prefix.trim().toLowerCase();
    let current = this.root;

    // Navigate to the prefix node
    for (const char of prefix) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }

    // Collect all words with this prefix
    const suggestions: Array<{ word: string, frequency: number }> = [];
    this.collectWords(current, prefix, suggestions);

    // Sort by frequency (descending), then alphabetically
    return suggestions
      .sort((a, b) => {
        if (a.frequency !== b.frequency) return b.frequency - a.frequency;
        return a.word.localeCompare(b.word);
      })
      .slice(0, 10)
      .map(item => item.word);
  }

  private collectWords(
    node: TrieNode,
    prefix: string,
    suggestions: Array<{ word: string, frequency: number }>
  ): void {
    if (node.isEndOfWord) {
      suggestions.push({
        word: prefix,
        frequency: node.frequency
      });
    }

    // Limit recursion depth to prevent stack overflow
    if (prefix.length > 30) return;

    for (const [char, childNode] of node.children) {
      this.collectWords(childNode, prefix + char, suggestions);
    }
  }

  // Get most frequent words
  getMostFrequentWords(count: number = 10): string[] {
    const allWords: Array<{ word: string, frequency: number }> = [];
    this.collectWords(this.root, '', allWords);
    
    return allWords
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, count)
      .map(({ word }) => word);
  }

  // Check if word exists
  contains(word: string): boolean {
    if (!word || word.trim().length === 0) return false;

    word = word.trim().toLowerCase();
    let current = this.root;

    for (const char of word) {
      if (!current.children.has(char)) {
        return false;
      }
      current = current.children.get(char)!;
    }

    return current.isEndOfWord;
  }

  // Get word frequency
  getFrequency(word: string): number {
    if (!word || word.trim().length === 0) return 0;

    word = word.trim().toLowerCase();
    let current = this.root;

    for (const char of word) {
      if (!current.children.has(char)) {
        return 0;
      }
      current = current.children.get(char)!;
    }

    return current.isEndOfWord ? current.frequency : 0;
  }

  // Clear all data
  clear(): void {
    this.root = new TrieNode();
    this.wordCount = 0;
    this.maxDepth = 0;
    this.saveToStorage();
  }

  private saveDebounceTimeout: NodeJS.Timeout | null = null;

  private debouncedSave(): void {
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
    }
    this.saveDebounceTimeout = setTimeout(() => {
      this.saveToStorage();
    }, 2000);
  }

  private saveToStorage(): void {
    try {
      const trieData = this.serializeTrie();
      const compressed = JSON.stringify(trieData);
      localStorage.setItem('cosmic-editor-trie', compressed);
    } catch (error) {
      console.error('Failed to save trie to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('cosmic-editor-trie');
      if (stored) {
        const trieData = JSON.parse(stored);
        this.deserializeTrie(trieData);
        return;
      }
      
      // Initialize with defaults if no stored data
      this.initializeWithDefaults();
    } catch (error) {
      console.error('Failed to load trie from localStorage:', error);
      this.initializeWithDefaults();
    }
  }

  private initializeWithDefaults(): void {
    const defaultWords = [
      // React Hooks
      'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
      'useReducer', 'useLayoutEffect',

      // React Components
      'React', 'ReactDOM', 'Component', 'Fragment',

      // JavaScript Built-ins
      'console', 'document', 'window', 'setTimeout', 'setInterval',

      // JavaScript Keywords
      'function', 'const', 'let', 'var', 'return', 'import', 'export', 'default',
      'interface', 'type', 'class', 'extends', 'implements',

      // Async/Await
      'async', 'await', 'Promise', 'then', 'catch', 'finally',

      // Data Types
      'Array', 'Object', 'String', 'Number', 'Boolean', 'Date',

      // Control Flow
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'try', 'catch', 'finally', 'throw', 'new', 'this',

      // Common Patterns
      'props', 'state', 'render', 'component', 'element', 'event', 'handler'
    ];

    defaultWords.forEach(word => this.insert(word));
  }

  private serializeTrie(): any {
    const serialize = (node: TrieNode): any => {
      const result: any = {
        isEndOfWord: node.isEndOfWord,
        frequency: node.frequency,
        children: {}
      };

      for (const [char, childNode] of node.children) {
        result.children[char] = serialize(childNode);
      }

      return result;
    };

    return serialize(this.root);
  }

  private deserializeTrie(data: any): void {
    const deserialize = (nodeData: any, depth: number = 0): TrieNode => {
      const node = new TrieNode(depth);
      node.isEndOfWord = nodeData.isEndOfWord || false;
      node.frequency = nodeData.frequency || 0;

      for (const [char, childData] of Object.entries(nodeData.children || {})) {
        node.children.set(char, deserialize(childData, depth + 1));
      }

      return node;
    };

    this.root = deserialize(data);
  }
}
