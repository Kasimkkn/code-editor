
# 🚀 Cosmic Code Editor

A next-generation **AI-powered code editing platform** built with **ReactJS** and enhanced with **advanced Data Structures & Algorithms** to provide intelligent features for professional developers.

## 🌐 Live Preview

**URL**: https://lovable.dev/projects/7f79dc64-089f-41be-b792-fefd248af9ed

## 🧠 Advanced DSA-Powered Features

### 📂 String & Array-Based Algorithms Implementation

| Feature | Algorithm | Time Complexity | Purpose |
|---------|-----------|----------------|---------|
| 🔍 **Smart Find & Replace** | KMP (Knuth-Morris-Pratt) | O(n + m) | Linear time pattern matching with prefix function |
| 🔍 **Alternative Search** | Boyer-Moore | O(n/m) best case | Skip-ahead pattern matching for large texts |
| 🔤 **Auto-completion** | Trie (Prefix Tree) | O(k) lookup | Fast prefix-based word suggestions with frequency ranking |
| 🔄 **Undo/Redo System** | Command Pattern + Array Stack | O(1) operations | Efficient history management with command objects |
| 🔣 **Bracket Matching** | Stack Data Structure | O(n) single pass | Real-time validation of nested brackets/braces |
| 🎨 **Syntax Highlighting** | Regex Tokenizer + FSM | O(n) | Token-based parsing with finite state machine |
| 🎯 **Multiple Cursors** | Two-Pointer Technique | O(log n) insertion | Sorted cursor management for multi-selection |
| 🪟 **Visible Text Rendering** | Sliding Window | O(viewport) | Memory-efficient rendering for large files |
| 📏 **Code Formatting** | Recursive Descent Parser | O(n) | AST-based pretty printing with indentation rules |
| 🧬 **Diff Viewer** | LCS (Longest Common Subsequence) | O(m×n) | Dynamic programming for file comparison |

## 🔎 Detailed Features Breakdown

### 🔤 Auto-Completion (Trie Data Structure)
- **Implementation**: Custom Trie with frequency tracking and localStorage persistence
- **Features**: 
  - Prefix-based suggestions in O(k) time where k = prefix length
  - Frequency-based ranking for most-used completions
  - Persistent learning from user's coding patterns
  - Support for 1000+ programming keywords and user-defined variables
- **Storage**: JSON serialization to localStorage for session persistence

### 🔍 Smart Find & Replace (String Matching Algorithms)

#### KMP Algorithm (Knuth-Morris-Pratt)
- **Time Complexity**: O(n + m) where n = text length, m = pattern length
- **Space Complexity**: O(m) for prefix function table
- **Use Case**: Efficient for multiple searches of the same pattern
- **Features**: 
  - Prefix function preprocessing for pattern analysis
  - No backtracking in text scanning
  - Optimal for repeated pattern searches

#### Boyer-Moore Algorithm
- **Time Complexity**: O(n/m) best case, O(nm) worst case
- **Space Complexity**: O(σ) where σ = alphabet size
- **Use Case**: Superior for large text searches with sparse patterns
- **Features**:
  - Bad character heuristic for skip-ahead optimization
  - Right-to-left pattern scanning
  - Excellent performance on natural language text

### 🎯 Bracket Matching (Stack Algorithm)
- **Implementation**: Stack-based parser with nested structure tracking
- **Features**:
  - Real-time validation during typing
  - Visual highlighting of matched/unmatched brackets
  - Support for (), [], {} with proper nesting validation
  - Error detection with red glow for mismatched brackets
  - Animated highlights for bracket pairs on hover

### ⏮️ Undo/Redo System (Command Pattern + Array)
- **Architecture**: Command pattern with array-based history stack
- **Features**:
  - Each edit operation encapsulated as a command object
  - Bi-directional operations: `execute()` and `undo()`
  - Configurable history limit (default: 100 operations)
  - Persistent history across sessions via localStorage
  - Support for complex operations (multi-cursor edits, find-replace)

