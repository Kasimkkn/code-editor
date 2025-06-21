
import React from 'react';
import { X } from 'lucide-react';

interface Tab {
  name: string;
  active: boolean;
}

interface EditorTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex bg-slate-800/30 border-b border-blue-500/20 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.name}
          className={`flex items-center px-4 py-2 cursor-pointer transition-all duration-200 ${
            tab.active
              ? 'bg-slate-700/50 text-blue-300 border-b-2 border-blue-400 glow-border'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
          }`}
          onClick={() => onTabChange(tab.name)}
        >
          <span className="text-sm font-mono">{tab.name}</span>
          <button className="ml-2 p-1 hover:bg-slate-600/50 rounded transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      
      <div className="flex-1 bg-slate-800/20" />
    </div>
  );
};
