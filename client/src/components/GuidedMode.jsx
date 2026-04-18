import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  AlertCircle, 
  Rocket, 
  Play, 
  Lightbulb, 
  Key, 
  CheckSquare, 
  ArrowRight,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

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
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-10 w-full"
        >
          <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-widest text-muted">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                {currentStageConfig?.label || 'Segment'}
              </span>
              <span>
                Prompt {displayIndex} <span className="opacity-40">/</span> {TOTAL_INTERVIEW_QUESTIONS}
              </span>
            </div>
            <span className="text-foreground">{completionPercent}%</span>
          </div>

          <div className="w-full h-1.5 bg-card rounded-full overflow-hidden border border-border shadow-inner">
            <motion.div 
              className="h-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ type: 'spring', damping: 20, stiffness: 50 }}
            />
          </div>

          <div className="flex mt-3 w-full gap-1">
            {stageSegments.map((seg) => {
              const widthPercent = (seg.questions / TOTAL_INTERVIEW_QUESTIONS) * 100;
              const isActive = currentQuestion.stage === seg.name;
              const isPassed = sessionState.questionIndex >= seg.start + seg.questions;
              return (
                <div key={seg.name} className="h-1 rounded-full transition-all duration-500 overflow-hidden bg-card border border-border/50" style={{ width: `${widthPercent}%` }}>
                  {isActive && <motion.div layoutId="active-stage" className="w-full h-full bg-primary" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} />}
                  {isPassed && <div className="w-full h-full bg-muted/30" />}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {loading && !currentQuestion ? (
            <motion.div 
              key="loading" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.05 }} 
              className="text-center py-24 glass-panel flex flex-col items-center justify-center relative overflow-hidden group"
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/10">
                <motion.div 
                  initial={{ x: '-100%' }} 
                  animate={{ x: '100%' }} 
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} 
                  className="h-full w-1/3 bg-primary shadow-[0_0_20px_var(--color-primary)]" 
                />
              </div>
              <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mb-8 shadow-inner group-hover:border-primary/30 transition-colors">
                <img src="/Logo.png" alt="Logo" className="w-10 h-10 object-contain animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">Synthesizing Logic</h3>
              <p className="text-muted text-sm px-8 max-w-sm leading-relaxed">Analyzing your previous trajectory to formulate a high-impact follow-up segment.</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="glass-panel border-l-4 border-l-red-500 p-8 shadow-xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-black text-red-500 uppercase tracking-widest text-[10px]">Synthesis Interrupted</p>
                  <p className="text-muted text-sm">{error}</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchNextQuestion} 
                className="btn-secondary w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </motion.button>
            </motion.div>
          ) : !currentQuestion && !isInterviewComplete ? (
            <motion.div 
              key="empty" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="glass-panel p-16 text-center flex flex-col items-center shadow-2xl"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center justify-center mb-10 shadow-inner">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-4xl font-black text-foreground mb-4 tracking-tighter">Session Initialized</h3>
              <p className="text-muted mb-12 max-w-sm text-lg leading-relaxed">
                Hardware layers verified. Press initialize to begin your structured interview battery.
              </p>
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchNextQuestion} 
                className="btn-primary py-5 px-12 rounded-[1.25rem] shadow-2xl shadow-primary/30 group text-lg font-bold"
              >
                Start Session
                <Play className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </motion.div>
          ) : currentQuestion && !isInterviewComplete ? (
            <motion.div 
              key={`question-${currentQuestion.question.index}`} 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              className="flex flex-col h-full"
            >
              
              <div className="glass-panel p-10 sm:p-14 mb-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                  <MessageSquare className="w-48 h-48" />
                </div>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 block">Interview Module / Stage {currentQuestion.stage}</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight tracking-tight mb-12">{currentQuestion.question.text}</h2>
                
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: 'hint', state: showHint, set: setShowHint, icon: Lightbulb, label: 'Coach Hint', color: 'blue' },
                    { id: 'answer', state: showAnswer, set: setShowAnswer, icon: Key, label: 'Sample Logic', color: 'emerald' },
                    { id: 'tips', state: showTips, set: setShowTips, icon: CheckSquare, label: 'Framework', color: 'amber', condition: currentQuestion.guidance?.tips?.length > 0 }
                  ].filter(t => t.condition !== false).map((tool) => (
                    <motion.button
                      key={tool.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => tool.set(!tool.state)}
                      className={`flex items-center gap-2.5 px-6 py-3 rounded-xl border-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                        tool.state 
                          ? `bg-${tool.color}-500/10 border-${tool.color}-500/40 text-${tool.color}-500 shadow-lg shadow-${tool.color}-500/10` 
                          : 'bg-card border-border/50 text-muted hover:border-muted hover:text-foreground'
                      }`}
                    >
                      <tool.icon className="w-4 h-4" />
                      {tool.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Coaching Drawers */}
              <div className="space-y-4 mb-8">
                <AnimatePresence>
                  {showHint && (
                    <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="overflow-hidden">
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-8 border-l-4 border-l-blue-500 shadow-sm shadow-blue-500/5">
                        <div className="flex items-center gap-2 mb-4">
                          <Lightbulb className="w-4 h-4 text-blue-500" />
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Thought Guidance</span>
                        </div>
                        <p className="text-base text-foreground/80 leading-relaxed font-medium">{currentQuestion.guidance?.direction || 'Synthesizing directional hint...'}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {showAnswer && (
                    <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="overflow-hidden">
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 border-l-4 border-l-emerald-500 shadow-sm shadow-emerald-500/5">
                        <div className="flex items-center gap-2 mb-4">
                          <Key className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sample Logic Path</span>
                        </div>
                        <p className="text-base text-foreground/80 leading-relaxed font-medium italic">"{currentQuestion.guidance?.answer || 'Synthesizing sample response...'}"</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {showTips && currentQuestion.guidance?.tips?.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="overflow-hidden">
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-8 border-l-4 border-l-amber-500 shadow-sm shadow-amber-500/5">
                        <div className="flex items-center gap-2 mb-5">
                          <CheckSquare className="w-4 h-4 text-amber-500" />
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Structural Pillar Framework</span>
                        </div>
                        <ul className="space-y-4">
                          {currentQuestion.guidance.tips.map((tip, idx) => (
                            <motion.li 
                              key={idx} 
                              initial={{ opacity: 0, x: -10 }} 
                              animate={{ opacity: 1, x: 0 }} 
                              transition={{ delay: idx * 0.1 }}
                              className="flex gap-4 text-sm text-foreground/80 font-medium"
                            >
                              <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              </div>
                              {tip}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-auto pt-8 flex items-center justify-between gap-6 border-t border-border">
                <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] hidden sm:block">Hardware Verified / [CTRL + ENTER] TO PROCEED</span>
                <motion.button 
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextQuestion} 
                  disabled={loading} 
                  className="btn-primary py-4 px-10 rounded-2xl group shadow-xl shadow-primary/20 ml-auto flex items-center gap-3 font-bold"
                >
                  {displayIndex >= TOTAL_INTERVIEW_QUESTIONS ? 'Finalize Analysis' : 'Next Segment'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </div>

            </motion.div>
          ) : isInterviewComplete ? (
            <motion.div 
              key="complete" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="glass-panel p-16 text-center flex flex-col items-center shadow-2xl"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-10 shadow-inner">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-4xl font-black text-foreground mb-4 tracking-tighter">Session Concluded</h2>
              <p className="text-muted mb-12 max-w-md mx-auto text-lg leading-relaxed">
                Synthesis complete. All hardware layers have finalized their analysis. Please return to the dashboard for clinical feedback.
              </p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()} 
                className="btn-primary py-5 px-12 rounded-[1.25rem] text-lg font-bold"
              >
                Reset Environment
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GuidedMode;