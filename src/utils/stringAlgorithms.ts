
// KMP Algorithm for pattern matching
export class KMPMatcher {
  private pattern: string;
  private lps: number[];

  constructor(pattern: string) {
    this.pattern = pattern;
    this.lps = this.computeLPS(pattern);
  }

  private computeLPS(pattern: string): number[] {
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
    const matches: number[] = [];
    let i = 0; // index for text
    let j = 0; // index for pattern

    while (i < text.length) {
      if (this.pattern[j] === text[i]) {
        j++;
        i++;
      }

      if (j === this.pattern.length) {
        matches.push(i - j);
        j = this.lps[j - 1];
      } else if (i < text.length && this.pattern[j] !== text[i]) {
        if (j !== 0) {
          j = this.lps[j - 1];
        } else {
          i++;
        }
      }
    }
    return matches;
  }
}

// Boyer-Moore Algorithm for efficient pattern matching
export class BoyerMooreMatcher {
  private pattern: string;
  private badChar: Map<string, number>;

  constructor(pattern: string) {
    this.pattern = pattern;
    this.badChar = this.buildBadCharTable(pattern);
  }

  private buildBadCharTable(pattern: string): Map<string, number> {
    const table = new Map<string, number>();
    for (let i = 0; i < pattern.length; i++) {
      table.set(pattern[i], i);
    }
    return table;
  }

  findAll(text: string): number[] {
    const matches: number[] = [];
    let shift = 0;

    while (shift <= text.length - this.pattern.length) {
      let j = this.pattern.length - 1;

      while (j >= 0 && this.pattern[j] === text[shift + j]) {
        j--;
      }

      if (j < 0) {
        matches.push(shift);
        shift += shift + this.pattern.length < text.length 
          ? this.pattern.length - (this.badChar.get(text[shift + this.pattern.length]) || -1)
          : 1;
      } else {
        shift += Math.max(1, j - (this.badChar.get(text[shift + j]) || -1));
      }
    }
    return matches;
  }
}
