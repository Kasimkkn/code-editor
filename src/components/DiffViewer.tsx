
import React, { useState } from 'react';
import { GitBranch, ArrowLeft, ArrowRight } from 'lucide-react';

export const DiffViewer = () => {
  const [leftContent] = useState(`// Original Version
import React from 'react';

const App = () => {
  const handleClick = () => {
    console.log('clicked');
  };

  return (
    <div>
      <h1>Hello World</h1>
      <button onClick={handleClick}>
        Click me
      </button>
    </div>
  );
};`);

  const [rightContent] = useState(`// Modified Version
import React, { useState } from 'react';

const App = () => {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    setCount(prev => prev + 1);
    console.log('clicked:', count);
  };

  return (
    <div className="app">
      <h1>Hello Cosmic World</h1>
      <button onClick={handleClick}>
        Count: {count}
      </button>
    </div>
  );
};`);

  const leftLines = leftContent.split('\n');
  const rightLines = rightContent.split('\n');
  const maxLines = Math.max(leftLines.length, rightLines.length);

  // Simple LCS-based diff algorithm (simplified)
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

  return (
    <div className="h-full flex flex-col bg-slate-900/30 backdrop-blur-sm glow-border">
      {/* Diff Header */}
      <div className="p-3 border-b border-blue-500/20 bg-slate-800/50">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-blue-400">Diff Viewer</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">main.tsx</span>
          <div className="flex items-center space-x-2">
            <button className="p-1 hover:bg-slate-700/50 rounded">
              <ArrowLeft className="w-3 h-3 text-blue-400" />
            </button>
            <button className="p-1 hover:bg-slate-700/50 rounded">
              <ArrowRight className="w-3 h-3 text-blue-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex">
        {/* Left Panel (Original) */}
        <div className="flex-1 border-r border-blue-500/20">
          <div className="p-2 bg-slate-800/30 border-b border-blue-500/20">
            <span className="text-xs font-semibold text-red-400">- Original</span>
          </div>
          <div className="font-mono text-sm">
            {diffLines.map((line, index) => (
              <div 
                key={index}
                className={`flex ${
                  line.status === 'removed' ? 'bg-red-500/10 border-l-2 border-red-500' :
                  line.status === 'modified' ? 'bg-yellow-500/10 border-l-2 border-yellow-500' :
                  ''
                }`}
              >
                <div className="w-8 text-slate-500 text-right pr-2 py-1 bg-slate-800/30">
                  {line.leftLine ? line.lineNumber : ''}
                </div>
                <div className="flex-1 p-1 whitespace-pre">
                  {line.leftLine}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel (Modified) */}
        <div className="flex-1">
          <div className="p-2 bg-slate-800/30 border-b border-blue-500/20">
            <span className="text-xs font-semibold text-green-400">+ Modified</span>
          </div>
          <div className="font-mono text-sm">
            {diffLines.map((line, index) => (
              <div 
                key={index}
                className={`flex ${
                  line.status === 'added' ? 'bg-green-500/10 border-l-2 border-green-500' :
                  line.status === 'modified' ? 'bg-yellow-500/10 border-l-2 border-yellow-500' :
                  ''
                }`}
              >
                <div className="w-8 text-slate-500 text-right pr-2 py-1 bg-slate-800/30">
                  {line.rightLine ? line.lineNumber : ''}
                </div>
                <div className="flex-1 p-1 whitespace-pre">
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
