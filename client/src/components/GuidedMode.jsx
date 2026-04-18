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

  const stageConfig = {
    introduction: { label: 'Introduction' },
    warmup: { label: 'Warm-up' },
    resume_based: { label: 'Resume & Skills' },
    technical: { label: 'Technical' },
    behavioral: { label: 'Behavioral' },
    real_world: { label: 'Real-World' },
    hr_closing: { label: 'HR & Closing' },
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

  const handleNextQuestion = useCallback(() => {
    setCurrentQuestion(null);
    setSessionState(prev => ({
      ...prev,
      questionIndex: prev.questionIndex + 1
    }));
  }, [setSessionState]);

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
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center py-12">
      <AnimatePresence>
        {stageTransition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
          >
            <div className="text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-4 bg-primary animate-pulse" />
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {stageConfig[stageTransition]?.label}
              </h2>
              <p className="text-muted">Moving to next stage...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar Header */}
      {currentQuestion && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest">
                {currentStageConfig?.label || 'Interview'}
              </span>
              <span className="text-sm font-medium text-muted">
                Question {displayIndex} of {TOTAL_INTERVIEW_QUESTIONS}
              </span>
            </div>
            <span className="text-sm font-bold text-foreground">{completionPercent}%</span>
          </div>

          <div className="w-full h-1.5 bg-card rounded-full overflow-hidden border border-border">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${completionPercent}%` }} />
          </div>

          <div className="flex mt-2 w-full gap-[1px]">
            {stageSegments.map((seg) => {
              const widthPercent = (seg.questions / TOTAL_INTERVIEW_QUESTIONS) * 100;
              const isActive = currentQuestion.stage === seg.name;
              const isPassed = sessionState.questionIndex >= seg.start + seg.questions;
              return (
                <div key={seg.name} className="h-1 rounded-sm transition-colors duration-300" style={{
                  width: `${widthPercent}%`,
                  backgroundColor: isActive ? 'var(--color-primary)' : isPassed ? 'var(--color-muted)' : 'transparent',
                }} />
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {loading && !currentQuestion ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-24 glass-panel flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20">
                <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="h-full w-48 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-6 shadow-inner">
                <img src="/Logo.png" alt="Logo" className="w-8 h-8 object-contain animate-pulse" />
              </div>
              <p className="text-foreground font-bold text-lg mb-1 tracking-tight">Synthesizing follow-up...</p>
              <p className="text-muted text-sm px-8 max-w-xs">Our AI is analyzing your previous responses to generate the perfect next question.</p>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel border-l-4 border-l-red-500 p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-red-500">error</span>
                <p className="font-bold text-red-500 uppercase tracking-widest text-xs">Synthesis Failed</p>
              </div>
              <p className="text-muted mb-6 text-sm">{error}</p>
              <button onClick={fetchNextQuestion} className="btn-secondary">
                <span className="material-symbols-outlined text-[16px] mr-2">refresh</span>
                Retry Generation
              </button>
            </motion.div>
          ) : !currentQuestion && !isInterviewComplete ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-16 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-8">
                <span className="material-symbols-outlined text-4xl text-primary">rocket_launch</span>
              </div>
              <h3 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">Session Ready</h3>
              <p className="text-muted mb-10 max-w-sm text-base">
                Your environment is initialized. Press the button below to generate your introductory greeting.
              </p>
              <button onClick={fetchNextQuestion} className="btn-primary py-4 px-10 rounded-2xl shadow-2xl shadow-primary/20 group">
                Initialize Session
                <span className="material-symbols-outlined text-[20px] ml-2 transition-transform group-hover:translate-x-1">play_arrow</span>
              </button>
            </motion.div>
          ) : currentQuestion && !isInterviewComplete ? (
            <motion.div key={`question-${currentQuestion.question.index}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex flex-col h-full">
              
              <div className="glass-panel p-8 sm:p-12 mb-6">
                <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Interview Prompt</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground leading-snug">{currentQuestion.question.text}</h2>
                
                <div className="mt-10 flex flex-wrap gap-3">
                  <button onClick={() => setShowHint(!showHint)} className="btn-secondary text-xs">
                    <span className="material-symbols-outlined text-[16px] mr-1">{showHint ? 'visibility_off' : 'lightbulb'}</span>
                    {showHint ? 'Hide Hint' : 'Coaching Hint'}
                  </button>
                  <button onClick={() => setShowAnswer(!showAnswer)} className="btn-secondary text-xs">
                    <span className="material-symbols-outlined text-[16px] mr-1">{showAnswer ? 'visibility_off' : 'key'}</span>
                    {showAnswer ? 'Hide Sample' : 'Sample Answer'}
                  </button>
                  {currentQuestion.guidance?.tips?.length > 0 && (
                    <button onClick={() => setShowTips(!showTips)} className="btn-secondary text-xs">
                      <span className="material-symbols-outlined text-[16px] mr-1">{showTips ? 'visibility_off' : 'checklist'}</span>
                      {showTips ? 'Hide Framework' : 'Answer Framework'}
                    </button>
                  )}
                </div>
              </div>

              {/* Coaching Drawers */}
              <AnimatePresence>
                {showHint && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                    <div className="glass-panel-subtle p-6 border-l-2 border-l-blue-400">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">Direction</span>
                      <p className="text-sm text-muted">{currentQuestion.guidance?.direction || 'Focus on clarity and structure in your response.'}</p>
                    </div>
                  </motion.div>
                )}
                {showAnswer && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                    <div className="glass-panel-subtle p-6 border-l-2 border-l-green-400">
                      <span className="text-xs font-bold text-green-400 uppercase tracking-widest block mb-2">Sample</span>
                      <p className="text-sm text-muted">{currentQuestion.guidance?.answer || 'Provide a relevant example from your experience.'}</p>
                    </div>
                  </motion.div>
                )}
                {showTips && currentQuestion.guidance?.tips?.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                    <div className="glass-panel-subtle p-6 border-l-2 border-l-amber-400">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-3">Key Points</span>
                      <ul className="space-y-2">
                        {currentQuestion.guidance.tips.map((tip, idx) => (
                          <li key={idx} className="flex text-sm text-muted">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5 mr-3"></span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-8 flex items-center justify-between">
                <span className="text-xs text-muted font-mono hidden sm:inline-block">Press [Ctrl + Enter] for next question</span>
                <button onClick={handleNextQuestion} disabled={loading} className="btn-primary ml-auto">
                  {sessionState.questionIndex + 1 >= TOTAL_INTERVIEW_QUESTIONS ? 'Finish Interview' : 'Next Question'}
                  <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                </button>
              </div>

            </motion.div>
          ) : isInterviewComplete ? (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-6xl text-green-400 mb-6">task_alt</span>
              <h2 className="text-3xl font-bold text-foreground mb-4">Session Complete</h2>
              <p className="text-muted mb-10 max-w-md mx-auto">
                You've successfully completed a full {TOTAL_INTERVIEW_QUESTIONS}-question battery across all stages. 
              </p>
              <button onClick={() => window.location.reload()} className="btn-primary">Return to Setup</button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GuidedMode;