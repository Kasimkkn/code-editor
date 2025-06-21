

export const StatusBar = () => {
  return (
    <div className="h-6 bg-slate-900/70 relative backdrop-blur-sm border-t border-blue-500/20 flex items-center justify-between px-4 text-xs glow-border">

      {/* Right Section */}
      <div className="flex items-center space-x-4 absolute right-10">
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
