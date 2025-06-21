// Enhanced Trie data structure with compression and advanced features
export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  frequency: number;
  depth: number;
  parent: TrieNode | null;
  wordEndings: string[]; // Store complete words ending at this node

  constructor(parent: TrieNode | null = null, depth: number = 0) {
    this.children = new Map();
    this.isEndOfWord = false;
    this.frequency = 0;
    this.depth = depth;
    this.parent = parent;
    this.wordEndings = [];
  }

  // Get the character that leads to this node from parent
  getChar(): string | null {
    if (!this.parent) return null;

    for (const [char, child] of this.parent.children) {
      if (child === this) return char;
    }
    return null;
  }

  // Get the path from root to this node
  getPath(): string {
    const path: string[] = [];
    let current: TrieNode | null = this;

    while (current && current.parent) {
      const char = current.getChar();
      if (char) path.unshift(char);
      current = current.parent;
    }

    return path.join('');
  }
}

export class Trie {
  private root: TrieNode;
  private wordCount: number;
  private maxDepth: number;
  private compressionThreshold: number;

  constructor(compressionThreshold: number = 10) {
    this.root = new TrieNode();
    this.wordCount = 0;
    this.maxDepth = 0;
    this.compressionThreshold = compressionThreshold;
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
        current.children.set(char, new TrieNode(current, depth));
      }
      current = current.children.get(char)!;
      depth = current.depth;
    }

    const wasNewWord = !current.isEndOfWord;
    current.isEndOfWord = true;
    current.frequency++;

    if (!current.wordEndings.includes(word)) {
      current.wordEndings.push(word);
    }

    if (wasNewWord) {
      this.wordCount++;
      this.maxDepth = Math.max(this.maxDepth, word.length);
    }

    this.debouncedSave();
  }

  // Bulk insert for better performance
  insertMany(words: string[]): void {
    const validWords = words.filter(word => word && word.trim().length > 0);

    for (const word of validWords) {
      this.insertWithoutSave(word.trim().toLowerCase());
    }

    this.debouncedSave();
  }

  private insertWithoutSave(word: string): void {
    let current = this.root;
    let depth = 0;

    for (const char of word) {
      if (!current.children.has(char)) {
        depth++;
        current.children.set(char, new TrieNode(current, depth));
      }
      current = current.children.get(char)!;
      depth = current.depth;
    }

    const wasNewWord = !current.isEndOfWord;
    current.isEndOfWord = true;
    current.frequency++;

    if (!current.wordEndings.includes(word)) {
      current.wordEndings.push(word);
    }

    if (wasNewWord) {
      this.wordCount++;
      this.maxDepth = Math.max(this.maxDepth, word.length);
    }
  }

  searchPrefix(prefix: string): string[] {
    if (!prefix || prefix.trim().length === 0) {
      return this.getMostFrequentWords(10);
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
    const suggestions: Array<{ word: string, frequency: number, depth: number }> = [];
    this.collectWords(current, prefix, suggestions);

    // Sort by frequency (descending), then by length (ascending), then alphabetically
    return suggestions
      .sort((a, b) => {
        if (a.frequency !== b.frequency) return b.frequency - a.frequency;
        if (a.word.length !== b.word.length) return a.word.length - b.word.length;
        return a.word.localeCompare(b.word);
      })
      .slice(0, 20) // Return top 20 suggestions
      .map(item => item.word);
  }

  // Fuzzy search with edit distance
  fuzzySearch(query: string, maxDistance: number = 2): string[] {
    if (!query || query.trim().length === 0) return [];

    query = query.trim().toLowerCase();
    const results: Array<{ word: string, distance: number, frequency: number }> = [];

    this.collectAllWords().forEach(({ word, frequency }) => {
      const distance = this.editDistance(query, word);
      if (distance <= maxDistance) {
        results.push({ word, distance, frequency });
      }
    });

    return results
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.frequency !== b.frequency) return b.frequency - a.frequency;
        return a.word.localeCompare(b.word);
      })
      .slice(0, 10)
      .map(item => item.word);
  }

  private editDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],    // deletion
            dp[i][j - 1],    // insertion
            dp[i - 1][j - 1] // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  private collectWords(
    node: TrieNode,
    prefix: string,
    suggestions: Array<{ word: string, frequency: number, depth: number }>
  ): void {
    if (node.isEndOfWord) {
      suggestions.push({
        word: prefix,
        frequency: node.frequency,
        depth: node.depth
      });
    }

    // Limit recursion depth to prevent stack overflow
    if (prefix.length > 50) return;

    for (const [char, childNode] of node.children) {
      this.collectWords(childNode, prefix + char, suggestions);
    }
  }

  private collectAllWords(): Array<{ word: string, frequency: number, depth: number }> {
    const words: Array<{ word: string, frequency: number, depth: number }> = [];
    this.collectWords(this.root, '', words);
    return words;
  }

  // Get words by frequency range
  getWordsByFrequency(minFreq: number, maxFreq: number = Infinity): string[] {
    const allWords = this.collectAllWords();
    return allWords
      .filter(({ frequency }) => frequency >= minFreq && frequency <= maxFreq)
      .sort((a, b) => b.frequency - a.frequency)
      .map(({ word }) => word);
  }

  // Get most frequent words
  getMostFrequentWords(count: number = 10): string[] {
    return this.collectAllWords()
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, count)
      .map(({ word }) => word);
  }

  // Remove word from trie
  remove(word: string): boolean {
    if (!word || word.trim().length === 0) return false;

    word = word.trim().toLowerCase();
    const path: TrieNode[] = [this.root];
    let current = this.root;

    // Build path to word
    for (const char of word) {
      if (!current.children.has(char)) {
        return false; // Word doesn't exist
      }
      current = current.children.get(char)!;
      path.push(current);
    }

    if (!current.isEndOfWord) {
      return false; // Word doesn't exist
    }

    // Mark as not end of word and decrease frequency
    current.isEndOfWord = false;
    current.frequency = Math.max(0, current.frequency - 1);
    current.wordEndings = current.wordEndings.filter(w => w !== word);
    this.wordCount--;

    // Clean up nodes if they're no longer needed
    for (let i = path.length - 1; i > 0; i--) {
      const node = path[i];
      const parent = path[i - 1];

      if (!node.isEndOfWord && node.children.size === 0) {
        const char = node.getChar();
        if (char) {
          parent.children.delete(char);
        }
      } else {
        break; // Stop if node is still needed
      }
    }

    this.debouncedSave();
    return true;
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

  // Get trie statistics
  getStatistics(): {
    wordCount: number;
    nodeCount: number;
    maxDepth: number;
    averageWordLength: number;
    memoryUsage: string;
  } {
    const nodeCount = this.countNodes(this.root);
    const allWords = this.collectAllWords();
    const totalLength = allWords.reduce((sum, { word }) => sum + word.length, 0);
    const averageWordLength = allWords.length > 0 ? totalLength / allWords.length : 0;

    // Rough memory usage calculation
    const memoryUsage = `~${Math.round((nodeCount * 100 + totalLength * 2) / 1024)}KB`;

    return {
      wordCount: this.wordCount,
      nodeCount,
      maxDepth: this.maxDepth,
      averageWordLength: Math.round(averageWordLength * 100) / 100,
      memoryUsage
    };
  }

  private countNodes(node: TrieNode): number {
    let count = 1;
    for (const child of node.children.values()) {
      count += this.countNodes(child);
    }
    return count;
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

      // Save metadata separately for quick access
      localStorage.setItem('cosmic-editor-trie-meta', JSON.stringify({
        wordCount: this.wordCount,
        maxDepth: this.maxDepth,
        lastSaved: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save trie to localStorage:', error);
      // If storage is full, clear old data and try again
      this.clearOldStorageData();
    }
  }

  private clearOldStorageData(): void {
    try {
      // Clear old editor data but keep the trie
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cosmic-editor-') && !key.includes('trie')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear old storage data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('cosmic-editor-trie');
      const meta = localStorage.getItem('cosmic-editor-trie-meta');

      if (stored && meta) {
        const metaData = JSON.parse(meta);
        const trieData = JSON.parse(stored);

        // Check if data is recent (within 30 days)
        const isRecent = Date.now() - metaData.lastSaved < 30 * 24 * 60 * 60 * 1000;

        if (isRecent) {
          this.deserializeTrie(trieData);
          this.wordCount = metaData.wordCount || 0;
          this.maxDepth = metaData.maxDepth || 0;
          return;
        }
      }

      // Initialize with defaults if no valid stored data
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
      'useReducer', 'useLayoutEffect', 'useImperativeHandle', 'useDebugValue',

      // React Components
      'React', 'ReactDOM', 'Component', 'PureComponent', 'Fragment', 'StrictMode',
      'Suspense', 'ErrorBoundary', 'Provider', 'Consumer',

      // JavaScript Built-ins
      'console', 'document', 'window', 'setTimeout', 'setInterval', 'clearTimeout',
      'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',

      // JavaScript Keywords
      'function', 'const', 'let', 'var', 'return', 'import', 'export', 'default',
      'interface', 'type', 'class', 'extends', 'implements', 'public', 'private',
      'protected', 'static', 'abstract', 'readonly', 'enum',

      // Async/Await
      'async', 'await', 'Promise', 'then', 'catch', 'finally', 'resolve', 'reject',

      // Data Types
      'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Map',
      'Set', 'WeakMap', 'WeakSet', 'Symbol', 'BigInt',

      // Control Flow
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'instanceof',

      // Common Libraries
      'lodash', 'axios', 'express', 'router', 'middleware', 'typescript', 'javascript',

      // HTML/CSS
      'div', 'span', 'button', 'input', 'form', 'img', 'link', 'script', 'style',
      'className', 'onClick', 'onChange', 'onSubmit', 'preventDefault',

      // Common Patterns
      'props', 'state', 'render', 'mount', 'unmount', 'update', 'component',
      'element', 'event', 'handler', 'callback', 'promise', 'error', 'loading'
    ];

    this.insertMany(defaultWords);
  }

  private serializeTrie(): any {
    const serialize = (node: TrieNode): any => {
      const result: any = {
        isEndOfWord: node.isEndOfWord,
        frequency: node.frequency,
        wordEndings: node.wordEndings,
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
    const deserialize = (nodeData: any, parent: TrieNode | null = null, depth: number = 0): TrieNode => {
      const node = new TrieNode(parent, depth);
      node.isEndOfWord = nodeData.isEndOfWord || false;
      node.frequency = nodeData.frequency || 0;
      node.wordEndings = nodeData.wordEndings || [];

      for (const [char, childData] of Object.entries(nodeData.children || {})) {
        node.children.set(char, deserialize(childData, node, depth + 1));
      }

      return node;
    };

    this.root = deserialize(data);
  }

  // Export trie data for backup
  exportData(): string {
    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      statistics: this.getStatistics(),
      data: this.serializeTrie()
    }, null, 2);
  }

  // Import trie data from backup
  importData(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData);

      if (imported.version && imported.data) {
        this.deserializeTrie(imported.data);
        this.wordCount = imported.statistics?.wordCount || 0;
        this.maxDepth = imported.statistics?.maxDepth || 0;
        this.saveToStorage();
        return true;
      }
    } catch (error) {
      console.error('Failed to import trie data:', error);
    }
    return false;
  }
}