import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <motion.button
          onClick={onNewSession}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 transition hover:opacity-80 disabled:opacity-50 group"
          disabled={isGenerating}
        >
          <div className="w-9 h-9 p-1 rounded-lg bg-card border border-border flex items-center justify-center shadow-inner group-hover:border-primary/50 transition-colors">
            <img src="/Logo.png" alt="MockMate Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold tracking-tighter text-foreground text-xl hidden sm:block">MockMate</span>
        </motion.button>

        {/* Tab Switcher */}
        <div className="flex bg-card border border-border p-1 rounded-xl relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isGenerating) return;
                  setActiveMode(tab.id);
                }}
                disabled={isGenerating}
                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 z-10 ${
                  isActive ? 'text-white' : 'text-muted hover:text-foreground'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-pills"
                    className="absolute inset-0 bg-primary rounded-lg shadow-md shadow-primary/20"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-20 ${isActive ? 'text-white' : ''}`} />
                <span className="hidden sm:inline relative z-20">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side placeholder or settings */}
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-foreground hover:bg-card transition"
          >
            <User className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;