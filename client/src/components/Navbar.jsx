import React from 'react';
import { motion } from 'framer-motion';

const Navbar = ({ setActiveMode, activeMode, onNewSession, isGenerating }) => {
  const tabs = [
    { id: 'guided', label: 'Practice Mode', icon: '📖' },
    { id: 'test', label: 'Interview Mode', icon: '🎤' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-18 flex justify-between items-center" style={{ height: '72px' }}>
        
        {/* Logo */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={onNewSession}
          title="Start new session"
        >
          <img
            src="/Logo.png"
            alt="MockMate"
            className="h-10 w-auto object-contain"
          />
        </motion.div>

        {/* Tab Switcher */}
        <div
          className="flex p-1.5 rounded-xl gap-1.5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (isGenerating) return;
                setActiveMode(tab.id);
              }}
              disabled={isGenerating}
              className="relative px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                color: activeMode === tab.id ? 'white' : 'var(--text-muted)',
                background: activeMode === tab.id ? 'var(--accent)' : 'transparent',
                boxShadow: activeMode === tab.id ? 'var(--shadow-accent)' : 'none',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              <span className="relative z-10 flex items-center gap-2.5">
                <span className="text-sm">{tab.icon}</span>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;