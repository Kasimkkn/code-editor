// Enhanced KMP Algorithm with preprocessing optimization and case handling
export class KMPMatcher {
  private pattern: string;
  private originalPattern: string;
  private lps: number[];
  private caseSensitive: boolean;

  constructor(pattern: string, caseSensitive: boolean = true) {
    this.originalPattern = pattern;
    this.caseSensitive = caseSensitive;
    this.pattern = caseSensitive ? pattern : pattern.toLowerCase();
    this.lps = this.computeLPS(this.pattern);
  }

  private computeLPS(pattern: string): number[] {
    if (pattern.length === 0) return [];

    const lps = new Array(pattern.length).fill(0);
    let len = 0;
    let i = 1;

    while (i < pattern.length) {
      if (pattern[i] === pattern[len]) {
        len++;
        lps[i] = len;
        i++;
      } else {
        if (len !== 0) {
          len = lps[len - 1];
        } else {
          lps[i] = 0;
          i++;
        }
      }
    }
    return lps;
  }

  findAll(text: string): number[] {
    if (!text || !this.pattern || this.pattern.length === 0) {
      return [];
    }

    const searchText = this.caseSensitive ? text : text.toLowerCase();
    const matches: number[] = [];
    let i = 0; // index for text
    let j = 0; // index for pattern

    while (i < searchText.length) {
      if (this.pattern[j] === searchText[i]) {
        j++;
        i++;
      }

      if (j === this.pattern.length) {
        matches.push(i - j);
        j = this.lps[j - 1];
      } else if (i < searchText.length && this.pattern[j] !== searchText[i]) {
        if (j !== 0) {
          j = this.lps[j - 1];
        } else {
          i++;
        }
      }
    }
    return matches;
  }

  // Find first occurrence only (more efficient for single match)
  findFirst(text: string): number {
    if (!text || !this.pattern || this.pattern.length === 0) {
      return -1;
    }

    const searchText = this.caseSensitive ? text : text.toLowerCase();
    let i = 0;
    let j = 0;

    while (i < searchText.length) {
      if (this.pattern[j] === searchText[i]) {
        j++;
        i++;
      }

      if (j === this.pattern.length) {
        return i - j;
      } else if (i < searchText.length && this.pattern[j] !== searchText[i]) {
        if (j !== 0) {
          j = this.lps[j - 1];
        } else {
          i++;
        }
      }
    }
    return -1;
  }

  // Get pattern info for debugging
  getPatternInfo(): { pattern: string; lps: number[]; length: number } {
    return {
      pattern: this.pattern,
      lps: [...this.lps],
      length: this.pattern.length
    };
  }

  // Update pattern without recreating instance
  updatePattern(newPattern: string): void {
    this.originalPattern = newPattern;
    this.pattern = this.caseSensitive ? newPattern : newPattern.toLowerCase();
    this.lps = this.computeLPS(this.pattern);
  }
}

// Enhanced Boyer-Moore Algorithm with good suffix rule and optimization
export class BoyerMooreMatcher {
  private pattern: string;
  private originalPattern: string;
  private badChar: Map<string, number>;
  private goodSuffix: number[];
  private caseSensitive: boolean;

  constructor(pattern: string, caseSensitive: boolean = true) {
    this.originalPattern = pattern;
    this.caseSensitive = caseSensitive;
    this.pattern = caseSensitive ? pattern : pattern.toLowerCase();
    this.badChar = this.buildBadCharTable(this.pattern);
    this.goodSuffix = this.buildGoodSuffixTable(this.pattern);
  }

  private buildBadCharTable(pattern: string): Map<string, number> {
    const table = new Map<string, number>();

    // Initialize all characters to -1
    for (let i = 0; i < pattern.length; i++) {
      table.set(pattern[i], i);
    }

    return table;
  }

  private buildGoodSuffixTable(pattern: string): number[] {
    const m = pattern.length;
    const suffix = new Array(m + 1).fill(0);
    const shift = new Array(m + 1).fill(0);

    // Initialize shift array
    for (let i = 0; i <= m; i++) {
      shift[i] = m;
    }

    // Compute suffix array
    let i = m;
    let j = m + 1;
    suffix[i] = j;

    while (i > 0) {
      while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
        if (shift[j] === m) {
          shift[j] = j - i;
        }
        j = suffix[j];
      }
      i--;
      j--;
      suffix[i] = j;
    }

    // Case 2: prefix of pattern is suffix of pattern
    j = suffix[0];
    for (i = 0; i <= m; i++) {
      if (shift[i] === m) {
        shift[i] = j;
      }
      if (i === j) {
        j = suffix[j];
      }
    }

