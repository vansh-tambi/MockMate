import React from 'react';
import { Sparkles, Mic, User } from 'lucide-react';

const Navbar = ({ setActiveMode, activeMode, onNewSession, isGenerating }) => {
  const tabs = [
    { id: 'guided', label: 'Practice Mode', icon: Sparkles },
    { id: 'test', label: 'Interview Mode', icon: Mic },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        
        {/* Logo */}
        <button
          onClick={onNewSession}
          className="flex items-center gap-3 transition hover:opacity-80 disabled:opacity-50 group"
          disabled={isGenerating}
        >
          <div className="w-9 h-9 p-1 rounded-lg bg-card border border-border flex items-center justify-center shadow-inner group-hover:border-primary/50 transition-colors">
            <img src="/Logo.png" alt="MockMate Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold tracking-tighter text-foreground text-xl hidden sm:block">MockMate</span>
        </button>

        {/* Tab Switcher */}
        <div className="flex bg-card border border-border p-1 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
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
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side placeholder or settings */}
        <div className="flex items-center gap-4">
          <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-foreground hover:bg-card transition">
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;