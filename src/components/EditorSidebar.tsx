
import React, { useState } from 'react';
import { FileText, Search, GitBranch, Settings, ChevronRight, ChevronDown } from 'lucide-react';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['src']);

  const fileTree = [
    {
      name: 'src',
      type: 'folder',
      children: [
        { name: 'components', type: 'folder', children: [
          { name: 'CosmicEditor.tsx', type: 'file' },
          { name: 'CodePanel.tsx', type: 'file' }
        ]},
        { name: 'utils', type: 'folder', children: [
          { name: 'algorithms.ts', type: 'file' },
          { name: 'syntax.ts', type: 'file' }
        ]},
        { name: 'main.tsx', type: 'file' },
        { name: 'App.tsx', type: 'file' }
      ]
    },
    { name: 'package.json', type: 'file' },
    { name: 'README.md', type: 'file' }
  ];

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderName) 
        ? prev.filter(name => name !== folderName)
        : [...prev, folderName]
    );
  };

  const renderFileTree = (items: any[], depth = 0) => {
    return items.map((item) => (
      <div key={item.name} style={{ paddingLeft: `${depth * 12}px` }}>
        <div 
          className="flex items-center py-1 px-2 hover:bg-slate-700/30 cursor-pointer transition-colors group"
          onClick={() => item.type === 'folder' && toggleFolder(item.name)}
        >
          {item.type === 'folder' && (
            expandedFolders.includes(item.name) 
              ? <ChevronDown className="w-3 h-3 text-blue-400 mr-1" />
              : <ChevronRight className="w-3 h-3 text-blue-400 mr-1" />
          )}
          <FileText className="w-4 h-4 text-slate-400 mr-2" />
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
            {item.name}
          </span>
        </div>
        
        {item.children && expandedFolders.includes(item.name) && (
          <div>
            {renderFileTree(item.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (collapsed) {
    return (
      <div className="w-12 bg-slate-900/50 border-r border-blue-500/20 glow-border">
        <div className="p-2 space-y-2">
          <button 
            onClick={() => setCollapsed(false)}
            className="w-full p-2 rounded hover:bg-slate-700/50 transition-colors"
          >
            <FileText className="w-5 h-5 text-blue-400 mx-auto" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-slate-900/50 border-r border-blue-500/20 glow-border">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-blue-500/20">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-blue-400">Explorer</h2>
          <button 
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-slate-700/50 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="p-2">
        {renderFileTree(fileTree)}
      </div>

      {/* Sidebar Navigation */}
      <div className="absolute bottom-4 left-2 right-2 space-y-2">
        <button className="w-full p-2 flex items-center space-x-2 hover:bg-slate-700/50 rounded transition-colors">
          <Search className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">Search</span>
        </button>
        <button className="w-full p-2 flex items-center space-x-2 hover:bg-slate-700/50 rounded transition-colors">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">Source Control</span>
        </button>
      </div>
    </div>
  );
};
