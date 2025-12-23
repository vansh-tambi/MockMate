import React from 'react';
import { motion } from 'framer-motion';

const Navbar = ({ setActiveMode, activeMode, onNewSession }) => {
  const tabs = [
    { id: 'guided', label: 'Guided Study' },
    { id: 'test', label: 'Mock Interview' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        
        {/* Logo */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 cursor-pointer"
          onClick={onNewSession}
        >
          <motion.div 
            className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20"
            whileHover={{ boxShadow: '0 0 30px rgba(0, 188, 212, 0.6)' }}
          >
            <span className="text-white font-bold text-xl">M</span>
          </motion.div>
          <motion.span 
            className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 hidden sm:inline"
            whileHover={{ backgroundImage: 'linear-gradient(to right, #06b6d4, #0ea5e9)' }}
          >
            MockMate
          </motion.span>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveMode(tab.id)}
              className="relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;