
import React, { useState } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FindReplaceProps {
  onClose: () => void;
}

export const FindReplace: React.FC<FindReplaceProps> = ({ onClose }) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border-b border-blue-500/20 p-4 glow-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-400">Find & Replace</h3>
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
              placeholder="Find"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="w-full pl-10 pr-20 py-2 bg-slate-900/50 border border-blue-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 glow-border transition-colors"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <span className="text-xs text-slate-400">{currentMatch}/{totalMatches}</span>
              <button className="p-1 hover:bg-slate-700 rounded">
                <ChevronUp className="w-3 h-3 text-blue-400" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
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
              placeholder="Replace"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 glow-border transition-colors"
            />
          </div>

          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs glow-border transition-colors">
              Replace
            </button>
            <button className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs glow-border transition-colors">
              Replace All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
