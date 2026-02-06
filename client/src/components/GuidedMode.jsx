import React, { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const GuidedMode = ({ userData, qaPairs, setQaPairs, setIsGenerating, sessionState, setSessionState }) => {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const [loading, setLoading] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  const [error, setError] = useState(null);

  // Stage emoji mapping
  const stageEmoji = {
    warmup: '🤝',
    introduction: '👋',
    resume: '📋',
    role_fit: '🎯',
    fundamentals: '💻',
    technical_frontend: '⚛️',
    technical_backend: '🗄️',
    technical_dsa: '🧮',
    system_design: '🏗️',
    problem_solving: '🧩',
    behavioral: '💬',
    pressure: '⚡',
    closing: '🎯'
  };

  // Stage display names
  const stageNames = {
    warmup: 'Warmup',
    introduction: 'Introduction',
    resume: 'Resume Deep Dive',
    role_fit: 'Role Fit',
    fundamentals: 'Fundamentals',
    technical_frontend: 'Frontend Technical',
    technical_backend: 'Backend Technical',
    technical_dsa: 'DSA & Algorithms',
    system_design: 'System Design',
    problem_solving: 'Problem Solving',
    behavioral: 'Behavioral',
    pressure: 'Pressure Questions',
    closing: 'Closing'
  };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setIsGenerating?.(true);
    setError(null);
    setOpenIndex(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);

      // Limit resume text to first 3000 chars to avoid large payloads (413 error)
      const truncatedResumeText = userData?.resumeText?.slice(0, 3000) || '';
      
      const res = await fetch(`${API_BASE}/api/generate-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resumeText: truncatedResumeText, 
          jobDescription: userData?.jobDescription || '', 
          questionIndex: sessionState.questionIndex,
          questionCount: 10,
          sessionMemory: {
            askedQuestions: sessionState.askedQuestions || [],
            weakTopics: sessionState.weakTopics || [],
            strongTopics: sessionState.strongTopics || []
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timer);
      
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.qaPairs && data.qaPairs.length > 0) {
        setQaPairs(data.qaPairs);
        
        // Update session state with backend response including resume analysis
        setSessionState(prev => ({
          ...prev,
          sessionId: data.sessionId || prev.sessionId,
          role: data.detectedRole || prev.role,
          sequence: data.sequence || prev.sequence,
          questionIndex: prev.questionIndex + data.qaPairs.length,
          currentStage: data.qaPairs[data.qaPairs.length - 1]?.stage || prev.currentStage,
          askedQuestions: data.sessionMemory?.askedQuestions || [...prev.askedQuestions, ...data.qaPairs.map(q => q.question)],
          weakTopics: data.sessionMemory?.weakTopics || prev.weakTopics,
          strongTopics: data.sessionMemory?.strongTopics || prev.strongTopics,
          resumeAnalysis: data.resumeAnalysis || prev.resumeAnalysis
        }));
        
        setError(null);
      } else {
        setError('No questions generated. Please try again.');
        setQaPairs([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const isAbort = err?.name === 'AbortError';
      setError(isAbort ? 'Request timed out. Please try again.' : 'Failed to generate questions. Please check your connection and try again.');
      setQaPairs([]);
    } finally {
      setLoading(false);
      setIsGenerating?.(false);
    }
  }, [API_BASE, setIsGenerating, setQaPairs, setSessionState, userData, sessionState.questionIndex]);

  useEffect(() => {
    // Only fetch questions if empty (initial load)
    if (qaPairs.length === 0) fetchQuestions();
  }, [qaPairs.length, fetchQuestions]);

  return (
    <div className="max-w-4xl mx-auto pt-20 pb-10">
      {/* Resume Analysis Banner */}
      {sessionState.resumeAnalysis && sessionState.resumeAnalysis.totalSkills > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Detected Skills</p>
              <p className="text-lg font-semibold text-purple-400">
                {sessionState.resumeAnalysis.totalSkills} skills found
              </p>
              {sessionState.resumeAnalysis.skills && sessionState.resumeAnalysis.skills.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {sessionState.resumeAnalysis.skills.slice(0, 5).map((skill, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                      {skill}
                    </span>
                  ))}
                  {sessionState.resumeAnalysis.skills.length > 5 && (
                    <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full">
                      +{sessionState.resumeAnalysis.skills.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Experience Level</p>
              <p className="text-lg font-semibold text-pink-400 capitalize">
                {sessionState.resumeAnalysis.experienceLevel}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Session Info Banner */}
      {sessionState.role && sessionState.sequence.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Interview Role</p>
              <p className="text-xl font-bold text-cyan-400 capitalize">{sessionState.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Current Stage</p>
              <p className="text-lg font-semibold text-white flex items-center gap-2">
                <span>{stageEmoji[sessionState.currentStage] || '📝'}</span>
                {stageNames[sessionState.currentStage] || sessionState.currentStage}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Progress</p>
              <p className="text-lg font-semibold text-white">{sessionState.questionIndex}/{sessionState.sequence.length * 3}</p>
            </div>
          </div>
          
          {/* Stage Progress Bar */}
          <div className="mt-4 flex gap-1">
            {sessionState.sequence.map((stage, idx) => {
              const stageStartIndex = idx * 3;
              const isCompleted = sessionState.questionIndex > stageStartIndex + 2;
              const isActive = sessionState.questionIndex >= stageStartIndex && sessionState.questionIndex <= stageStartIndex + 2;
              
              return (
                <div 
                  key={idx}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    isCompleted ? 'bg-green-500' : isActive ? 'bg-cyan-500 animate-pulse' : 'bg-gray-700'
                  }`}
                  title={stageNames[stage]}
                />
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex justify-between items-end mb-8"
      >
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-4xl font-bold text-white">Guided Study</h2>
          <p className="text-gray-400 mt-1">AI-curated questions for your role</p>
          {qaPairs.length > 0 && <p className="text-cyan-400 text-sm mt-2">{qaPairs.length} questions loaded</p>}
        </motion.div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          onClick={fetchQuestions} 
          disabled={loading}
          className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-cyan-400 font-semibold transition-all disabled:opacity-50"
        >
          {loading ? 'Generating...' : '🔄 New Questions'}
        </motion.button>
      </motion.div>

      <div className="space-y-4">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 opacity-50 animate-pulse text-cyan-400"
          >
            Generating intelligent insights (this may take 30-60 seconds)...
          </motion.div>
        )}

        <AnimatePresence>
          {!loading && qaPairs.length > 0 && qaPairs.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1 + (index % 10) * 0.05, duration: 0.4 }}
              className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors"
            >
              <motion.button 
                whileHover={{ backgroundColor: 'rgba(17, 24, 39, 0.6)' }}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left p-6 flex gap-4 items-start"
              >
                <motion.span 
                  className="shrink-0 w-8 h-8 flex items-center justify-center bg-cyan-500/10 text-cyan-400 rounded-lg font-bold text-sm"
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(6, 182, 212, 0.2)' }}
                >
                  {index + 1}
                </motion.span>
                <div className="grow">
                  {/* Stage Badge */}
                  {item.stage && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20 font-semibold">
                        {stageEmoji[item.stage]} {stageNames[item.stage] || item.stage}
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-medium text-gray-200">{item.question}</h3>
                </div>
              </motion.button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="p-6 pt-0 pl-16 space-y-4"
                    >
                      {/* Expected Direction */}
                      <div className="p-4 bg-blue-500/5 border-l-4 border-blue-500 rounded-r-xl">
                        <p className="text-xs font-bold text-blue-400 uppercase mb-2">💡 Expected Direction</p>
                        <p className="text-gray-300 leading-relaxed text-sm">{item.direction || item.answer}</p>
                      </div>

                      {/* Expected Answer */}
                      <div className="p-4 bg-green-500/5 border-l-4 border-green-500 rounded-r-xl">
                        <p className="text-xs font-bold text-green-400 uppercase mb-2">✓ Sample Answer</p>
                        <p className="text-gray-200 leading-relaxed text-sm">{item.answer}</p>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && qaPairs.length === 0 && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-400"
          >
            Click "New Questions" to generate questions
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GuidedMode;