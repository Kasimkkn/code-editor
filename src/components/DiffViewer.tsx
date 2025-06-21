
import React, { useState } from 'react';
import { GitBranch, ArrowLeft, ArrowRight } from 'lucide-react';

interface CodeVersion {
  content: string;
  timestamp: number;
  id: string;
}

interface DiffViewerProps {
  codeVersions: CodeVersion[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ codeVersions }) => {
  const [currentVersionIndex, setCurrentVersionIndex] = useState(Math.max(0, codeVersions.length - 2));
  const [compareVersionIndex, setCompareVersionIndex] = useState(codeVersions.length - 1);

  const currentVersion = codeVersions[currentVersionIndex];
  const compareVersion = codeVersions[compareVersionIndex];

  const leftContent = currentVersion?.content || '// No previous version available';
  const rightContent = compareVersion?.content || '// No version available';

  const leftLines = leftContent.split('\n');
  const rightLines = rightContent.split('\n');
  const maxLines = Math.max(leftLines.length, rightLines.length);

  // Simple LCS-based diff algorithm
  const getDiffLines = () => {
    const result = [];
    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';
      
      let status = 'unchanged';
      if (!leftLine && rightLine) status = 'added';
      else if (leftLine && !rightLine) status = 'removed';
      else if (leftLine !== rightLine) status = 'modified';
      
      result.push({ leftLine, rightLine, status, lineNumber: i + 1 });
    }
    return result;
  };

  const diffLines = getDiffLines();

  const navigateVersion = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentVersionIndex > 0) {
      setCurrentVersionIndex(prev => prev - 1);
      setCompareVersionIndex(prev => Math.max(0, prev - 1));
    } else if (direction === 'next' && currentVersionIndex < codeVersions.length - 2) {
      setCurrentVersionIndex(prev => prev + 1);
      setCompareVersionIndex(prev => Math.min(codeVersions.length - 1, prev + 1));
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/30 backdrop-blur-sm glow-border">
      {/* Diff Header */}
      <div className="p-3 border-b border-blue-500/20 bg-slate-800/50">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-blue-400">Diff Viewer</span>
          <span className="text-xs text-slate-400">
            ({codeVersions.length} versions)
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>
              {currentVersion ? formatTimestamp(currentVersion.timestamp) : 'N/A'} 
              ↔ 
              {compareVersion ? formatTimestamp(compareVersion.timestamp) : 'N/A'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => navigateVersion('prev')}
              disabled={currentVersionIndex <= 0}
              className="p-1 hover:bg-slate-700/50 rounded disabled:opacity-50"
            >
              <ArrowLeft className="w-3 h-3 text-blue-400" />
            </button>
            <button 
              onClick={() => navigateVersion('next')}
              disabled={currentVersionIndex >= codeVersions.length - 2}
              className="p-1 hover:bg-slate-700/50 rounded disabled:opacity-50"
            >
              <ArrowRight className="w-3 h-3 text-blue-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex">
        {/* Left Panel (Previous) */}
        <div className="flex-1 border-r border-blue-500/20">
          <div className="p-2 bg-slate-800/30 border-b border-blue-500/20">
            <span className="text-xs font-semibold text-red-400">- Previous</span>
          </div>
          <div className="font-mono text-sm overflow-auto h-full">
            {diffLines.map((line, index) => (
              <div 
                key={index}
                className={`flex ${
                  line.status === 'removed' ? 'bg-red-500/10 border-l-2 border-red-500' :
                  line.status === 'modified' ? 'bg-yellow-500/10 border-l-2 border-yellow-500' :
                  ''
                }`}
              >
                <div className="w-8 text-slate-500 text-right pr-2 py-1 bg-slate-800/30 flex-shrink-0">
                  {line.leftLine ? line.lineNumber : ''}
                </div>
                <div className="flex-1 p-1 whitespace-pre-wrap break-all">
                  {line.leftLine}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel (Current) */}
        <div className="flex-1">
          <div className="p-2 bg-slate-800/30 border-b border-blue-500/20">
            <span className="text-xs font-semibold text-green-400">+ Current</span>
          </div>
          <div className="font-mono text-sm overflow-auto h-full">
            {diffLines.map((line, index) => (
              <div 
                key={index}
                className={`flex ${
                  line.status === 'added' ? 'bg-green-500/10 border-l-2 border-green-500' :
                  line.status === 'modified' ? 'bg-yellow-500/10 border-l-2 border-yellow-500' :
                  ''
                }`}
              >
                <div className="w-8 text-slate-500 text-right pr-2 py-1 bg-slate-800/30 flex-shrink-0">
                  {line.rightLine ? line.lineNumber : ''}
                </div>
                <div className="flex-1 p-1 whitespace-pre-wrap break-all">
                  {line.rightLine}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
