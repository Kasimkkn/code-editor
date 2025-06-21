
// Trie data structure for auto-completion
export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  frequency: number;

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.frequency = 0;
  }
}

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
    this.loadFromStorage();
  }

  insert(word: string): void {
    let current = this.root;
    
    for (const char of word) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }
    
    current.isEndOfWord = true;
    current.frequency++;
    this.saveToStorage();
  }

  searchPrefix(prefix: string): string[] {
    let current = this.root;
    
    // Navigate to the prefix node
    for (const char of prefix) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }
    
    // Collect all words with this prefix
    const suggestions: Array<{word: string, frequency: number}> = [];
    this.collectWords(current, prefix, suggestions);
    
    // Sort by frequency (most used first) and return top 10
    return suggestions
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
      .map(item => item.word);
  }

  private collectWords(node: TrieNode, prefix: string, suggestions: Array<{word: string, frequency: number}>): void {
    if (node.isEndOfWord) {
      suggestions.push({ word: prefix, frequency: node.frequency });
    }
    
    for (const [char, childNode] of node.children) {
      this.collectWords(childNode, prefix + char, suggestions);
    }
  }

  private saveToStorage(): void {
    try {
      const trieData = this.serializeTrie();
      localStorage.setItem('cosmic-editor-trie', JSON.stringify(trieData));
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
      } else {
        // Initialize with common programming keywords
        this.initializeWithDefaults();
      }
    } catch (error) {
      console.error('Failed to load trie from localStorage:', error);
      this.initializeWithDefaults();
    }
  }

  private initializeWithDefaults(): void {
    const keywords = [
      'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
      'React', 'ReactDOM', 'Component', 'Fragment', 'StrictMode',
      'console', 'document', 'window', 'setTimeout', 'setInterval', 'clearTimeout',
      'function', 'const', 'let', 'var', 'return', 'import', 'export', 'default',
      'interface', 'type', 'class', 'extends', 'implements', 'public', 'private',
      'async', 'await', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'static'
    ];
    
    keywords.forEach(keyword => this.insert(keyword));
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
    const deserialize = (nodeData: any): TrieNode => {
      const node = new TrieNode();
      node.isEndOfWord = nodeData.isEndOfWord || false;
      node.frequency = nodeData.frequency || 0;
      
      for (const [char, childData] of Object.entries(nodeData.children || {})) {
        node.children.set(char, deserialize(childData));
      }
      
      return node;
    };
    
    this.root = deserialize(data);
  }
}
