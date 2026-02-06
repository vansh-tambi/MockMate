import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SetupScreen = ({ onComplete }) => {
  const [resume, setResume] = useState(null);
  const [manualResume, setManualResume] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const manualTextareaRef = useRef(null);

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.08 } }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
  };

  useEffect(() => {
    if (manualMode && manualTextareaRef.current) {
      manualTextareaRef.current.focus();
    }
  }, [manualMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (manualMode) {
      if (!manualResume.trim() || !jobDescription.trim()) {
        return alert("Please add your resume summary and job role.");
      }
      onComplete({ resumeText: manualResume.trim(), jobDescription });
      return;
    }

    if (!resume || !jobDescription) return alert("Required fields missing");

    console.log('🚀 Starting resume upload...', {
      fileName: resume.name,
      fileSize: resume.size,
      fileType: resume.type
    });

    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    const formData = new FormData();
    formData.append('resume', resume);

    try {
      console.log('📤 Sending request to:', `${API_BASE}/api/parse-resume`);
      
      const res = await fetch(`${API_BASE}/api/parse-resume`, {
        method: 'POST',
        body: formData
      });
      
      console.log('📥 Response status:', res.status, res.statusText);
      
      const responseData = await res.json();
      console.log('📝 Response data:', responseData);
      
      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to parse resume');
      }
      
      console.log('✅ Resume parsed successfully:', responseData.data);
      
      // Pass the parsed data along with resume text
      onComplete({ 
        resumeText: responseData.text || responseData.data?.summary || '',
        jobDescription,
        parsedResume: responseData.data // Include all parsed resume data
      });
    } catch (error) {
      console.error('❌ Resume parsing error:', error);
      const errorMessage = error.message || 'Failed to parse resume';
      const suggestion = errorMessage.includes('PDF') 
        ? '\n\n💡 Tip: Try using the "Manual" mode to paste your resume text instead.'
        : '';
      alert(`Setup failed: ${errorMessage}${suggestion}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background Blobs */}
      <motion.div 
        animate={{ 
          y: [0, 30, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)' }}
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px]" 
      />
      <motion.div 
        animate={{ 
          y: [0, -30, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        style={{ backgroundColor: 'rgba(8, 145, 178, 0.1)' }}
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[100px]" 
      />

      <motion.div 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)' }}
        className="relative z-10 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full mx-4"
      >
        <motion.div
          variants={fadeUp}
          className="text-center mb-10"
        >
          <motion.h1 
            className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-3"
            animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Initialize
          </motion.h1>
          <motion.p 
            className="text-gray-400"
            variants={fadeUp}
          >
            Upload context for your AI session
          </motion.p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            variants={fadeUp}
          >
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">Resume Input</label>
              <div className="flex gap-2 text-xs">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(6, 182, 212, 0.12)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setManualMode(false)}
                  className={`px-3 py-1 rounded-full border ${manualMode ? 'border-white/10 text-gray-400' : 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10'}`}
                >PDF</motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(6, 182, 212, 0.12)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setManualMode(true)}
                  className={`px-3 py-1 rounded-full border ${manualMode ? 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10' : 'border-white/10 text-gray-400'}`}
                >Manual</motion.button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!manualMode && (
                <motion.div
                  key="pdf-input"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  whileHover={{ borderColor: 'rgba(6, 182, 212, 0.5)', y: -1 }}
                  className="mt-2 relative"
                >
                  <input 
                    type="file" accept=".pdf"
                    onChange={(e) => setResume(e.target.files[0])}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-gray-300 file:bg-cyan-500/10 file:text-cyan-400 file:border-0 file:rounded-lg file:px-4 file:py-2 cursor-pointer hover:border-cyan-500/50 transition-all"
                  />
                  {resume && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-3 top-3 text-green-400 text-sm font-semibold"
                    >
                      ✓ {resume.name}
                    </motion.span>
                  )}
                </motion.div>
              )}

              {manualMode && (
                <motion.textarea
                  key="manual-input"
                  rows="5"
                  ref={manualTextareaRef}
                  value={manualResume}
                  onChange={(e) => setManualResume(e.target.value)}
                  placeholder="Paste or type your resume summary, key projects, and skills."
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  whileFocus={{ borderColor: 'rgba(6, 182, 212, 0.5)', y: -1 }}
                  className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-colors placeholder:text-gray-600 resize-none"
                />
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            variants={fadeUp}
          >
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">🎯 Target Role</label>
            <motion.textarea 
              rows="3"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="e.g. Senior React Developer at Tech Company"
              whileFocus={{ borderColor: 'rgba(6, 182, 212, 0.5)' }}
              transition={{ duration: 0.3 }}
              className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-colors placeholder:text-gray-600 resize-none"
            />
          </motion.div>

          <motion.button 
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            variants={fadeUp}
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 text-white"
          >
            {loading ? (
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center justify-center gap-2"
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ⚙️
                </motion.span>
                Processing...
              </motion.span>
            ) : (
              'Launch Session'
            )}
          </motion.button>
        </form>

        <motion.div
          variants={fadeUp}
          className="mt-8 pt-8 border-t border-white/10"
        >
          <p className="text-xs text-gray-500 text-center">
            💡 Tip: Use the MockMate logo to start a new session anytime
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SetupScreen;