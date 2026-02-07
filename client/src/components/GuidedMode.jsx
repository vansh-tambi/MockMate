import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GuidedMode = ({ userData, qaPairs, setQaPairs, setIsGenerating, sessionState, setSessionState }) => {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [hoveredStage, setHoveredStage] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Track which question index we've already fetched to prevent double-fetching in StrictMode
  const fetchedQuestionIndex = useRef(null);
  
  // Total questions in the staged progression system
  const TOTAL_INTERVIEW_QUESTIONS = 22;

  // Stage emoji mapping
  const stageEmoji = {
    introduction: '👋',
    warmup: '🤝',
    resume_based: '📄',
    technical: '💻',
    behavioral: '🎯',
    real_world: '💬',
    hr_closing: '🏁'
  };

  // Stage display names
  const stageNames = {
    introduction: 'Introduction',
    warmup: 'Warm-up',
    resume_based: 'Resume & Skills',
    technical: 'Technical Skills',
    behavioral: 'Behavioral Questions',
    real_world: 'Real-World Scenarios',
    hr_closing: 'HR & Closing'
  };

  /**
   * Fetch next question from backend using staged progression
   * One question at a time - no batch processing
   */
  const fetchNextQuestion = useCallback(async () => {
    setLoading(true);
    setIsGenerating?.(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);

      const askedQuestions = sessionState.askedQuestions || [];

      const truncatedResumeText = userData?.resumeText?.slice(0, 3000) || '';

      console.log('📤 Fetching question', sessionState.questionIndex, 'of', TOTAL_INTERVIEW_QUESTIONS);

      const res = await fetch(`${API_BASE}/api/generate-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: truncatedResumeText,
          jobDescription: userData?.jobDescription || '',
          questionIndex: sessionState.questionIndex,
          askedQuestions: askedQuestions
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error('❌ Server error:', errorData);
        throw new Error(`Server error: ${res.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await res.json();

      console.log('📥 Response received:', {
        hasSuccess: !!data.success,
        hasQuestion: !!data.question,
        hasText: !!data.question?.text,
        stage: data.stage
      });

      if (!data.success) {
        console.error('❌ Response success flag missing:', data);
        throw new Error('Response missing success flag');
      }

      if (!data.question) {
        console.error('❌ Response question object missing:', data);
        throw new Error('Response missing question object');
      }

      if (!data.question.text) {
        console.error('❌ Response question text missing:', data.question);
        throw new Error('Response question missing text');
      }

      console.log('✅ Question received:', data.question.stage, '- Q' + (data.question.index + 1));

      // Set current question
      setCurrentQuestion(data);

      // Update session state with stage info and cache the question for sync
      setSessionState(prev => {
        const prevSequence = prev.questionSequence || [];
        const alreadyCached = prevSequence.find(q => q.index === data.question.index);
        const nextSequence = alreadyCached
          ? prevSequence
          : [...prevSequence, {
              index: data.question.index,
              text: data.question.text,
              stage: data.stage,
              stageProgress: data.stageProgress
            }];

        const nextAsked = prev.askedQuestions || [];
        const questionId = data.question.id || data.question.text;
        const updatedAsked = nextAsked.includes(questionId)
          ? nextAsked
          : [...nextAsked, questionId];

        return {
          ...prev,
          questionIndex: prev.questionIndex,
          currentStage: data.stage,
          askedQuestions: updatedAsked,
          stageProgress: data.stageProgress,
          questionSequence: nextSequence,
          currentQuestionCache: data
        };
      });

      setError(null);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      const isAbort = err?.name === 'AbortError';
      setError(isAbort ? 'Request timed out. Please try again.' : err.message);
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
      setIsGenerating?.(false);
    }
  }, [API_BASE, sessionState.questionIndex, sessionState.askedQuestions, userData, setSessionState, setIsGenerating]);

  /**
   * Move to next question - increment index and fetch new question
   */
  const handleNextQuestion = useCallback(async () => {
    // Increment question index
    const newIndex = sessionState.questionIndex + 1;

    setSessionState(prev => ({
      ...prev,
      questionIndex: newIndex
    }));

    // Fetch next question with new index
    setTimeout(() => {
      setCurrentQuestion(null); // Clear current question while loading
    }, 100);

    // This will be picked up by the effect with updated questionIndex
  }, [sessionState.questionIndex, setSessionState]);

  /**
   * Load first question on mount, then load new question when index changes
   */
  useEffect(() => {
    // Check if we already have this question cached
    const cachedCurrent = sessionState.currentQuestionCache;
    if (cachedCurrent && cachedCurrent.question && cachedCurrent.question.index === sessionState.questionIndex) {
      if (!currentQuestion || currentQuestion.question.index !== cachedCurrent.question.index) {
        setCurrentQuestion(cachedCurrent);
      }
      return;
    }

    // Check if we have it in the sequence cache
    const cached = (sessionState.questionSequence || []).find(
      q => q.index === sessionState.questionIndex
    );

    if (cached) {
      if (!currentQuestion || currentQuestion.question.index !== cached.index) {
        setCurrentQuestion({
          success: true,
          stage: cached.stage,
          stageProgress: cached.stageProgress || sessionState.stageProgress,
          question: {
            text: cached.text,
            index: cached.index,
            stage: cached.stage
          }
        });
      }
      return;
    }

    // Only fetch if we haven't already fetched this question index
    if (fetchedQuestionIndex.current !== sessionState.questionIndex) {
      fetchedQuestionIndex.current = sessionState.questionIndex;
      fetchNextQuestion();
    }
  }, [sessionState.questionIndex]);

  // Check if interview is complete
  const isInterviewComplete = sessionState.questionIndex >= TOTAL_INTERVIEW_QUESTIONS;
  const displayIndex = Math.min(sessionState.questionIndex + 1, TOTAL_INTERVIEW_QUESTIONS);
  const completionPercent = Math.min(
    Math.round((sessionState.questionIndex / TOTAL_INTERVIEW_QUESTIONS) * 100),
    100
  );

  // Stage color mapping
  const stageColors = {
    introduction: 'from-yellow-500 to-yellow-600',
    warmup: 'from-orange-500 to-red-500',
    resume_based: 'from-blue-500 to-cyan-600',
    technical: 'from-purple-500 to-violet-600',
    behavioral: 'from-pink-500 to-rose-600',
    real_world: 'from-green-500 to-emerald-600',
    hr_closing: 'from-red-500 to-red-700'
  };

  // Stage definitions for progress bar segments (22 total questions)
  const stageSegments = [
    { name: 'introduction', start: 0, questions: 2, color: stageColors.introduction },
    { name: 'warmup', start: 2, questions: 2, color: stageColors.warmup },
    { name: 'resume_based', start: 4, questions: 3, color: stageColors.resume_based },
    { name: 'technical', start: 7, questions: 10, color: stageColors.technical },
    { name: 'behavioral', start: 17, questions: 5, color: stageColors.behavioral }
  ];

  return (
    <div className="max-w-4xl mx-auto pt-20 pb-10 px-4">
      {/* Stage Progress Bar */}
      {currentQuestion && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Stage Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {stageEmoji[currentQuestion.stage]} {stageNames[currentQuestion.stage] || currentQuestion.stage}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Question {displayIndex} of {TOTAL_INTERVIEW_QUESTIONS}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-cyan-400">
                {completionPercent}%
              </p>
              <p className="text-xs text-gray-500">Complete</p>
            </div>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl overflow-visible h-6 flex gap-2 p-1.5 backdrop-blur-xl shadow-lg">
            {stageSegments.map((stage, idx) => {
              const stagePercent = (stage.questions / TOTAL_INTERVIEW_QUESTIONS) * 100;
              const isCurrentStage = currentQuestion.stage === stage.name;
              const isPassed = sessionState.questionIndex >= stage.start + stage.questions;
              const isActive = sessionState.questionIndex >= stage.start;
              
              return (
                <motion.div
                  key={stage.name}
                  className="relative flex-1 h-full rounded-full overflow-hidden cursor-pointer"
                  whileHover={{ scale: 1.08 }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMousePos({
                      x: e.clientX,
                      y: rect.top - 10
                    });
                    setHoveredStage(stage.name);
                  }}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  {/* Segment background */}
                  <motion.div 
                    className={`w-full h-full bg-gray-700 relative rounded-full transition-shadow`}
                    animate={{
                      boxShadow: hoveredStage === stage.name 
                        ? `0 0 12px rgba(6, 182, 212, 0.4), inset 0 0 8px rgba(6, 182, 212, 0.2)` 
                        : 'none'
                    }}
                  >
                    {/* Filled portion */}
                    {(isActive || isPassed) && (
                      <motion.div
                        className={`h-full bg-gradient-to-r ${stage.color} rounded-full shadow-lg transition-shadow`}
                        initial={{ width: 0 }}
                        animate={{
                          width: isPassed
                            ? '100%'
                            : isCurrentStage
                            ? `${((sessionState.questionIndex - stage.start) / stage.questions) * 100}%`
                            : '0%',
                          boxShadow: hoveredStage === stage.name
                            ? `0 0 16px rgba(6, 182, 212, 0.8), 0 0 8px rgba(6, 182, 212, 0.4)`
                            : 'none'
                        }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Floating Tooltip - follows cursor */}
          {hoveredStage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: 'spring', damping: 15 }}
              className="fixed bg-black/95 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-lg whitespace-nowrap z-50 pointer-events-none border border-cyan-500/50 shadow-2xl"
              style={{
                left: `${mousePos.x}px`,
                top: `${mousePos.y}px`,
                transform: 'translateX(-50%)',
                boxShadow: '0 0 16px rgba(6, 182, 212, 0.5), 0 0 8px rgba(6, 182, 212, 0.3)'
              }}
            >
              <p className="font-semibold text-cyan-300">{stageNames[hoveredStage] || hoveredStage}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {stageSegments.find(s => s.name === hoveredStage) && 
                  `Q${stageSegments.find(s => s.name === hoveredStage).start + 1}-Q${stageSegments.find(s => s.name === hoveredStage).start + stageSegments.find(s => s.name === hoveredStage).questions}`
                }
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Main Question Card */}
      <AnimatePresence mode="wait">
        {loading && !currentQuestion ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full"
              />
              <p className="mt-4 text-gray-400">Loading next question...</p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400"
          >
            <p className="font-semibold mb-2">❌ Error Loading Question</p>
            <p className="text-sm mb-4 text-red-300">{error}</p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={fetchNextQuestion}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-semibold transition-all text-sm"
              >
                🔄 Retry
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/api/debug/test-question`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ questionIndex: sessionState.questionIndex })
                    });
                    const data = await res.json();
                    console.log('Debug info:', data);
                    alert(`Debug Info:\nStage: ${data.stage}\nQuestions available: ${data.questionsInStage}\nCheck console for full details`);
                  } catch (e) {
                    console.error('Debug error:', e);
                  }
                }}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 font-semibold transition-all text-sm"
              >
                🔍 Debug Info
              </button>
            </div>
          </motion.div>
        ) : !currentQuestion && !isInterviewComplete ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="p-6 bg-gray-900/60 border border-gray-800 rounded-xl text-gray-300"
          >
            <p className="font-semibold mb-2">No question loaded</p>
            <p className="text-sm mb-4 text-gray-400">Tap below to load the current question.</p>
            <motion.button
              onClick={fetchNextQuestion}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(6, 182, 212, 0.7)' }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-all text-sm"
            >
              Load Question
            </motion.button>
          </motion.div>
        ) : currentQuestion && !isInterviewComplete ? (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Question Section */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 mb-8 backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Interview Question</h3>
              <p className="text-2xl font-bold text-white leading-relaxed mb-6">
                {currentQuestion.question.text}
              </p>

              {/* Coaching Direction */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                whileHover={{ x: 4, backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
                className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-xl mb-6 cursor-pointer transition-colors"
              >
                <p className="text-sm text-gray-400 font-semibold mb-1">💡 Coaching Tip</p>
                <p className="text-blue-300">{currentQuestion.guidance?.direction || 'Focus on clarity and structure.'}</p>
              </motion.div>

              {/* Sample Answer */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                whileHover={{ x: 4, backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
                className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded-r-xl mb-6 cursor-pointer transition-colors"
              >
                <p className="text-sm text-gray-400 font-semibold mb-1">✅ Sample Answer</p>
                <p className="text-green-300 leading-relaxed">{currentQuestion.guidance?.answer || 'Provide a relevant example from your experience.'}</p>
              </motion.div>

              {/* Tips */}
              {currentQuestion.guidance?.tips && currentQuestion.guidance?.tips?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  whileHover={{ x: 4, backgroundColor: 'rgba(168, 85, 247, 0.15)' }}
                  className="bg-purple-500/10 border-l-4 border-purple-500 p-4 rounded-r-xl cursor-pointer transition-colors"
                >
                  <p className="text-sm text-gray-400 font-semibold mb-3">🎯 Key Tips</p>
                  <ul className="space-y-2">
                    {currentQuestion.guidance?.tips?.map((tip, idx) => (
                      <motion.li 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + idx * 0.05, duration: 0.3 }}
                        className="text-purple-300 text-sm flex items-start gap-2"
                      >
                        <span className="mt-0.5">•</span>
                        <span>{tip}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Next Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex justify-end"
            >
              <motion.button
                onClick={handleNextQuestion}
                disabled={loading}
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)' }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/40"
              >
                {sessionState.questionIndex + 1 >= TOTAL_INTERVIEW_QUESTIONS
                  ? 'View Results'
                  : 'Next Question'}
              </motion.button>
            </motion.div>
          </motion.div>
        ) : isInterviewComplete ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-4">Interview Complete!</h2>
            <p className="text-gray-400 mb-8">
              You've answered all {TOTAL_INTERVIEW_QUESTIONS} questions across 5 stages.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-cyan-500/40"
            >
              Start New Interview
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default GuidedMode;