import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GuidedMode = ({ userData }) => {
  const [qaPairs, setQaPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);

  const fetchQuestions = async () => {
    setLoading(true);
    setOpenIndex(null);
    try {
      const res = await fetch('http://localhost:5000/api/generate-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      setQaPairs(data.qaPairs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qaPairs.length === 0) fetchQuestions();
  }, []);

  return (
    <div className="max-w-4xl mx-auto pt-20 pb-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-bold text-white">Guided Study</h2>
          <p className="text-gray-400 mt-1">AI-curated questions for your role</p>
        </div>
        <button 
          onClick={fetchQuestions} disabled={loading}
          className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-cyan-400 font-semibold transition-all"
        >
          {loading ? 'Generating...' : '🔄 Refresh Questions'}
        </button>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="text-center py-20 opacity-50 animate-pulse text-cyan-400">
            Generating intelligent insights...
          </div>
        )}

        <AnimatePresence>
          {!loading && qaPairs.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors"
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left p-6 flex gap-4 items-start"
              >
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-cyan-500/10 text-cyan-400 rounded-lg font-bold text-sm">
                  {index + 1}
                </span>
                <div className="flex-grow">
                  <h3 className="text-lg font-medium text-gray-200">{item.question}</h3>
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 pl-16">
                      <div className="p-4 bg-black/40 border-l-4 border-green-500 rounded-r-xl">
                        <p className="text-xs font-bold text-green-500 uppercase mb-2">Sample Answer</p>
                        <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GuidedMode;