import React from 'react';
import { motion } from 'framer-motion';

const CodeExplain = () => {
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
          <span className="text-4xl">💻</span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">
          Code Explain <span className="text-cyan-400">(Phase 6)</span>
        </h2>
        
        <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
          Here, users will paste their solution code and verbally explain logic to the AI.
        </p>

        <div className="p-6 bg-black rounded-lg font-mono text-left text-sm text-green-400 border border-gray-700 shadow-inner max-w-2xl mx-auto opacity-75">
          <p>{`// Coming Soon: Monaco Editor Integration`}</p>
          <p>{`const explainCode = (userVoice) => {`}</p>
          <p className="pl-4">{`AI.analyze(userVoice, codeLogic);`}</p>
          <p className="pl-4">{`return feedback;`}</p>
          <p>{`}`}</p>
        </div>

      </div>
    </motion.div>
  );
};

export default CodeExplain;