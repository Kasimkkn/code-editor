
import React from 'react';
import { GitBranch, CheckCircle, AlertCircle, Zap } from 'lucide-react';

export const StatusBar = () => {
  return (
    <div className="h-6 bg-slate-900/70 backdrop-blur-sm border-t border-blue-500/20 flex items-center justify-between px-4 text-xs glow-border">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <GitBranch className="w-3 h-3 text-blue-400" />
          <span className="text-slate-400">main</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <CheckCircle className="w-3 h-3 text-green-400" />
          <span className="text-slate-400">No errors</span>
        </div>

        <div className="flex items-center space-x-1">
          <Zap className="w-3 h-3 text-yellow-400" />
          <span className="text-slate-400">TypeScript</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        <span className="text-slate-400">Ln 15, Col 23</span>
        <span className="text-slate-400">UTF-8</span>
        <span className="text-slate-400">LF</span>
        
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400">Live</span>
        </div>
      </div>
    </div>
  );
};