    return shift;
  }

  findAll(text: string): number[] {
    if (!text || !this.pattern || this.pattern.length === 0) {
      return [];
    }

    const searchText = this.caseSensitive ? text : text.toLowerCase();
    const matches: number[] = [];
    const n = searchText.length;
    const m = this.pattern.length;
    let shift = 0;

    while (shift <= n - m) {
      let j = m - 1;

      // Match pattern from right to left
      while (j >= 0 && this.pattern[j] === searchText[shift + j]) {
        j--;
      }

      if (j < 0) {
        // Pattern found
        matches.push(shift);

        // Use good suffix rule for next shift
        shift += this.goodSuffix[0];
      } else {
        // Calculate shift using both bad character and good suffix rules
        const badCharShift = Math.max(1, j - (this.badChar.get(searchText[shift + j]) || -1));
        const goodSuffixShift = this.goodSuffix[j + 1];

        shift += Math.max(badCharShift, goodSuffixShift);
      }
    }

    return matches;
  }

  findFirst(text: string): number {
    if (!text || !this.pattern || this.pattern.length === 0) {
      return -1;
    }

    const searchText = this.caseSensitive ? text : text.toLowerCase();
    const n = searchText.length;
    const m = this.pattern.length;
    let shift = 0;

    while (shift <= n - m) {
      let j = m - 1;

      while (j >= 0 && this.pattern[j] === searchText[shift + j]) {
        j--;
      }

      if (j < 0) {
        return shift;
      } else {
        const badCharShift = Math.max(1, j - (this.badChar.get(searchText[shift + j]) || -1));
        const goodSuffixShift = this.goodSuffix[j + 1];
        shift += Math.max(badCharShift, goodSuffixShift);
      }
    }

    return -1;
  }

  updatePattern(newPattern: string): void {
    this.originalPattern = newPattern;
    this.pattern = this.caseSensitive ? newPattern : newPattern.toLowerCase();
    this.badChar = this.buildBadCharTable(this.pattern);
    this.goodSuffix = this.buildGoodSuffixTable(this.pattern);
  }

  getPatternInfo(): { pattern: string; badChar: Map<string, number>; length: number } {
    return {
      pattern: this.pattern,
      badChar: new Map(this.badChar),
      length: this.pattern.length
    };
  }
}

// Advanced Rabin-Karp Algorithm for multiple pattern matching
export class RabinKarpMatcher {
  private patterns: string[];
  private patternHashes: Map<number, string[]>;
  private readonly base = 256;
  private readonly prime = 101;
  private caseSensitive: boolean;

  constructor(patterns: string[], caseSensitive: boolean = true) {
    this.caseSensitive = caseSensitive;
    this.patterns = caseSensitive ? patterns : patterns.map(p => p.toLowerCase());
    this.patternHashes = this.computePatternHashes();
  }

  private computePatternHashes(): Map<number, string[]> {
    const hashes = new Map<number, string[]>();

    for (const pattern of this.patterns) {
      if (pattern.length === 0) continue;

      const hash = this.computeHash(pattern);

      if (!hashes.has(hash)) {
        hashes.set(hash, []);
      }
      hashes.get(hash)!.push(pattern);
    }

    return hashes;
  }

