import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Score bands
const getScoreBand = (score) => {
  if (score <= 30) return { label: 'Needs Work', color: '#ef4444', bg: 'var(--error-bg)' };
  if (score <= 50) return { label: 'Surface Level', color: '#f59e0b', bg: 'var(--warning-bg)' };
  if (score <= 70) return { label: 'Acceptable', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
  if (score <= 85) return { label: 'Strong', color: '#10b981', bg: 'var(--success-bg)' };
  return { label: 'Exceptional', color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' };
};

// Score Ring SVG Component
const ScoreRing = ({ score, size = 100 }) => {
  const band = getScoreBand(score);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="mm-score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="mm-score-ring-bg" cx={size/2} cy={size/2} r={radius} />
        <motion.circle
          className="mm-score-ring-fill"
          cx={size/2} cy={size/2} r={radius}
          stroke={band.color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: band.color }}>{score}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/100</span>
      </div>
    </div>
  );
};

// Waveform Component
const Waveform = () => (
  <div className="mm-waveform">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="mm-waveform-bar" />
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
    introduction: { label: 'Introduction', color: '#f59e0b' },
    warmup: { label: 'Warm-up', color: '#f97316' },
    resume_based: { label: 'Resume & Skills', color: '#3b82f6' },
    technical: { label: 'Technical', color: '#8b5cf6' },
    behavioral: { label: 'Behavioral', color: '#ec4899' },
    real_world: { label: 'Real-World', color: '#10b981' },
    hr_closing: { label: 'HR & Closing', color: '#ef4444' },
  };

  // Fetch current question
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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(`Server error: ${res.status} - ${errorData.error || 'Unknown'}`);
      }

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

  // Load question on index change
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

  // Camera
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

  // Speech recognition
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

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  // Submit answer
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
        improvement_tip: 'Try again'
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 max-w-5xl mx-auto min-h-[calc(100vh-4rem)] pb-12 px-6"
    >
      {/* Header: Stage + Progress */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {currentStageConf && (
            <span
              className="mm-badge"
              style={{
                background: `${currentStageConf.color}15`,
                color: currentStageConf.color,
              }}
            >
              {currentStageConf.label}
            </span>
          )}
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {sessionState.questionIndex + 1} / {TOTAL_INTERVIEW_QUESTIONS}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="mm-progress w-32" style={{ height: '4px' }}>
            <div className="mm-progress-fill" style={{ width: `${completionPercent}%` }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{completionPercent}%</span>
        </div>
      </div>

      {error && (
        <div className="mm-card p-4 mb-4" style={{ borderLeft: '3px solid var(--error)' }}>
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="mm-card p-6 mb-4 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full mx-auto mb-3"
            style={{ border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading question...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: Question + Transcript + Controls (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Question Card */}
          {currentQuestion && (
            <div className="mm-card p-8">
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                Question {sessionState.questionIndex + 1}
              </p>
              <h2 className="text-xl font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {currentQuestion.question.text}
              </h2>
            </div>
          )}

          {/* Transcript Area */}
          <div className="mm-card p-8 min-h-[200px] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Your Response
                </span>
                {isRecording && <Waveform />}
              </div>
              {isRecording && (
                <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--error)' }}>
                  ● {formatTime(recordingTime)}
                </span>
              )}
            </div>
            <div className="flex-1">
              {transcript ? (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {transcript}
                </p>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {isRecording ? 'Listening...' : 'Press the button below to start speaking your answer.'}
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleAction}
            disabled={analyzing || loading || !currentQuestion}
            className={`w-full py-5 rounded-xl font-semibold text-base transition-all ${
              isRecording ? 'mm-recording-pulse' : ''
            }`}
            style={{
              background: analyzing ? 'var(--bg-elevated)' : isRecording ? 'var(--error-bg)' : 'var(--accent)',
              color: analyzing ? 'var(--text-muted)' : isRecording ? 'var(--error)' : 'white',
              border: isRecording ? '1px solid var(--error)' : '1px solid transparent',
              opacity: (analyzing || loading || !currentQuestion) ? 0.5 : 1,
              cursor: (analyzing || loading || !currentQuestion) ? 'not-allowed' : 'pointer',
            }}
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 rounded-full"
                  style={{ borderColor: 'var(--border)', borderTopColor: 'var(--text-muted)' }}
                />
                Analyzing your answer...
              </span>
            ) : isRecording ? (
              'Stop & Submit Answer'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="currentColor"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Start Recording
              </span>
            )}
          </motion.button>
        </div>

        {/* RIGHT: Camera + Feedback Panel (1/3 width) */}
        <div className="flex flex-col gap-6">

          {/* Camera PIP */}
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', aspectRatio: '4/3' }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {isRecording && (
              <div className="absolute top-3 left-3">
                <span
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold"
                  style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white' }}
                >
                  ● LIVE
                </span>
              </div>
            )}
          </div>

          {/* Feedback Panel */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="mm-card p-8 custom-scrollbar overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 420px)' }}
              >
                {/* Score */}
                <div className="flex flex-col items-center mb-6">
                  <ScoreRing score={feedback.score} size={90} />
                  <p
                    className="text-xs font-semibold mt-2"
                    style={{ color: getScoreBand(feedback.score).color }}
                  >
                    {getScoreBand(feedback.score).label}
                  </p>
                </div>

                {/* Breakdown Bars */}
                {feedback.breakdown && (
                  <div className="space-y-3 mb-6">
                    {Object.entries(feedback.breakdown).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{k.replace('_', ' ')}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{v}/20</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(v / 20) * 100}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="h-full rounded-full"
                            style={{ background: getScoreBand(feedback.score).color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths */}
                {feedback.aiData?.strengths?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--success)' }}>
                      Strengths
                    </p>
                    <ul className="space-y-1">
                      {feedback.aiData.strengths.map((s, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--success)' }}>✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {feedback.aiData?.improvements?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--warning)' }}>
                      Improve
                    </p>
                    <ul className="space-y-1">
                      {feedback.aiData.improvements.map((s, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--warning)' }}>→</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Justification fallback */}
                {feedback.justification && !feedback.aiData?.strengths && (
                  <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {feedback.justification}
                  </p>
                )}

                {/* Improvement tip */}
                {feedback.improvement_tip && (
                  <div
                    className="p-4 rounded-lg mb-6"
                    style={{ background: 'var(--info-bg)', borderLeft: '2px solid var(--info)' }}
                  >
                    <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--info)' }}>Next Step</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{feedback.improvement_tip}</p>
                  </div>
                )}

                {/* Next Question */}
                <button
                  onClick={handleNextQuestion}
                  className="mm-btn mm-btn-primary w-full text-sm"
                >
                  {sessionState.questionIndex + 1 >= TOTAL_INTERVIEW_QUESTIONS ? 'View Results' : 'Next Question →'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default TestMode;