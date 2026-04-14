import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GuidedMode = ({ userData, qaPairs, setQaPairs, setIsGenerating, sessionState, setSessionState }) => {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [stageTransition, setStageTransition] = useState(null);

  const fetchedQuestionIndex = useRef(null);
  const previousStage = useRef(null);

  const TOTAL_INTERVIEW_QUESTIONS = 35;

  // Stage display config (no emojis — clean text)
  const stageConfig = {
    introduction: { label: 'Introduction', color: '#f59e0b' },
    warmup: { label: 'Warm-up', color: '#f97316' },
    resume_based: { label: 'Resume & Skills', color: '#3b82f6' },
    technical: { label: 'Technical', color: '#8b5cf6' },
    behavioral: { label: 'Behavioral', color: '#ec4899' },
    real_world: { label: 'Real-World', color: '#10b981' },
    hr_closing: { label: 'HR & Closing', color: '#ef4444' },
  };

  const stageSegments = [
    { name: 'introduction', start: 0, questions: 2 },
    { name: 'warmup', start: 2, questions: 3 },
    { name: 'resume_based', start: 5, questions: 4 },
    { name: 'technical', start: 9, questions: 12 },
    { name: 'behavioral', start: 21, questions: 6 },
    { name: 'real_world', start: 27, questions: 3 },
    { name: 'hr_closing', start: 30, questions: 5 },
  ];

  // Fetch next question
  const fetchNextQuestion = useCallback(async () => {
    setLoading(true);
    setIsGenerating?.(true);
    setError(null);
    setShowHint(false);
    setShowAnswer(false);
    setShowTips(false);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      const askedQuestions = sessionState.askedQuestions || [];
      const truncatedResumeText = userData?.resumeText?.slice(0, 3000) || '';

      const res = await fetch(`${API_BASE}/api/generate-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: truncatedResumeText,
          jobDescription: userData?.jobDescription || '',
          questionIndex: sessionState.questionIndex,
          askedQuestions
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(`Server error: ${res.status} - ${errorData.error || 'Unknown'}`);
      }

      const data = await res.json();

      if (!data.success || !data.question?.text) {
        throw new Error('Invalid response from server');
      }

      // Check for stage transition
      if (previousStage.current && previousStage.current !== data.stage) {
        setStageTransition(data.stage);
        setTimeout(() => setStageTransition(null), 2000);
      }
      previousStage.current = data.stage;

      setCurrentQuestion(data);

      setSessionState(prev => {
        const prevSequence = prev.questionSequence || [];
        const alreadyCached = prevSequence.find(q => q.index === data.question.index);
        const nextSequence = alreadyCached ? prevSequence : [...prevSequence, {
          index: data.question.index,
          text: data.question.text,
          stage: data.stage,
          stageProgress: data.stageProgress
        }];

        const nextAsked = prev.askedQuestions || [];
        const questionId = data.question.id || data.question.text;
        const updatedAsked = nextAsked.includes(questionId) ? nextAsked : [...nextAsked, questionId];

        return {
          ...prev,
          currentStage: data.stage,
          askedQuestions: updatedAsked,
          stageProgress: data.stageProgress,
          questionSequence: nextSequence,
          currentQuestionCache: data
        };
      });

      setError(null);
    } catch (err) {
      setError(err?.name === 'AbortError' ? 'Request timed out.' : err.message);
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
      setIsGenerating?.(false);
    }
  }, [API_BASE, sessionState.questionIndex, sessionState.askedQuestions, userData, setSessionState, setIsGenerating]);

  // Handle next question
  const handleNextQuestion = useCallback(() => {
    setCurrentQuestion(null);
    setSessionState(prev => ({
      ...prev,
      questionIndex: prev.questionIndex + 1
    }));
  }, [setSessionState]);

  // Load question on mount / index change
  useEffect(() => {
    const cachedCurrent = sessionState.currentQuestionCache;
    if (cachedCurrent?.question?.index === sessionState.questionIndex) {
      if (!currentQuestion || currentQuestion.question.index !== cachedCurrent.question.index) {
        setCurrentQuestion(cachedCurrent);
        previousStage.current = cachedCurrent.stage;
      }
      return;
    }

    const cached = (sessionState.questionSequence || []).find(q => q.index === sessionState.questionIndex);
    if (cached) {
      if (!currentQuestion || currentQuestion.question.index !== cached.index) {
        setCurrentQuestion({
          success: true,
          stage: cached.stage,
          stageProgress: cached.stageProgress || sessionState.stageProgress,
          question: { text: cached.text, index: cached.index, stage: cached.stage }
        });
        previousStage.current = cached.stage;
      }
      return;
    }

    if (fetchedQuestionIndex.current !== sessionState.questionIndex) {
      fetchedQuestionIndex.current = sessionState.questionIndex;
      fetchNextQuestion();
    }
  }, [sessionState.questionIndex]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Enter' && e.ctrlKey && currentQuestion && !loading) {
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentQuestion, loading, handleNextQuestion]);

  const isInterviewComplete = sessionState.questionIndex >= TOTAL_INTERVIEW_QUESTIONS;
  const displayIndex = Math.min(sessionState.questionIndex + 1, TOTAL_INTERVIEW_QUESTIONS);
  const completionPercent = Math.min(Math.round((sessionState.questionIndex / TOTAL_INTERVIEW_QUESTIONS) * 100), 100);

  const currentStageConfig = currentQuestion ? stageConfig[currentQuestion.stage] : null;

  return (
    <div className="max-w-3xl mx-auto pt-24 pb-12 px-4">

      {/* Stage Transition Interstitial */}
      <AnimatePresence>
        {stageTransition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(10, 10, 15, 0.9)' }}
          >
            <div className="text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-4"
                style={{ background: stageConfig[stageTransition]?.color }}
              />
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {stageConfig[stageTransition]?.label}
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>Moving to next stage...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Section */}
      {currentQuestion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span
                className="mm-badge"
                style={{
                  background: currentStageConfig ? `${currentStageConfig.color}15` : 'var(--accent-muted)',
                  color: currentStageConfig?.color || 'var(--accent)',
                }}
              >
                {currentStageConfig?.label}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Question {displayIndex} of {TOTAL_INTERVIEW_QUESTIONS}
              </span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              {completionPercent}%
            </span>
          </div>

          {/* Single clean progress bar with stage markers */}
          <div className="mm-progress" style={{ height: '6px' }}>
            <div
              className="mm-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          {/* Stage labels below progress bar */}
          <div className="flex mt-2">
            {stageSegments.map((seg) => {
              const widthPercent = (seg.questions / TOTAL_INTERVIEW_QUESTIONS) * 100;
              const isActive = currentQuestion.stage === seg.name;
              const isPassed = sessionState.questionIndex >= seg.start + seg.questions;
              return (
                <div
                  key={seg.name}
                  className="text-center overflow-hidden"
                  style={{ width: `${widthPercent}%` }}
                >
                  <div
                    className="text-[10px] font-medium truncate px-0.5 transition-colors duration-300"
                    style={{
                      color: isActive ? stageConfig[seg.name]?.color : isPassed ? 'var(--text-muted)' : 'var(--bg-hover)',
                    }}
                  >
                    {stageConfig[seg.name]?.label}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {loading && !currentQuestion ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <div className="inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 rounded-full mx-auto mb-4"
                style={{ border: '3px solid var(--border)', borderTopColor: 'var(--accent)' }}
              />
              <p style={{ color: 'var(--text-muted)' }}>Loading question...</p>
            </div>
          </motion.div>

        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mm-card p-6"
            style={{ borderColor: 'var(--error)', borderLeftWidth: '3px' }}
          >
            <p className="font-semibold mb-2" style={{ color: 'var(--error)' }}>Failed to load question</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button onClick={fetchNextQuestion} className="mm-btn mm-btn-secondary text-sm">
              Retry
            </button>
          </motion.div>

        ) : !currentQuestion && !isInterviewComplete ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mm-card p-8 text-center"
          >
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Ready to begin your practice session.</p>
            <button onClick={fetchNextQuestion} className="mm-btn mm-btn-primary">
              Load First Question
            </button>
          </motion.div>

        ) : currentQuestion && !isInterviewComplete ? (
          <motion.div
            key={`question-${currentQuestion.question.index}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            {/* Question Card */}
            <div className="mm-card p-8 mb-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Interview Question
                  </p>
                  <h2 className="text-xl font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {currentQuestion.question.text}
                  </h2>
                </div>
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{
                    background: 'var(--accent-muted)',
                    color: 'var(--accent)',
                  }}
                >
                  {displayIndex}
                </div>
              </div>

              {/* Reveal Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="mm-reveal-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
                <button
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="mm-reveal-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {showAnswer ? 'Hide Answer' : 'Show Answer'}
                </button>
                {currentQuestion.guidance?.tips?.length > 0 && (
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className="mm-reveal-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6h16M4 12h16M4 18h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {showTips ? 'Hide Tips' : 'Key Tips'}
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Sections */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div
                    className="mm-card p-6"
                    style={{ borderLeft: '3px solid var(--info)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--info)' }}>
                      Coaching Direction
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {currentQuestion.guidance?.direction || 'Focus on clarity and structure in your response.'}
                    </p>
                  </div>
                </motion.div>
              )}

              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div
                    className="mm-card p-6"
                    style={{ borderLeft: '3px solid var(--success)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--success)' }}>
                      Sample Answer
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {currentQuestion.guidance?.answer || 'Provide a relevant example from your experience.'}
                    </p>
                  </div>
                </motion.div>
              )}

              {showTips && currentQuestion.guidance?.tips?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div
                    className="mm-card p-6"
                    style={{ borderLeft: '3px solid var(--secondary)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--secondary)' }}>
                      Key Points to Cover
                    </p>
                    <ul className="space-y-2">
                      {currentQuestion.guidance.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--secondary)' }} />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Ctrl+Enter for next
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNextQuestion}
                disabled={loading}
                className="mm-btn mm-btn-primary"
              >
                {sessionState.questionIndex + 1 >= TOTAL_INTERVIEW_QUESTIONS ? 'Complete Interview' : 'Next Question'}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.button>
            </div>
          </motion.div>

        ) : isInterviewComplete ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-2xl"
              style={{ background: 'var(--success-bg)' }}
            >
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Practice Complete
            </h2>
            <p className="mb-8 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
              You've gone through all {TOTAL_INTERVIEW_QUESTIONS} questions across 7 interview stages. Great preparation!
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mm-btn mm-btn-primary mm-btn-lg"
            >
              Start New Session
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default GuidedMode;