  private computeHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * this.base + str.charCodeAt(i)) % this.prime;
    }
    return hash;
  }

  private rollingHash(oldHash: number, oldChar: string, newChar: string, patternLength: number): number {
    // Remove old character
    const power = Math.pow(this.base, patternLength - 1) % this.prime;
    oldHash = (oldHash - (oldChar.charCodeAt(0) * power) % this.prime + this.prime) % this.prime;

    // Add new character
    oldHash = (oldHash * this.base + newChar.charCodeAt(0)) % this.prime;

    return oldHash;
  }

  findAllPatterns(text: string): Array<{ pattern: string; positions: number[] }> {
    if (!text || this.patterns.length === 0) {
      return [];
    }

    const searchText = this.caseSensitive ? text : text.toLowerCase();
    const results: Array<{ pattern: string; positions: number[] }> = [];

    // Group patterns by length for efficient processing
    const patternsByLength = new Map<number, string[]>();

    for (const pattern of this.patterns) {
      if (pattern.length === 0) continue;

      if (!patternsByLength.has(pattern.length)) {
        patternsByLength.set(pattern.length, []);
      }
      patternsByLength.get(pattern.length)!.push(pattern);
    }

    // Search for each length group
    for (const [length, patterns] of patternsByLength) {
      if (length > searchText.length) continue;

      const patternResults = this.searchPatternsOfLength(searchText, patterns, length);
      results.push(...patternResults);
    }

    return results;
  }

  private searchPatternsOfLength(text: string, patterns: string[], length: number): Array<{ pattern: string; positions: number[] }> {
    const results: Array<{ pattern: string; positions: number[] }> = [];
    const patternMap = new Map<string, number[]>();

    // Initialize result map
    for (const pattern of patterns) {
      patternMap.set(pattern, []);
    }

    if (text.length < length) return results;

    // Compute hash for first window
    let textHash = this.computeHash(text.substring(0, length));

    // Check first window
    this.checkHashMatch(text, 0, length, textHash, patterns, patternMap);

    // Roll the hash for remaining windows
    for (let i = length; i < text.length; i++) {
      textHash = this.rollingHash(
        textHash,
        text[i - length],
        text[i],
        length
      );

      this.checkHashMatch(text, i - length + 1, length, textHash, patterns, patternMap);
    }

    // Convert map to results
    for (const [pattern, positions] of patternMap) {
      if (positions.length > 0) {
        results.push({ pattern, positions });
      }
    }

    return results;
  }

  private checkHashMatch(
    text: string,
    position: number,
    length: number,
    hash: number,
    patterns: string[],
    resultMap: Map<string, number[]>
  ): void {
    const candidates = this.patternHashes.get(hash);
    if (!candidates) return;

    const substring = text.substring(position, position + length);

    for (const pattern of patterns) {
      if (candidates.includes(pattern) && pattern === substring) {
        resultMap.get(pattern)!.push(position);
      }
    }
  }

  addPattern(pattern: string): void {
    const processedPattern = this.caseSensitive ? pattern : pattern.toLowerCase();
    if (!this.patterns.includes(processedPattern)) {
      this.patterns.push(processedPattern);
      this.patternHashes = this.computePatternHashes();
    }
  }

  removePattern(pattern: string): boolean {
    const processedPattern = this.caseSensitive ? pattern : pattern.toLowerCase();
    const index = this.patterns.indexOf(processedPattern);

    if (index !== -1) {
      this.patterns.splice(index, 1);
      this.patternHashes = this.computePatternHashes();
      return true;
    }

    return false;
  }
}

// Suffix Array for advanced text processing
export class SuffixArray {
  private text: string;
  private suffixArray: number[];
  private lcpArray: number[];

  constructor(text: string) {
    this.text = text + `'`; // Add sentinel
    this.suffixArray = this.buildSuffixArray();
    this.lcpArray = this.buildLCPArray();
  }

  private buildSuffixArray(): number[] {
    const n = this.text.length;
    const suffixes: Array<{ index: number; rank: number[]; originalIndex: number }> = [];

    // Create initial suffixes with first character ranks
    for (let i = 0; i < n; i++) {
      suffixes.push({
        index: i,
        rank: [this.text.charCodeAt(i), i + 1 < n ? this.text.charCodeAt(i + 1) : -1],
        originalIndex: i
      });
    }

    // Sort by rank
    suffixes.sort((a, b) => {
      if (a.rank[0] !== b.rank[0]) return a.rank[0] - b.rank[0];
      return a.rank[1] - b.rank[1];
    });

    // Build suffix array using prefix doubling
    const indices = new Array(n);
    for (let k = 4; k < 2 * n; k *= 2) {
      let rank = 0;
      let prevRank = suffixes[0].rank[0];
      suffixes[0].rank[0] = rank;
      indices[suffixes[0].index] = 0;

      for (let i = 1; i < n; i++) {
        if (suffixes[i].rank[0] === prevRank && suffixes[i].rank[1] === suffixes[i - 1].rank[1]) {
          prevRank = suffixes[i].rank[0];
          suffixes[i].rank[0] = rank;
        } else {
          prevRank = suffixes[i].rank[0];
          suffixes[i].rank[0] = ++rank;
        }
        indices[suffixes[i].index] = i;
      }

      for (let i = 0; i < n; i++) {
        const nextIndex = suffixes[i].index + k / 2;
        suffixes[i].rank[1] = nextIndex < n ? suffixes[indices[nextIndex]].rank[0] : -1;
      }

      suffixes.sort((a, b) => {
        if (a.rank[0] !== b.rank[0]) return a.rank[0] - b.rank[0];
        return a.rank[1] - b.rank[1];
      });
    }

    return suffixes.map(suffix => suffix.index);
  }

  private buildLCPArray(): number[] {
    const n = this.text.length;
    const lcp = new Array(n).fill(0);
    const invSuffix = new Array(n);

    // Create inverse suffix array
    for (let i = 0; i < n; i++) {
      invSuffix[this.suffixArray[i]] = i;
    }

    let k = 0;
    for (let i = 0; i < n; i++) {
      if (invSuffix[i] === n - 1) {
        k = 0;
        continue;
      }

      const j = this.suffixArray[invSuffix[i] + 1];

      while (i + k < n && j + k < n && this.text[i + k] === this.text[j + k]) {
        k++;
      }

      lcp[invSuffix[i]] = k;

      if (k > 0) k--;
    }

    return lcp;
  }

