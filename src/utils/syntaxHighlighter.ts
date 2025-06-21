
// Advanced syntax highlighting using regex tokenizer
export interface Token {
  type: string;
  value: string;
  start: number;
  end: number;
}

export class SyntaxHighlighter {
  private tokenRules: Array<{type: string, regex: RegExp, className: string}> = [
    // Comments (must come before other rules)
    { type: 'comment', regex: /\/\/.*$/gm, className: 'syntax-comment' },
    { type: 'comment', regex: /\/\*[\s\S]*?\*\//gm, className: 'syntax-comment' },
    
    // Strings
    { type: 'string', regex: /"(?:[^"\\]|\\.)*"/g, className: 'syntax-string' },
    { type: 'string', regex: /'(?:[^'\\]|\\.)*'/g, className: 'syntax-string' },
    { type: 'string', regex: /`(?:[^`\\]|\\.)*`/g, className: 'syntax-string' },
    
    // Numbers
    { type: 'number', regex: /\b\d+\.?\d*\b/g, className: 'syntax-number' },
    
    // Keywords
    { type: 'keyword', regex: /\b(import|from|export|default|const|let|var|function|class|interface|type|extends|implements|public|private|protected|static|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|super|null|undefined|true|false)\b/g, className: 'syntax-keyword' },
    
    // React/JS specific
    { type: 'react', regex: /\b(React|ReactDOM|Component|Fragment|useState|useEffect|useCallback|useMemo|useRef|useContext|StrictMode)\b/g, className: 'syntax-react' },
    
    // Functions
    { type: 'function', regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, className: 'syntax-function' },
    
    // Properties
    { type: 'property', regex: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g, className: 'syntax-property' },
    
    // Operators
    { type: 'operator', regex: /[+\-*\/%=<>!&|^~?:]/g, className: 'syntax-operator' },
    
    // Brackets
    { type: 'bracket', regex: /[(){}\[\]]/g, className: 'syntax-bracket' }
  ];

  tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    const processedRanges: Array<{start: number, end: number}> = [];
    
    // Process each token rule
    for (const rule of this.tokenRules) {
      let match;
      const regex = new RegExp(rule.regex.source, rule.regex.flags);
      
      while ((match = regex.exec(code)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        
        // Check if this range overlaps with already processed ranges
        const overlaps = processedRanges.some(range => 
          (start < range.end && end > range.start)
        );
        
        if (!overlaps) {
          tokens.push({
            type: rule.type,
            value: match[0],
            start,
            end
          });
          
          processedRanges.push({start, end});
        }
      }
    }
    
    // Sort tokens by start position
    return tokens.sort((a, b) => a.start - b.start);
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
      result += `<span class="${className}">${this.escapeHtml(token.value)}</span>`;
      
      lastIndex = token.end;
    }
    
    // Add remaining unhighlighted text
    result += this.escapeHtml(code.substring(lastIndex));
    
    return result;
  }

  private getTokenClassName(tokenType: string): string {
    const classMap: Record<string, string> = {
      'comment': 'text-slate-500 italic',
      'string': 'text-green-400',
      'number': 'text-yellow-400',
      'keyword': 'text-blue-400 font-semibold',
      'react': 'text-cyan-400 font-semibold',
      'function': 'text-purple-400',
      'property': 'text-orange-400',
      'operator': 'text-pink-400',
      'bracket': 'text-slate-300'
    };
    
    return classMap[tokenType] || 'text-white';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
