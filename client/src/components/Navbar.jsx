import React from 'react';
import { motion } from 'framer-motion';

const Navbar = ({ setActiveMode, activeMode, onNewSession, isGenerating }) => {
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
<motion.img
  src="/Logo.png" // Ensure Logo.png is in your 'public' folder
  alt="MockMate Logo"
  // Adjust 'h-12' to make it bigger or smaller to fit your navbar height
  className="h-12 w-auto object-contain"
  whileHover={{ scale: 1.05 }}
  transition={{ type: "spring", stiffness: 400, damping: 10 }}
/>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-sm">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => {
                if (isGenerating) return; // block tab switch during generation
                setActiveMode(tab.id);
              }}
              disabled={isGenerating}
              className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10 ${isGenerating ? 'pointer-events-none cursor-not-allowed opacity-60' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeMode === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full shadow-lg shadow-cyan-500/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <motion.span 
                className={`relative z-10 transition-colors`}
                animate={{ color: activeMode === tab.id ? '#ffffff' : '#9ca3af' }}
                whileHover={{ color: '#d1d5db' }}
              >
                {tab.label}
              </motion.span>
            </motion.button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;