import React from 'react';
import { motion } from 'framer-motion';

// NOTE: ESLint's base no-unused-vars rule may not count JSX member usage like <motion.div />.
void motion;

const Navbar = ({ setActiveMode, activeMode }) => {
  const tabs = [
    { id: 'guided', label: 'Guided Study' },
    { id: 'test', label: 'Mock Interview' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        
        {/* Logo Area */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveMode('guided')}
        >
          <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            MockMate
          </span>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
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
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${activeMode === tab.id ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
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
