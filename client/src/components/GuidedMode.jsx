import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// NOTE: ESLint's base no-unused-vars rule may not count JSX member usage like <motion.div />.
// This explicit reference keeps the import from being flagged as unused.
void motion;

const GuidedMode = ({ userData }) => {
  const [qaPairs, setQaPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  const [seenQuestions, setSeenQuestions] = useState([]);
  const [qaPool, setQaPool] = useState([]);
  const [poolCursor, setPoolCursor] = useState(0);

  const SET_SIZE = 5;
  const BATCH_SIZE = 25; // fewer API calls -> avoids hitting Gemini free-tier request quota quickly

  const commitSet = (pairs) => {
    const safePairs = Array.isArray(pairs) ? pairs : [];
    setQaPairs(safePairs);

    const nextQs = safePairs.map((p) => p?.question).filter(Boolean);
    setSeenQuestions((prev) => Array.from(new Set([...(prev || []), ...nextQs])));
  };

  const fetchBatch = async () => {
    setLoading(true);
    setOpenIndex(null);
    try {
      const res = await fetch('http://localhost:5000/api/generate-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: userData.resumeText,
          jobDescription: userData.jobDescription,
          // Prevent repeats across "Generate New Set" clicks
          excludeQuestions: seenQuestions,
          // Add a nonce so even identical inputs can yield a different set
          nonce: Date.now(),
          // Ask for a larger pool so the user can generate multiple sets without re-calling Gemini.
          count: BATCH_SIZE
        })
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      const nextPool = Array.isArray(data.qaPairs) ? data.qaPairs : [];
      setQaPool(nextPool);
      setPoolCursor(Math.min(SET_SIZE, nextPool.length));
      commitSet(nextPool.slice(0, SET_SIZE));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  const nextSet = () => {
    setOpenIndex(null);

    // If we still have unused items in the pool, show the next chunk without calling the API.
    if (qaPool.length && poolCursor < qaPool.length) {
      const slice = qaPool.slice(poolCursor, poolCursor + SET_SIZE);
      setPoolCursor(Math.min(poolCursor + SET_SIZE, qaPool.length));
      commitSet(slice);
      return;
    }

    // Pool is empty/exhausted -> fetch a new batch.
    fetchBatch();
  };

  useEffect(() => {
    if (qaPairs.length === 0) fetchBatch();
  }, []);

  return (
    <div className="max-w-4xl mx-auto pt-20 pb-12">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Guided Study</h2>
          <p className="text-gray-400">Master your interview answers with AI-generated notes.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={nextSet}
          disabled={loading}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-semibold text-cyan-400 backdrop-blur-md transition-colors flex items-center gap-2"
        >
          {loading ? 'Generating...' : '🔄 Generate New Set'}
        </motion.button>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"/>
            <p className="text-cyan-400 animate-pulse">Consulting AI Knowledge Base...</p>
          </div>
        )}
        
        <AnimatePresence>
          {!loading && qaPairs.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-cyan-500/30 transition-colors"
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left p-6 flex justify-between items-start gap-4"
              >
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-medium text-gray-200 pt-1 leading-relaxed">
                    {item.question}
                  </h3>
                </div>
                <motion.span 
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  className="text-gray-500 flex-shrink-0 mt-1"
                >
                  ▼
                </motion.span>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 pl-[4.5rem] pr-8 pb-8">
                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 border-l-4 border-l-green-500">
                        <p className="text-xs font-bold text-green-500 uppercase mb-2 tracking-wider">Suggested Answer</p>
                        <p className="text-gray-300 leading-7">{item.answer}</p>
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
