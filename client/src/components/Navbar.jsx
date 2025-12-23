import React from 'react';
import { motion } from 'framer-motion';

const Navbar = ({ setActiveMode, activeMode }) => {
  const tabs = [
    { id: 'guided', label: 'Guided Study' },
    { id: 'test', label: 'Mock Interview' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setActiveMode('guided')}
        >
          <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            MockMate
          </span>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMode(tab.id)}
              className="relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10"
            >
              {activeMode === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`relative z-10 ${activeMode === tab.id ? 'text-white' : 'text-gray-400'}`}>
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