  // Binary search for pattern
  search(pattern: string): number[] {
    const results: number[] = [];
    const patternLen = pattern.length;

    // Find left boundary
    let left = 0;
    let right = this.suffixArray.length - 1;
    let leftBound = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const suffix = this.text.substring(this.suffixArray[mid], this.suffixArray[mid] + patternLen);

      if (suffix >= pattern) {
        if (suffix === pattern) leftBound = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    if (leftBound === -1) return results;

    // Find right boundary
    left = 0;
    right = this.suffixArray.length - 1;
    let rightBound = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const suffix = this.text.substring(this.suffixArray[mid], this.suffixArray[mid] + patternLen);

      if (suffix <= pattern) {
        if (suffix === pattern) rightBound = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // Collect all matches
    for (let i = leftBound; i <= rightBound; i++) {
      results.push(this.suffixArray[i]);
    }

    return results.sort((a, b) => a - b);
  }

  // Find longest repeated substring
  findLongestRepeatedSubstring(): { substring: string; positions: number[] } {
    let maxLen = 0;
    let maxIndex = -1;

    for (let i = 0; i < this.lcpArray.length - 1; i++) {
      if (this.lcpArray[i] > maxLen) {
        maxLen = this.lcpArray[i];
        maxIndex = i;
      }
    }

    if (maxIndex === -1 || maxLen === 0) {
      return { substring: '', positions: [] };
    }

    const substring = this.text.substring(this.suffixArray[maxIndex], this.suffixArray[maxIndex] + maxLen);
    const positions: number[] = [];

    // Find all occurrences
    for (let i = maxIndex; i < this.suffixArray.length && this.lcpArray[i] >= maxLen; i++) {
      positions.push(this.suffixArray[i]);
    }

    return { substring, positions: positions.sort((a, b) => a - b) };
  }

  getSuffixArray(): number[] {
    return [...this.suffixArray];
  }

  getLCPArray(): number[] {
    return [...this.lcpArray];
  }
}

// Aho-Corasick Algorithm for multiple pattern matching
export class AhoCorasickMatcher {
  private root: AhoCorasickNode;
  private patterns: string[];

  constructor(patterns: string[]) {
    this.patterns = patterns.filter(p => p.length > 0);
    this.root = new AhoCorasickNode();
    this.buildTrie();
    this.buildFailureLinks();
  }

  private buildTrie(): void {
    for (let i = 0; i < this.patterns.length; i++) {
      const pattern = this.patterns[i];
      let current = this.root;

      for (const char of pattern) {
        if (!current.children.has(char)) {
          current.children.set(char, new AhoCorasickNode());
        }
        current = current.children.get(char)!;
      }

      current.isEndOfWord = true;
      current.patternIndex = i;
    }
  }

  private buildFailureLinks(): void {
    const queue: AhoCorasickNode[] = [];

    // Initialize failure links for first level
    for (const child of this.root.children.values()) {
      child.failure = this.root;
      queue.push(child);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const [char, child] of current.children) {
        queue.push(child);

        let failure = current.failure;
        while (failure !== null && !failure.children.has(char)) {
          failure = failure.failure;
        }

        child.failure = failure?.children.get(char) || this.root;

        // Copy output links
        child.output = [...child.failure.output];
        if (child.isEndOfWord) {
          child.output.push(child.patternIndex!);
        }
      }
    }
  }

  findAllMatches(text: string): Array<{ pattern: string; position: number; patternIndex: number }> {
    const results: Array<{ pattern: string; position: number; patternIndex: number }> = [];
    let current = this.root;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Follow failure links until we find a transition or reach root
      while (current !== this.root && !current.children.has(char)) {
        current = current.failure!;
      }

      if (current.children.has(char)) {
        current = current.children.get(char)!;
      }

      // Check for pattern matches
      for (const patternIndex of current.output) {
        const pattern = this.patterns[patternIndex];
        const position = i - pattern.length + 1;
        results.push({ pattern, position, patternIndex });
      }
    }

    return results;
  }

  addPattern(pattern: string): void {
    if (pattern.length === 0 || this.patterns.includes(pattern)) return;

    this.patterns.push(pattern);
    // Rebuild the automaton
    this.root = new AhoCorasickNode();
    this.buildTrie();
    this.buildFailureLinks();
  }

  getPatterns(): string[] {
    return [...this.patterns];
  }
}

class AhoCorasickNode {
  children: Map<string, AhoCorasickNode> = new Map();
  failure: AhoCorasickNode | null = null;
  output: number[] = [];
  isEndOfWord: boolean = false;
  patternIndex?: number;
}