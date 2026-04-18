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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 w-full max-w-6xl mx-auto py-8">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground tracking-tight hidden sm:block">Interview Session</h1>
          {currentStageConf && (
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${currentStageConf.bg} ${currentStageConf.color}`}>
              {currentStageConf.label}
            </span>
          )}
          <span className="text-sm font-medium text-muted border-l border-border pl-4">
            {sessionState.questionIndex + 1} of {TOTAL_INTERVIEW_QUESTIONS}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 bg-card border border-border rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${completionPercent}%` }} />
          </div>
          <span className="text-xs font-bold text-foreground">{completionPercent}%</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-red-500 font-medium">{error}</p>
        </div>
      )}

      {loading && (
        <div className="glass-panel p-12 text-center flex flex-col items-center mb-6 relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20">
            <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="h-full w-48 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>
          <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-6 shadow-inner">
            <img src="/Logo.png" alt="Logo" className="w-8 h-8 object-contain animate-pulse" />
          </div>
          <p className="text-foreground font-bold tracking-tight mb-1">Synthesizing Prompt...</p>
          <p className="text-muted text-xs">Calibrating interview stages based on your profile.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Question & Prompt (Spans 7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {currentQuestion && (
            <div className="glass-panel p-8">
              <span className="inline-block px-2 py-1 rounded bg-card-hover border border-border text-[10px] font-bold text-muted tracking-widest uppercase mb-4">Prompt</span>
              <h2 className="text-2xl font-semibold text-foreground leading-snug">{currentQuestion.question.text}</h2>
            </div>
          )}

          <div className="glass-panel p-8 flex-1 flex flex-col min-h-[250px]">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
              <span className="text-xs font-bold text-muted uppercase tracking-widest">Your Answer</span>
              {isRecording && (
                <div className="flex items-center gap-4">
                  <Waveform />
                  <span className="text-xs font-mono text-red-500 tabular-nums font-bold tracking-widest">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 pb-4">
              {transcript ? (
                <p className="text-base text-foreground/80 leading-relaxed font-medium">{transcript}</p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center pt-8">
                  <MicOff className="w-10 h-10 text-border mb-2" />
                  <p className="text-sm text-muted font-medium">Ready for your answer.</p>
                </div>
              )}
            </div>

            <button
              onClick={handleAction}
              disabled={analyzing || loading || !currentQuestion}
              className={`mt-4 w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                analyzing ? 'bg-card text-muted cursor-not-allowed' : 
                isRecording ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 
                'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25'
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing logic...
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  Finish & Submit
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Start Speaking
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Camera & Feedback (Spans 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="rounded-xl overflow-hidden bg-card border border-border aspect-video relative shadow-lg">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-500/90 text-white px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-md shadow-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                Live Rec
              </div>
            )}
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="glass-panel flex-1 flex flex-col overflow-hidden max-h-[600px] shadow-2xl relative">
                <div className="absolute top-0 inset-x-0 h-1" style={{ background: getScoreBand(feedback.score).color }}></div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  
                  <div className="flex flex-col items-center mb-6">
                    <ScoreRing score={feedback.score} size={80} />
                    <span className="mt-2 text-xs font-bold uppercase tracking-widest" style={{ color: getScoreBand(feedback.score).color }}>
                      {getScoreBand(feedback.score).label}
                    </span>
                  </div>

                  {feedback.breakdown && (
                    <div className="space-y-4 mb-8">
                      {Object.entries(feedback.breakdown).map(([k, v]) => (
                        <div key={k}>
                          <div className="flex justify-between text-xs font-medium mb-1.5">
                            <span className="text-muted capitalize">{k.replace('_', ' ')}</span>
                            <span className="text-foreground">{v}<span className="text-muted/50">/20</span></span>
                          </div>
                          <div className="h-1.5 bg-card-hover rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} animate={{ width: `${(v/20)*100}%` }} transition={{ duration: 0.8 }}
                              className="h-full rounded-full" style={{ background: getScoreBand(feedback.score).color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {feedback.aiData?.strengths?.length > 0 && (
                    <div className="mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3 block">Positives</span>
                      <ul className="space-y-2">
                        {feedback.aiData.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.aiData?.improvements?.length > 0 && (
                    <div className="mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-3 block">To Refine</span>
                      <ul className="space-y-2">
                        {feedback.aiData.improvements.map((s, i) => (
                          <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                            <RotateCcw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.improvement_tip && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Key Takeaway</span>
                      <p className="text-sm text-foreground/90 font-medium">{feedback.improvement_tip}</p>
                    </div>
                  )}

                  <button onClick={handleNextQuestion} className="w-full btn-secondary py-3 flex items-center justify-center gap-2">
                    {sessionState.questionIndex + 1 >= TOTAL_INTERVIEW_QUESTIONS ? 'Finish Interview' : 'Continue to Next'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  
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