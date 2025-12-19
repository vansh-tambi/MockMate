import React from 'react';
import { motion } from 'framer-motion';

const TestMode = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800 text-center">
        
        {/* Icon / Graphic */}
        <div className="w-20 h-20 bg-gray-800 rounded-full mx-auto flex items-center justify-center mb-6">
          <span className="text-4xl">🎥</span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">
          Test Mode <span className="text-cyan-400">(Phase 3)</span>
        </h2>
        
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
          This is where the real magic happens. In the next phase, we will integrate:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-cyan-400 font-bold mb-1">Live Camera Feed</h3>
            <p className="text-sm text-gray-400">See yourself while you answer.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
             <h3 className="text-cyan-400 font-bold mb-1">Speech Analysis</h3>
             <p className="text-sm text-gray-400">Real-time WPM and filler word detection.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
             <h3 className="text-cyan-400 font-bold mb-1">Eye Contact Tracking</h3>
             <p className="text-sm text-gray-400">Using AI to check if you are looking at the camera.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
             <h3 className="text-cyan-400 font-bold mb-1">Instant Feedback</h3>
             <p className="text-sm text-gray-400">GenAI rating your answer immediately.</p>
          </div>
        </div>

        <button className="mt-8 px-8 py-3 bg-gray-700 text-gray-400 font-bold rounded-lg cursor-not-allowed">
          Development in Progress...
        </button>
      </div>
    </motion.div>
  );
};

export default TestMode;