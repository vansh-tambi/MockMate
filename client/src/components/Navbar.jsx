import React from 'react';

const Navbar = ({ setActiveMode, activeMode, onNewSession, isGenerating }) => {
  const tabs = [
    { id: 'guided', label: 'Practice Mode', icon: 'auto_stories' },
    { id: 'test', label: 'Interview Mode', icon: 'mic' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        
        {/* Logo */}
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 transition hover:opacity-80 disabled:opacity-50"
          disabled={isGenerating}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">M</div>
          <span className="font-bold tracking-tight text-foreground text-xl hidden sm:block">MockMate</span>
        </button>

        {/* Tab Switcher */}
        <div className="flex bg-card border border-border p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (isGenerating) return;
                setActiveMode(tab.id);
              }}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeMode === tab.id 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'text-muted hover:text-foreground hover:bg-card-hover'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right side placeholder or settings */}
        <div className="flex items-center gap-4">
          <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-foreground hover:bg-card transition">
            <span className="material-symbols-outlined text-[18px]">account_circle</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;