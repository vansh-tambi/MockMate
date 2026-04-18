import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Mic, 
  Square, 
  Check, 
  History, 
  RotateCcw, 
  ArrowRight,
  Loader2,
  MicOff,
  AlertCircle
} from 'lucide-react';

// Score bands
const getScoreBand = (score) => {
  if (score <= 30) return { label: 'Needs Work', color: '#ef4444', ringClass: 'stroke-red-500' };
  if (score <= 50) return { label: 'Surface Level', color: '#f59e0b', ringClass: 'stroke-amber-500' };
  if (score <= 70) return { label: 'Acceptable', color: '#eab308', ringClass: 'stroke-yellow-500' };
  if (score <= 85) return { label: 'Strong', color: '#10b981', ringClass: 'stroke-emerald-500' };
  return { label: 'Exceptional', color: '#34d399', ringClass: 'stroke-green-400' };
};

// Score Ring SVG Component
const ScoreRing = ({ score, size = 100 }) => {
  const band = getScoreBand(score);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle className="fill-none stroke-card-hover" strokeWidth="6" cx={size/2} cy={size/2} r={radius} />
        <motion.circle
          className={`fill-none stroke-current ${band.ringClass}`}
          strokeWidth="6"
          strokeLinecap="round"
          cx={size/2}
          cy={size/2}
          r={radius}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold`} style={{ color: band.color }}>{score}</span>
        <span className="text-[10px] text-muted">/100</span>
      </div>
    </div>
  );
};

// Waveform Component
const Waveform = () => (
  <div className="flex items-center gap-[3px] h-6">
    {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((delay, i) => (
      <motion.div 
        key={i} 
        className="w-[3px] bg-red-500 rounded-sm"
        animate={{ height: ["6px", "20px", "6px"], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.2, repeat: Infinity, delay, ease: "easeInOut" }}
      />
    ))}
  </div>
);

const TestMode = ({ userData, sessionState, setSessionState }) => {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const transcriptRef = useRef('');
  const pendingSubmitRef = useRef(false);
  const currentQuestionRef = useRef('');
  const recordingTimerRef = useRef(null);

  const TOTAL_INTERVIEW_QUESTIONS = 35;

  const stageConfig = {
    introduction: { label: 'Introduction', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    warmup: { label: 'Warm-up', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    resume_based: { label: 'Resume & Skills', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    technical: { label: 'Technical', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    behavioral: { label: 'Behavioral', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    real_world: { label: 'Real-World', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    hr_closing: { label: 'HR & Closing', color: 'text-red-500', bg: 'bg-red-500/10' },
  };

  const fetchCurrentQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    setFeedback(null);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      const askedQuestions = sessionState.askedQuestions || [];

      const res = await fetch(`${API_BASE}/api/generate-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: userData?.resumeText?.slice(0, 3000) || '',
          jobDescription: userData?.jobDescription || '',
          questionIndex: sessionState.questionIndex,
          askedQuestions
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.success || !data.question) throw new Error('Invalid response');

      setCurrentQuestion(data);
      currentQuestionRef.current = data.question.text;

      setSessionState(prev => {
        const prevSequence = prev.questionSequence || [];
        const alreadyCached = prevSequence.find(q => q.index === data.question.index);
        const nextSequence = alreadyCached ? prevSequence : [...prevSequence, {
          index: data.question.index, text: data.question.text,
          stage: data.stage, stageProgress: data.stageProgress
        }];
        const nextAsked = prev.askedQuestions || [];
        const updatedAsked = nextAsked.includes(data.question.text) ? nextAsked : [...nextAsked, data.question.text];
        return {
          ...prev, currentStage: data.stage, stageProgress: data.stageProgress,
          askedQuestions: updatedAsked, questionSequence: nextSequence, currentQuestionCache: data
        };
      });
    } catch (err) {
      setError(err?.name === 'AbortError' ? 'Request timed out.' : err.message);
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, userData, sessionState.questionIndex, sessionState.askedQuestions]);

  useEffect(() => {
    const cachedCurrent = sessionState.currentQuestionCache;
    if (cachedCurrent?.question?.index === sessionState.questionIndex) {
      setCurrentQuestion(cachedCurrent);
      currentQuestionRef.current = cachedCurrent.question.text;
      setLoading(false);
      return;
    }
    const cached = (sessionState.questionSequence || []).find(q => q.index === sessionState.questionIndex);
    if (cached) {
      setCurrentQuestion({
        success: true, stage: cached.stage,
        stageProgress: cached.stageProgress || sessionState.stageProgress,
        question: { text: cached.text, index: cached.index, stage: cached.stage }
      });
      currentQuestionRef.current = cached.text;
      return;
    }
    if (userData?.resumeText && sessionState.questionIndex < TOTAL_INTERVIEW_QUESTIONS) {
      fetchCurrentQuestion();
    }
  }, [sessionState.questionIndex]);

  useEffect(() => {
    let mediaStream = null;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        mediaStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Camera/mic access needed for interview mode.'));
    return () => {
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              transcriptRef.current += t + ' ';
            } else {
              interim += t;
            }
          }
          setTranscript(transcriptRef.current + interim);
        };

        recognitionRef.current.onerror = (event) => {
          if (event.error !== 'no-speech') {
            setError(`Mic error: ${event.error}`);
          }
        };

        recognitionRef.current.onend = () => {
          if (pendingSubmitRef.current) {
            pendingSubmitRef.current = false;
            submitAnswer();
          }
        };
      }
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      clearInterval(recordingTimerRef.current);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  const submitAnswer = useCallback(async () => {
    if (!currentQuestionRef.current || !transcriptRef.current.trim()) {
      setError('Please speak your answer before submitting.');
      return;
    }
    const captured = transcriptRef.current.trim();
    setAnalyzing(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      const res = await fetch(`${API_BASE}/api/evaluate-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestionRef.current, userAnswer: captured }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await res.json();
      setFeedback(data);

      setSessionState(prev => ({
        ...prev,
        answers: [...(prev.answers || []), {
          questionIndex: sessionState.questionIndex, question: currentQuestionRef.current,
          answer: captured, feedback: data
        }]
      }));
    } catch (err) {
      setFeedback({
        rating: 'Yellow', score: 50, justification: 'Evaluation unavailable.',
        breakdown: { relevance: 10, clarity: 10, structure: 10, technical_depth: 10, impact: 10 },
        improvement_tip: 'Try again.'
      });
    } finally {
      setAnalyzing(false);
    }
  }, [API_BASE, sessionState.questionIndex, setSessionState]);

  const handleAction = () => {
    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsRecording(false);
      pendingSubmitRef.current = true;
      setAnalyzing(true);
    } else {
      setTranscript('');
      transcriptRef.current = '';
      setFeedback(null);
      setError(null);
      if (!recognitionRef.current) {
        setError('Speech recognition not supported. Use Chrome on desktop.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setError('Unable to start microphone.');
      }
    }
  };

  const handleNextQuestion = () => {
    if (sessionState.questionIndex < TOTAL_INTERVIEW_QUESTIONS - 1) {
      setSessionState(prev => ({ ...prev, questionIndex: prev.questionIndex + 1 }));
      setTranscript('');
      transcriptRef.current = '';
      setFeedback(null);
      setError(null);
    } else {
      setSessionState(prev => ({ ...prev, interviewComplete: true }));
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const currentStageConf = currentQuestion ? stageConfig[currentQuestion.stage] : null;
  const completionPercent = Math.round((sessionState.questionIndex / TOTAL_INTERVIEW_QUESTIONS) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 w-full max-w-6xl mx-auto py-8 px-4 sm:px-6">
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row items-center justify-between mb-10 pb-6 border-b border-border gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-inner">
            <img src="/Logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <h1 className="text-xl font-black text-foreground tracking-tighter uppercase">Hardware Assessment</h1>
          {currentStageConf && (
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${currentStageConf.bg} ${currentStageConf.color} border border-current/10`}>
              {currentStageConf.label}
            </span>
          )}
          <span className="text-xs font-bold text-muted border-l border-border pl-4 tabular-nums">
            STG-{sessionState.questionIndex + 1} <span className="opacity-30">/</span> {TOTAL_INTERVIEW_QUESTIONS}
          </span>
        </div>
        <div className="flex items-center gap-4 bg-card/30 p-2 rounded-2xl border border-border/50">
          <div className="w-40 h-1.5 bg-background border border-border rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-primary" 
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ type: 'spring', damping: 20 }}
            />
          </div>
          <span className="text-[10px] font-black text-foreground tabular-nums">{completionPercent}%</span>
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-red-500/5 border border-red-500/20 p-5 mb-8 rounded-2xl flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-sm text-red-500 font-bold">{error}</p>
        </motion.div>
      )}

      {loading && !currentQuestion && (
        <div className="glass-panel p-16 text-center flex flex-col items-center mb-8 relative overflow-hidden group">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/10">
            <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="h-full w-1/3 bg-primary shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
          </div>
          <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center mb-8 shadow-inner group-hover:border-primary/30 transition-colors">
            <img src="/Logo.png" alt="Logo" className="w-10 h-10 object-contain animate-pulse" />
          </div>
          <p className="text-foreground font-black tracking-widest uppercase text-xs mb-2">Synchronizing Logic Layers</p>
          <p className="text-muted text-xs font-medium max-w-xs leading-relaxed opacity-70">Synthesizing the next challenge based on your current performance trajectory.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: Question & Prompt */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-8">
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div 
                key={currentQuestion.question.index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-10 sm:p-14 relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <BarChart3 className="w-40 h-40" />
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-sm" />
                  <span className="text-[10px] font-black text-muted tracking-[0.3em] uppercase">Tactical Objective</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-[1.15] tracking-tight">{currentQuestion.question.text}</h2>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="glass-panel p-10 flex-1 flex flex-col min-h-[350px] shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-card-hover border border-border shadow-inner">
                  <History className="w-4 h-4 text-muted" />
                </div>
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.25em]">Response Capture</span>
              </div>
              {isRecording && (
                <div className="flex items-center gap-6 bg-red-500/5 px-4 py-2 rounded-2xl border border-red-500/10">
                  <Waveform />
                  <span className="text-xs font-mono text-red-500 tabular-nums font-black tracking-[0.2em]">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 max-h-[350px] overflow-y-auto custom-scrollbar pr-4 pb-10">
              {transcript ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg text-foreground/80 leading-[1.6] font-medium selection:bg-primary/20">{transcript}</motion.p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 group cursor-default">
                  <motion.div 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                  >
                    <MicOff className="w-14 h-14 text-muted mb-4" />
                  </motion.div>
                  <p className="text-xs font-black uppercase tracking-widest">Interface Ready</p>
                </div>
              )}
            </div>

            <motion.button
              whileHover={!(analyzing || loading || !currentQuestion) ? { scale: 1.01, x: 2 } : {}}
              whileTap={!(analyzing || loading || !currentQuestion) ? { scale: 0.99 } : {}}
              onClick={handleAction}
              disabled={analyzing || loading || !currentQuestion}
              className={`mt-4 w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-xl shadow-primary/10 ${
                analyzing ? 'bg-card text-muted cursor-not-allowed border border-border/50' : 
                isRecording ? 'bg-red-500 shadow-red-500/20 text-white' : 
                'bg-primary text-white shadow-primary/25 hover:shadow-primary/40'
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Clinical Finalization...
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  Terminate & Synthesize
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Initialize Voice Unit
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* RIGHT COLUMN: Camera & Feedback */}
        <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-8">
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-[2.5rem] overflow-hidden bg-card border-4 border-card-hover aspect-video relative shadow-2xl group"
          >
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1] transition-transform duration-700 group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {isRecording && (
              <div className="absolute top-6 left-6 bg-red-500 shadow-lg shadow-red-500/40 text-white px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 backdrop-blur-md">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }} 
                  transition={{ repeat: Infinity, duration: 1 }} 
                  className="w-2 h-2 rounded-full bg-white shadow-sm" 
                />
                Live Assessment
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass-panel flex-1 flex flex-col overflow-hidden max-h-[680px] shadow-2xl relative"
              >
                <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: getScoreBand(feedback.score).color }}></div>
                <div className="p-10 overflow-y-auto custom-scrollbar">
                  
                  <div className="flex flex-col items-center mb-10">
                    <ScoreRing score={feedback.score} size={90} />
                    <span 
                      className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] inline-block px-4 py-1.5 rounded-full shadow-sm" 
                      style={{ color: getScoreBand(feedback.score).color, backgroundColor: `${getScoreBand(feedback.score).color}10` }}
                    >
                      {getScoreBand(feedback.score).label}
                    </span>
                  </div>

                  {feedback.breakdown && (
                    <div className="space-y-6 mb-12">
                      <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] block mb-2">Efficiency Vectors</span>
                      {Object.entries(feedback.breakdown).map(([k, v], i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + (i * 0.1) }}
                          key={k}
                        >
                          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-2">
                            <span className="text-muted/80">{k.replace('_', ' ')}</span>
                            <span className="text-foreground">{v}<span className="text-muted/40 font-medium">/20</span></span>
                          </div>
                          <div className="h-2 bg-background border border-border/50 rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }} animate={{ width: `${(v/20)*100}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                              className="h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]" style={{ background: getScoreBand(feedback.score).color }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-10 mb-12">
                    {feedback.aiData?.strengths?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-5 block border-b border-emerald-500/10 pb-2">Technical Wins</span>
                        <ul className="space-y-4">
                          {feedback.aiData.strengths.map((s, i) => (
                            <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + (i*0.05) }} key={i} className="text-sm text-foreground/80 flex items-start gap-4 font-medium leading-relaxed">
                              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              {s}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {feedback.aiData?.improvements?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-5 block border-b border-amber-500/10 pb-2">Growth Vectors</span>
                        <ul className="space-y-4">
                          {feedback.aiData.improvements.map((s, i) => (
                            <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + (i*0.05) }} key={i} className="text-sm text-foreground/80 flex items-start gap-4 font-medium leading-relaxed">
                              <RotateCcw className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                              {s}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {feedback.improvement_tip && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="bg-primary shadow-2xl shadow-primary/20 rounded-[1.25rem] p-6 mb-10 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Rocket className="w-12 h-12" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] block mb-3 opacity-70">Clinical Recommendation</span>
                      <p className="text-sm font-bold leading-relaxed">{feedback.improvement_tip}</p>
                    </motion.div>
                  )}

                  <motion.button 
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNextQuestion} 
                    className="w-full btn-primary py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20"
                  >
                    {sessionState.questionIndex + 1 >= TOTAL_INTERVIEW_QUESTIONS ? 'Submit Session Data' : 'Advance Next Segment'}
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                  
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
};

export default TestMode;