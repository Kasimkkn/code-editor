// Advanced syntax highlighting with extensible grammar system
export interface Token {
  type: string;
  value: string;
  start: number;
  end: number;
  metadata?: Record<string, any>;
}

export interface TokenRule {
  type: string;
  regex: RegExp;
  className: string;
  priority: number;
  processor?: (match: RegExpMatchArray, context: TokenContext) => Token | null;
}

export interface TokenContext {
  text: string;
  position: number;
  previousTokens: Token[];
  currentScope: string[];
}

export interface LanguageGrammar {
  name: string;
  tokenRules: TokenRule[];
  scopeRules?: Array<{
    start: RegExp;
    end: RegExp;
    scope: string;
    allowNested?: boolean;
  }>;
  postProcessors?: Array<(tokens: Token[]) => Token[]>;
}

export class SyntaxHighlighter {
  private currentGrammar: LanguageGrammar;
  private grammars: Map<string, LanguageGrammar> = new Map();
  private cache: Map<string, Token[]> = new Map();
  private maxCacheSize = 100;

  constructor(language: string = 'javascript') {
    this.initializeGrammars();
    this.currentGrammar = this.grammars.get(language) || this.grammars.get('javascript')!;
  }

  private initializeGrammars(): void {
    // JavaScript/TypeScript Grammar
    this.grammars.set('javascript', {
      name: 'JavaScript',
      tokenRules: [
        // Template literals (highest priority)
        {
          type: 'template-literal',
          regex: /`(?:[^`\\]|\\.)*`/g,
          className: 'text-green-300',
          priority: 100,
          processor: this.processTemplateLiteral.bind(this)
        },

        // Comments (high priority)
        {
          type: 'comment-block',
          regex: /\/\*[\s\S]*?\*\//g,
          className: 'text-slate-500 italic',
          priority: 95
        },
        {
          type: 'comment-line',
          regex: /\/\/.*$/gm,
          className: 'text-slate-500 italic',
          priority: 95
        },

        // JSDoc comments
        {
          type: 'jsdoc',
          regex: /\/\*\*[\s\S]*?\*\//g,
          className: 'text-blue-400 italic',
          priority: 96
        },

        // Strings
        {
          type: 'string-double',
          regex: /"(?:[^"\\]|\\.)*"/g,
          className: 'text-green-400',
          priority: 90
        },
        {
          type: 'string-single',
          regex: /'(?:[^'\\]|\\.)*'/g,
          className: 'text-green-400',
          priority: 90
        },

        // RegExp literals
        {
          type: 'regexp',
          regex: /\/(?![*/])(?:[^/\\\r\n]|\\.)+\/[gimsuxy]*/g,
          className: 'text-red-400',
          priority: 85,
          processor: this.processRegExp.bind(this)
        },

        // Numbers
        {
          type: 'number-hex',
          regex: /0[xX][0-9a-fA-F]+n?/g,
          className: 'text-orange-400',
          priority: 80
        },
        {
          type: 'number-binary',
          regex: /0[bB][01]+n?/g,
          className: 'text-orange-400',
          priority: 80
        },
        {
          type: 'number-octal',
          regex: /0[oO][0-7]+n?/g,
          className: 'text-orange-400',
          priority: 80
        },
        {
          type: 'number-float',
          regex: /\b\d+\.\d+([eE][+-]?\d+)?[fFdD]?\b/g,
          className: 'text-yellow-400',
          priority: 75
        },
        {
          type: 'number-integer',
          regex: /\b\d+([eE][+-]?\d+)?[nfFdDlL]?\b/g,
          className: 'text-yellow-400',
          priority: 75
        },

        // Keywords (context-aware)
        {
          type: 'keyword-control',
          regex: /\b(if|else|switch|case|default|for|while|do|break|continue|return|throw|try|catch|finally|with)\b/g,
          className: 'text-purple-400 font-semibold',
          priority: 70
        },
        {
          type: 'keyword-declaration',
          regex: /\b(var|let|const|function|class|interface|type|enum|namespace|module|import|export|default|declare)\b/g,
          className: 'text-blue-400 font-semibold',
          priority: 70
        },
        {
          type: 'keyword-modifier',
          regex: /\b(public|private|protected|static|readonly|abstract|async|await|yield|new|delete|typeof|instanceof)\b/g,
          className: 'text-cyan-400 font-medium',
          priority: 70
        },
        {
          type: 'keyword-literal',
          regex: /\b(true|false|null|undefined|this|super|arguments)\b/g,
          className: 'text-red-300 font-medium',
          priority: 70
        },

        // React/JSX
        {
          type: 'react-hook',
          regex: /\buse[A-Z][a-zA-Z]*\b/g,
          className: 'text-pink-400 font-semibold',
          priority: 75
        },
        {
          type: 'react-component',
          regex: /\b[A-Z][a-zA-Z]*(?=\s*[<(])/g,
          className: 'text-cyan-300 font-semibold',
          priority: 65
        },
        {
          type: 'jsx-tag',
          regex: /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?\/?>/g,
          className: 'text-blue-300',
          priority: 60,
          processor: this.processJSXTag.bind(this)
        },

        // Functions and methods
        {
          type: 'function-declaration',
          regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\s*[(])/g,
          className: 'text-yellow-300',
          priority: 55
        },
        {
          type: 'method-call',
          regex: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\s*[(])/g,
          className: 'text-green-300',
          priority: 55
        },

        // Properties and attributes
        {
          type: 'property-access',
          regex: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
          className: 'text-orange-300',
          priority: 50
        },
        {
          type: 'object-key',
          regex: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
          className: 'text-blue-300',
          priority: 50
        },

        // Operators
        {
          type: 'operator-logical',
          regex: /&&|\|\||!(?!=)/g,
          className: 'text-purple-300 font-bold',
          priority: 45
        },
        {
          type: 'operator-comparison',
          regex: /===|!==|==|!=|<=|>=|<|>/g,
          className: 'text-pink-300 font-bold',
          priority: 45
        },
        {
          type: 'operator-assignment',
          regex: /\+=|-=|\*=|\/=|%=|\*\*=|&=|\|=|\^=|<<=|>>=|>>>=|=(?!=)/g,
          className: 'text-orange-300 font-bold',
          priority: 45
        },
        {
          type: 'operator-arithmetic',
          regex: /\+\+|--|[+\-*/%]|\*\*/g,
          className: 'text-yellow-300',
          priority: 40
        },
        {
          type: 'operator-bitwise',
          regex: /[&|^~]|<<|>>|>>>/g,
          className: 'text-cyan-300',
          priority: 40
        },

        // Punctuation
        {
          type: 'punctuation-bracket',
          regex: /[(){}\[\]]/g,
          className: 'text-slate-300 font-bold',
          priority: 35
        },
        {
          type: 'punctuation-delimiter',
          regex: /[,;:.?]/g,
          className: 'text-slate-400',
          priority: 30
        },

        // Identifiers (lowest priority)
        {
          type: 'identifier',
          regex: /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g,
          className: 'text-white',
          priority: 10
        }
      ],

      postProcessors: [
        this.enhanceReactTokens.bind(this),
        this.enhanceTypeScriptTokens.bind(this)
      ]
    });

    // TypeScript specific additions
    this.grammars.set('typescript', {
      ...this.grammars.get('javascript')!,
      name: 'TypeScript',
      tokenRules: [
        ...this.grammars.get('javascript')!.tokenRules,
        {
          type: 'type-annotation',
          regex: /:\s*[a-zA-Z_$][a-zA-Z0-9_$<>\[\]|&]*(?:\s*\|\s*[a-zA-Z_$][a-zA-Z0-9_$<>\[\]|&]*)*/g,
          className: 'text-emerald-400',
          priority: 68
        },
        {
          type: 'generic-type',
          regex: /<[a-zA-Z_$][a-zA-Z0-9_$,\s<>|&\[\]]*>/g,
          className: 'text-teal-400',
          priority: 65
        }
      ]
    });

    // CSS Grammar
    this.grammars.set('css', {
      name: 'CSS',
      tokenRules: [
        {
          type: 'comment',
          regex: /\/\*[\s\S]*?\*\//g,
          className: 'text-slate-500 italic',
          priority: 95
        },
        {
          type: 'selector',
          regex: /[.#]?[a-zA-Z][a-zA-Z0-9-_]*(?=\s*{)/g,
          className: 'text-blue-400',
          priority: 80
        },
        {
          type: 'property',
          regex: /[a-zA-Z-]+(?=\s*:)/g,
          className: 'text-cyan-400',
          priority: 70
        },
        {
          type: 'value',
          regex: /:\s*[^;{}]+/g,
          className: 'text-green-400',
          priority: 60
        },
        {
          type: 'unit',
          regex: /\d+(?:px|em|rem|%|vh|vw|ch|ex|cm|mm|in|pt|pc|deg|rad|turn|s|ms)/g,
          className: 'text-yellow-400',
          priority: 75
        }
      ]
    });

    // JSON Grammar
    this.grammars.set('json', {
      name: 'JSON',
      tokenRules: [
        {
          type: 'string',
          regex: /"(?:[^"\\]|\\.)*"/g,
          className: 'text-green-400',
          priority: 90
        },
        {
          type: 'number',
          regex: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
          className: 'text-yellow-400',
          priority: 80
        },
        {
          type: 'boolean',
          regex: /\b(true|false)\b/g,
          className: 'text-purple-400',
          priority: 75
        },
        {
          type: 'null',
          regex: /\bnull\b/g,
          className: 'text-red-400',
          priority: 75
        },
        {
          type: 'punctuation',
          regex: /[{}\[\]:,]/g,
          className: 'text-slate-300',
          priority: 70
        }
      ]
    });
  }

  setLanguage(language: string): void {
    const grammar = this.grammars.get(language);
    if (grammar) {
      this.currentGrammar = grammar;
      this.cache.clear(); // Clear cache when changing language
    }
  }

  tokenize(code: string): Token[] {
    if (!code) return [];

    // Check cache first
    const cacheKey = `${this.currentGrammar.name}:${this.hashCode(code)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const tokens: Token[] = [];
    const processedRanges: Array<{ start: number, end: number }> = [];

    // Sort rules by priority (highest first)
    const sortedRules = [...this.currentGrammar.tokenRules].sort((a, b) => b.priority - a.priority);

    // Process each token rule
    for (const rule of sortedRules) {
      this.processRule(code, rule, tokens, processedRanges);
    }

    // Sort tokens by start position
    tokens.sort((a, b) => a.start - b.start);

    // Apply post-processors
    let processedTokens = tokens;
    if (this.currentGrammar.postProcessors) {
      for (const processor of this.currentGrammar.postProcessors) {
        processedTokens = processor(processedTokens);
      }
    }

    // Cache the result
    this.cacheTokens(cacheKey, processedTokens);

    return processedTokens;
  }

  private processRule(
    code: string,
    rule: TokenRule,
    tokens: Token[],
    processedRanges: Array<{ start: number, end: number }>
  ): void {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(code)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Check if this range overlaps with already processed ranges
      const overlaps = processedRanges.some(range =>
        (start < range.end && end > range.start)
      );

      if (!overlaps) {
        let token: Token | null;

        if (rule.processor) {
          const context: TokenContext = {
            text: code,
            position: start,
            previousTokens: tokens.filter(t => t.end <= start),
            currentScope: []
          };
          token = rule.processor(match, context);
        } else {
          token = {
            type: rule.type,
            value: match[0],
            start,
            end
          };
        }

        if (token) {
          tokens.push(token);
          processedRanges.push({ start, end });
        }
      }
    }
  }

  highlightCode(code: string): string {
    const tokens = this.tokenize(code);
    let result = '';
    let lastIndex = 0;

    for (const token of tokens) {
      // Add unhighlighted text before this token
      result += this.escapeHtml(code.substring(lastIndex, token.start));

      // Add highlighted token
      const className = this.getTokenClassName(token.type);
      const attributes = this.getTokenAttributes(token);
      result += `<span class="${className}"${attributes}>${this.escapeHtml(token.value)}</span>`;

      lastIndex = token.end;
    }

    // Add remaining unhighlighted text
    result += this.escapeHtml(code.substring(lastIndex));

    return result;
  }

  private processTemplateLiteral(match: RegExpMatchArray, context: TokenContext): Token | null {
    const value = match[0];
    const start = match.index!;

    return {
      type: 'template-literal',
      value,
      start,
      end: start + value.length,
      metadata: {
        hasInterpolation: value.includes('${'),
        language: 'javascript'
      }
    };
  }

  private processRegExp(match: RegExpMatchArray, context: TokenContext): Token | null {
    const value = match[0];
    const start = match.index!;

    // Validate that this is actually a regex (not division)
    const prevChar = context.text[start - 1];
    const isRegex = !prevChar || /[=([,;:!&|?{},\n]/.test(prevChar);

    if (!isRegex) return null;

    return {
      type: 'regexp',
      value,
      start,
      end: start + value.length,
      metadata: {
        flags: value.match(/\/([gimsuxy]*)$/)?.[1] || ''
      }
    };
  }

  private processJSXTag(match: RegExpMatchArray, context: TokenContext): Token | null {
    const value = match[0];
    const start = match.index!;

    return {
      type: 'jsx-tag',
      value,
      start,
      end: start + value.length,
      metadata: {
        isClosing: value.startsWith('</'),
        isSelfClosing: value.endsWith('/>')
      }
    };
  }

  private enhanceReactTokens(tokens: Token[]): Token[] {
    return tokens.map(token => {
      if (token.type === 'identifier') {
        // Enhance React component detection
        if (/^[A-Z]/.test(token.value) && this.isComponentContext(token, tokens)) {
          return {
            ...token,
            type: 'react-component',
            metadata: { ...token.metadata, isComponent: true }
          };
        }

        // Enhance hook detection
        if (token.value.startsWith('use') && /^use[A-Z]/.test(token.value)) {
          return {
            ...token,
            type: 'react-hook',
            metadata: { ...token.metadata, isHook: true }
          };
        }
      }

      return token;
    });
  }

  private enhanceTypeScriptTokens(tokens: Token[]): Token[] {
    return tokens.map(token => {
      if (token.type === 'identifier') {
        // Enhance type detection
        if (this.isTypeContext(token, tokens)) {
          return {
            ...token,
            type: 'type-name',
            metadata: { ...token.metadata, isType: true }
          };
        }
      }

      return token;
    });
  }

  private isComponentContext(token: Token, tokens: Token[]): boolean {
    const nextToken = tokens.find(t => t.start > token.end);
    return nextToken?.value === '<' || nextToken?.value === '(';
  }

  private isTypeContext(token: Token, tokens: Token[]): boolean {
    const prevToken = tokens.reverse().find(t => t.end < token.start);
    return prevToken?.value === ':' || prevToken?.value === 'extends' || prevToken?.value === 'implements';
  }

  private getTokenClassName(tokenType: string): string {
    const baseClasses: Record<string, string> = {
      // Comments
      'comment-line': 'text-slate-500 italic',
      'comment-block': 'text-slate-500 italic',
      'jsdoc': 'text-blue-400 italic',

      // Strings and literals
      'string-double': 'text-green-400',
      'string-single': 'text-green-400',
      'template-literal': 'text-green-300',
      'regexp': 'text-red-400',

      // Numbers
      'number-integer': 'text-yellow-400',
      'number-float': 'text-yellow-400',
      'number-hex': 'text-orange-400',
      'number-binary': 'text-orange-400',
      'number-octal': 'text-orange-400',

      // Keywords
      'keyword-control': 'text-purple-400 font-semibold',
      'keyword-declaration': 'text-blue-400 font-semibold',
      'keyword-modifier': 'text-cyan-400 font-medium',
      'keyword-literal': 'text-red-300 font-medium',

      // React/JSX
      'react-hook': 'text-pink-400 font-semibold',
      'react-component': 'text-cyan-300 font-semibold',
      'jsx-tag': 'text-blue-300',

      // Functions and identifiers
      'function-declaration': 'text-yellow-300',
      'method-call': 'text-green-300',
      'property-access': 'text-orange-300',
      'object-key': 'text-blue-300',
      'type-name': 'text-emerald-400',
      'type-annotation': 'text-emerald-400',
      'generic-type': 'text-teal-400',

      // Operators
      'operator-logical': 'text-purple-300 font-bold',
      'operator-comparison': 'text-pink-300 font-bold',
      'operator-assignment': 'text-orange-300 font-bold',
      'operator-arithmetic': 'text-yellow-300',
      'operator-bitwise': 'text-cyan-300',

      // Punctuation
      'punctuation-bracket': 'text-slate-300 font-bold',
      'punctuation-delimiter': 'text-slate-400',

      // Default
      'identifier': 'text-white'
    };

    return baseClasses[tokenType] || 'text-white';
  }

  private getTokenAttributes(token: Token): string {
    let attributes = '';

    if (token.metadata) {
      const dataAttrs = Object.entries(token.metadata)
        .map(([key, value]) => `data-${key}="${this.escapeAttribute(String(value))}"`)
        .join(' ');

      if (dataAttrs) {
        attributes = ` ${dataAttrs}`;
      }
    }

    return attributes;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeAttribute(text: string): string {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private cacheTokens(key: string, tokens: Token[]): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const keysToDelete = Array.from(this.cache.keys()).slice(0, this.maxCacheSize / 2);
      keysToDelete.forEach(k => this.cache.delete(k));
    }

    this.cache.set(key, tokens);
  }

  // Get available languages
  getAvailableLanguages(): string[] {
    return Array.from(this.grammars.keys());
  }

  // Add custom grammar
  addGrammar(name: string, grammar: LanguageGrammar): void {
    this.grammars.set(name, grammar);
  }

  // Get current grammar info
  getCurrentGrammar(): LanguageGrammar {
    return this.currentGrammar;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    };
  }
}