### 🎨 Advanced Syntax Highlighting (Tokenizer + Regex)
- **Implementation**: Multi-pass tokenizer with regex-based pattern matching
- **Supported Tokens**:
  - Keywords (if, else, function, class, etc.)
  - Strings (single, double, template literals)
  - Numbers (integers, floats, hex, binary)
  - Comments (single-line //, multi-line /* */)
  - Operators (+, -, *, /, =, ==, etc.)
  - React/JSX specific tokens
- **Features**:
  - Hierarchical token processing to avoid conflicts
  - Extensible grammar system for multiple languages
  - Real-time highlighting with glow effects
  - Proper escaping for security

### 🎯 Multiple Cursors (Two-Pointer Technique)
- **Implementation**: Sorted array of cursor positions with binary search insertion
- **Features**:
  - Efficient cursor management with O(log n) insertion
  - Visual glow effects for each cursor
  - Synchronized editing across all cursor positions
  - Keyboard shortcuts (Ctrl+D to add cursor)
  - Automatic cursor position updates after text modifications

### 🧬 Diff Viewer (LCS Dynamic Programming)
- **Algorithm**: Longest Common Subsequence with backtracking
- **Time Complexity**: O(m × n) where m, n are line counts
- **Features**:
  - Side-by-side file comparison
  - Line-by-line diff highlighting
  - Addition/deletion/modification detection
  - Animated transitions for diff visualization
  - Export diff in unified format

## 🗂️ Data Persistence Strategy

### localStorage JSON Schema
```json
{
  "cosmic-editor-trie": {
    "root": {
      "children": { "a": { "children": {...}, "isEndOfWord": false, "frequency": 0 } },
      "isEndOfWord": boolean,
      "frequency": number
    }
  },
  "cosmic-editor-history": {
    "currentIndex": number,
    "historyCount": number
  },
  "cosmic-editor-code": "string", // Current code content
  "cosmic-editor-settings": {
    "theme": "cosmic-dark",
    "fontSize": 14,
    "tabSize": 2,
    "wordWrap": true
  }
}
```

## 🚀 Performance Optimizations

### Memory Management
- **Trie Compression**: Suffix links for memory efficiency
- **Viewport Rendering**: Only render visible code lines
- **Command Pooling**: Reuse command objects to reduce GC pressure
- **Debounced Operations**: Syntax highlighting and auto-complete with 150ms debounce

### Algorithmic Optimizations
- **Boyer-Moore**: Preferred for large file searches (>10KB)
- **KMP**: Optimal for repeated pattern searches
- **Incremental Parsing**: Only re-parse modified code sections
- **Lazy Evaluation**: Delay expensive operations until needed

## 🎨 Cosmic UI Features

### Visual Design
- **Dark Mode**: Deep space theme with cosmic gradients
- **Glow Effects**: All UI elements have subtle blue/purple glow
- **Motion Blur**: Smooth transitions and animations
- **Particle System**: Subtle nebula background with mouse interaction
- **Responsive Design**: Pixel-perfect on all device sizes

### Accessibility
- **Keyboard Navigation**: Full keyboard support for all features
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **High Contrast**: Cosmic theme with excellent contrast ratios
- **Font Scaling**: Support for browser zoom up to 200%

## 🛠️ Technologies Used

### Core Stack
- **React 18**: Component-based architecture with hooks
- **TypeScript**: Type-safe development with strict mode
- **Vite**: Lightning-fast build tool and dev server
- **Tailwind CSS**: Utility-first styling with custom extensions

### UI Components
- **shadcn/ui**: Accessible component library
- **Lucide React**: Beautiful SVG icons
- **Radix UI**: Headless UI primitives

### State Management
- **React Query**: Server state management and caching
- **Local Storage**: Client-side persistence for user data
- **Custom Hooks**: Reusable stateful logic

## 📈 Future Enhancements

### Advanced Algorithms
- **Suffix Trees**: For ultra-fast substring search
- **Rope Data Structure**: Efficient text editing for large files
- **B-Trees**: File system integration for project management
- **Conflict-free Replicated Data Types (CRDTs)**: Real-time collaboration

### Language Support
- **Language Server Protocol (LSP)**: Integration with language servers
- **Tree-sitter**: Incremental parsing for syntax highlighting
- **WebAssembly**: High-performance algorithms in Rust/C++

### AI Integration
- **Code Completion**: AI-powered intelligent suggestions
- **Bug Detection**: Static analysis with machine learning
- **Code Review**: Automated code quality assessment
- **Refactoring**: AI-assisted code transformation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ with npm
- Modern browser with ES2022 support

### Installation
```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd cosmic-code-editor

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 📚 API Documentation

### Core Classes

#### `Trie`
```typescript
class Trie {
  insert(word: string): void
  searchPrefix(prefix: string): string[]
  saveToStorage(): void
  loadFromStorage(): void
}
```

#### `KMPMatcher`
```typescript
class KMPMatcher {
  constructor(pattern: string)
  findAll(text: string): number[]
  private computeLPS(pattern: string): number[]
}
```

#### `EditorHistory`
```typescript
class EditorHistory {
  executeCommand(command: EditorCommand): void
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-algorithm`
3. Implement your algorithm with proper tests
4. Add documentation and examples
5. Submit pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Donald Knuth**: KMP algorithm inspiration
- **Robert Boyer & J Moore**: Boyer-Moore string search
- **Aho, Hopcroft & Ullman**: Algorithms textbook reference
- **React Team**: Amazing framework for building UIs
- **Tailwind CSS**: Beautiful utility-first CSS framework

---

**Built with ❤️ by the Cosmic Code Team**

*Transforming code editing with the power of algorithms*
