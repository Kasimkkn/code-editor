
import React, { useState, useEffect } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react';
import { KMPMatcher, BoyerMooreMatcher } from '@/utils/stringAlgorithms';

interface FindReplaceProps {
  onClose: () => void;
  code: string;
  onHighlight: (matches: number[]) => void;
  onReplace: (newCode: string) => void;
}

export const FindReplace: React.FC<FindReplaceProps> = ({ 
  onClose, 
  code, 
  onHighlight, 
  onReplace 
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [algorithm, setAlgorithm] = useState<'kmp' | 'boyer-moore'>('kmp');
  const [matches, setMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);

  useEffect(() => {
    if (findText.length > 0) {
      findMatches();
    } else {
      setMatches([]);
      onHighlight([]);
    }
  }, [findText, code, caseSensitive, wholeWord, algorithm]);

  const findMatches = () => {
    let searchText = caseSensitive ? code : code.toLowerCase();
    let pattern = caseSensitive ? findText : findText.toLowerCase();
    
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    let foundMatches: number[] = [];

    if (useRegex) {
      try {
        const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
        let match;
        while ((match = regex.exec(searchText)) !== null) {
          foundMatches.push(match.index);
          if (regex.lastIndex === match.index) {
            regex.lastIndex++;
          }
        }
      } catch (error) {
        console.error('Invalid regex pattern:', error);
        return;
      }
    } else {
      // Use DSA algorithms for pattern matching
      if (algorithm === 'kmp') {
        const kmpMatcher = new KMPMatcher(pattern);
        foundMatches = kmpMatcher.findAll(searchText);
      } else {
        const boyerMooreMatcher = new BoyerMooreMatcher(pattern);
        foundMatches = boyerMooreMatcher.findAll(searchText);
      }
    }

    setMatches(foundMatches);
    setCurrentMatch(0);
    onHighlight(foundMatches);
  };

  const handleReplace = () => {
    if (matches.length === 0 || currentMatch >= matches.length) return;
    
    const matchIndex = matches[currentMatch];
    const newCode = code.substring(0, matchIndex) + 
                   replaceText + 
                   code.substring(matchIndex + findText.length);
    
    onReplace(newCode);
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;
    
    let newCode = code;
    const lengthDiff = replaceText.length - findText.length;
    
    // Replace from end to start to maintain indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const matchIndex = matches[i];
      newCode = newCode.substring(0, matchIndex) + 
               replaceText + 
               newCode.substring(matchIndex + findText.length);
    }
    
    onReplace(newCode);
  };

  const navigateMatch = (direction: 'next' | 'prev') => {
    if (matches.length === 0) return;
    
    if (direction === 'next') {
      setCurrentMatch((prev) => (prev + 1) % matches.length);
    } else {
      setCurrentMatch((prev) => (prev - 1 + matches.length) % matches.length);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border-b border-blue-500/20 p-4 glow-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-semibold text-blue-400">🔍 Smart Find & Replace</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Algorithm:</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as 'kmp' | 'boyer-moore')}
              className="text-xs bg-slate-700 text-white border border-blue-500/30 rounded px-2 py-1"
            >
              <option value="kmp">KMP O(n+m)</option>
              <option value="boyer-moore">Boyer-Moore O(n/m)</option>
            </select>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Find Section */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Find pattern..."
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="w-full pl-10 pr-20 py-2 bg-slate-900/50 border border-blue-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 glow-border transition-colors"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <span className="text-xs text-slate-400">
                {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : '0/0'}
              </span>
              <button 
                onClick={() => navigateMatch('prev')}
                className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
                disabled={matches.length === 0}
              >
                <ChevronUp className="w-3 h-3 text-blue-400" />
              </button>
              <button 
                onClick={() => navigateMatch('next')}
                className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
                disabled={matches.length === 0}
              >
                <ChevronDown className="w-3 h-3 text-blue-400" />
              </button>
            </div>
          </div>

          <div className="flex space-x-2 text-xs">
            <label className="flex items-center space-x-1 text-slate-400">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded"
              />
              <span>Aa</span>
            </label>
            <label className="flex items-center space-x-1 text-slate-400">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="rounded"
              />
              <span>Ab</span>
            </label>
            <label className="flex items-center space-x-1 text-slate-400">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="rounded"
              />
              <span>.*</span>
            </label>
          </div>
        </div>

        {/* Replace Section */}
        <div className="space-y-2">
          <div className="relative">
            <Replace className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 glow-border transition-colors"
            />
          </div>

          <div className="flex space-x-2">
            <button 
              onClick={handleReplace}
              disabled={matches.length === 0}
              className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs glow-border transition-colors disabled:opacity-50"
            >
              Replace
            </button>
            <button 
              onClick={handleReplaceAll}
              disabled={matches.length === 0}
              className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs glow-border transition-colors disabled:opacity-50"
            >
              Replace All ({matches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Algorithm Info */}
      <div className="mt-3 text-xs text-slate-400">
        <span className="font-semibold">Current Algorithm:</span> {algorithm === 'kmp' ? 'KMP' : 'Boyer-Moore'} - 
        {algorithm === 'kmp' ? ' Linear time O(n+m) pattern matching' : ' Skip-ahead pattern matching O(n/m) best case'}
      </div>
    </div>
  );
};
