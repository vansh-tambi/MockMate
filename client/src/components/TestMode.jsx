import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Score band semantics
const getScoreBand = (score) => {
  if (score <= 30) return { 
    label: "❌ INCORRECT", 
    color: "text-red-500", 
    bg: "bg-red-500/10", 
    border: "border-red-500",
    description: "Fundamentally incorrect. Review basics before retrying." 
  };
  if (score <= 50) return { 
    label: "⚠️ SURFACE LEVEL", 
    color: "text-orange-500", 
    bg: "bg-orange-500/10", 
    border: "border-orange-500",
    description: "Some understanding but significant gaps. Study deeper." 
  };
  if (score <= 70) return { 
    label: "✓ ACCEPTABLE", 
    color: "text-yellow-400", 
    bg: "bg-yellow-500/10", 
    border: "border-yellow-500",
    description: "Meets interview bar. Solid answer with room to improve." 
  };
  if (score <= 85) return { 
    label: "✓✓ STRONG", 
    color: "text-green-500", 
    bg: "bg-green-500/10", 
    border: "border-green-500",
    description: "Better than most candidates. Demonstrates solid expertise." 
  };
  return { 
    label: "✓✓✓ EXCEPTIONAL", 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/10", 
    border: "border-emerald-500",
    description: "Exceptional mastery. Hire-this-person-now level." 
  };
};

const TestMode = ({ userData, sessionState, setSessionState }) => {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const transcriptRef = useRef('');
  const pendingSubmitRef = useRef(false);
  const currentQuestionRef = useRef('');

  const TOTAL_INTERVIEW_QUESTIONS = 22;

  // Fetch question from staged progression system (same as GuidedMode)
  const fetchCurrentQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    setFeedback(null);
    
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      
      const askedQuestions = sessionState.askedQuestions || [];
      
      console.log('📤 Fetching question', sessionState.questionIndex, 'of', TOTAL_INTERVIEW_QUESTIONS);
      
      const res = await fetch(`${API_BASE}/api/generate-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: userData?.resumeText?.slice(0, 3000) || '',
          jobDescription: userData?.jobDescription || '',
          questionIndex: sessionState.questionIndex,
          askedQuestions: askedQuestions
        }),
        signal: controller.signal
      });
      
      clearTimeout(timer);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(`Server error: ${res.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await res.json();
      
      if (!data.success || !data.question) {
        throw new Error('Invalid response format from server');
      }
      
      console.log('✅ Question received:', data.question.stage, '- Q' + (data.question.index + 1));
      
      setCurrentQuestion(data);
      currentQuestionRef.current = data.question.text;
      
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
        const updatedAsked = nextAsked.includes(data.question.text)
          ? nextAsked
          : [...nextAsked, data.question.text];

        return {
          ...prev,
          currentStage: data.stage,
          stageProgress: data.stageProgress,
          askedQuestions: updatedAsked,
          questionSequence: nextSequence,
          currentQuestionCache: data
        };
      });
      setError(null);
      
    } catch (err) {
      console.error('❌ Error fetching question:', err);
      const isAbort = err?.name === 'AbortError';
      setError(isAbort ? 'Request timed out. Please try again.' : err.message);
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, userData, sessionState.questionIndex, sessionState.askedQuestions]);

  // Fetch question when component mounts or when questionIndex changes
  useEffect(() => {
    const cachedCurrent = sessionState.currentQuestionCache;
    if (cachedCurrent && cachedCurrent.question && cachedCurrent.question.index === sessionState.questionIndex) {
      setCurrentQuestion(cachedCurrent);
      currentQuestionRef.current = cachedCurrent.question.text;
      setLoading(false);
      setError(null);
      return;
    }

    const cached = (sessionState.questionSequence || []).find(
      q => q.index === sessionState.questionIndex
    );

    if (cached) {
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
      currentQuestionRef.current = cached.text;
      setLoading(false);
      setError(null);
      return;
    }

    if (userData?.resumeText && sessionState.questionIndex < TOTAL_INTERVIEW_QUESTIONS) {
      fetchCurrentQuestion();
    }
  }, [sessionState.questionIndex]);

  // Initialize camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => {
        console.error('Camera/mic error:', err);
        setError('Unable to access camera/microphone. Please check permissions.');
      });
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onstart = () => {
          console.log('✓ Speech recognition started');
        };
        
        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              transcriptRef.current += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          setTranscript(transcriptRef.current + interimTranscript);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
            setError(`Microphone error: ${event.error}. Please allow mic access.`);
          }
        };
        
        recognitionRef.current.onend = () => {
          console.log('✓ Speech recognition ended');
          if (pendingSubmitRef.current) {
            pendingSubmitRef.current = false;
            submitAnswer();
          }
        };
      }
    }
  }, []);

  // Submit answer with evaluation
  const submitAnswer = useCallback(async () => {
    if (!currentQuestionRef.current || !transcriptRef.current.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }

    const captured = transcriptRef.current.trim();
    setAnalyzing(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(`${API_BASE}/api/evaluate-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestionRef.current,
          userAnswer: captured
        }),
        signal: controller.signal
      });
      
      clearTimeout(timer);
      const data = await res.json();
      setFeedback(data);
      
      // Save answer to sessionState
      setSessionState(prev => ({
        ...prev,
        answers: [
          ...(prev.answers || []),
          {
            questionIndex: sessionState.questionIndex,
            question: currentQuestionRef.current,
            answer: captured,
            feedback: data
          }
        ]
      }));
      
    } catch (err) {
      console.error('Evaluation error:', err);
      const isAbort = err?.name === 'AbortError';
      setFeedback({
        rating: 'Yellow',
        score: 50,
        justification: isAbort ? 'Request timed out.' : 'Error evaluating.',
        breakdown: { relevance: 10, clarity: 10, structure: 10, technical_depth: 10, impact: 10 },
        improvement_tip: 'Try again'
      });
    } finally {
      setAnalyzing(false);
    }
  }, [API_BASE, sessionState.questionIndex, setSessionState]);

  const handleAction = async () => {
    if (isRecording) {
      // Stop recording and submit the captured transcript
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore stop errors
      }
      setIsRecording(false);
      pendingSubmitRef.current = true;
      setAnalyzing(true);
    } else {
      // Start recording
      setTranscript('');
      transcriptRef.current = '';
      setFeedback(null);
      setError(null);
      if (!recognitionRef.current) {
        setError('Speech recognition not supported in this browser. Please use Chrome on desktop.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.warn('Failed to start recognition:', e);
        setError('Unable to start microphone. Please allow mic access and try again.');
      }
    }
  };

  const handleNextQuestion = () => {
    // Move to next question
    if (sessionState.questionIndex < TOTAL_INTERVIEW_QUESTIONS - 1) {
      setSessionState(prev => ({
        ...prev,
        questionIndex: prev.questionIndex + 1
      }));
      setTranscript('');
      transcriptRef.current = '';
      setFeedback(null);
      setError(null);
    } else {
      // Completed all questions
      if (window.confirm('🎉 You\'ve completed all 22 questions! View your results?')) {
        // Could show results screen here
        setSessionState(prev => ({
          ...prev,
          interviewComplete: true
        }));
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="pt-24 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-4rem)] pb-8"
    >
      
      {/* LEFT: HUD Interface */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col gap-6"
      >
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
            className="p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 text-center"
          >
            Loading question {sessionState.questionIndex + 1} of {TOTAL_INTERVIEW_QUESTIONS}...
          </motion.div>
        )}

        <motion.div 
          className="relative grow bg-black rounded-3xl overflow-hidden border border-gray-800 shadow-2xl"
          whileHover={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}
          transition={{ duration: 0.3 }}
        >
          <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1] opacity-80" />
          
          {/* Overlay UI */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute top-0 left-0 right-0 p-6 bg-linear-to-b from-black/80 to-transparent"
          >
            <motion.span 
              className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold uppercase"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Question {sessionState.questionIndex + 1} / {TOTAL_INTERVIEW_QUESTIONS}
            </motion.span>
            
            {currentQuestion && (
              <>
                <h2 className="text-xl text-white font-medium mt-2 shadow-black drop-shadow-md line-clamp-3">
                  {currentQuestion.question.text}
                </h2>
                <div className="text-xs text-gray-400 mt-2">
                  Stage: {currentQuestion.stage.replace(/_/g, ' ').toUpperCase()}
                </div>
              </>
            )}
            
            {loading && (
              <h2 className="text-xl text-cyan-400 font-medium mt-2 shadow-black drop-shadow-md">
                Loading question...
              </h2>
            )}
          </motion.div>

          {/* Feedback Modal (Transcript + Evaluation side-by-side) */}
          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 z-20 overflow-y-auto"
              >
                {/* Left: Transcript */}
                <div className="flex flex-col">
                  <h3 className="text-white text-xl font-semibold mb-3">Your Transcript</h3>
                  <div className="bg-white/5 border border-gray-800 rounded-xl p-4 text-left overflow-auto max-h-64">
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{transcript || 'No speech captured.'}</p>
                  </div>
                  <div className="mt-6">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNextQuestion}
                      className="py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors w-full"
                    >
                      {sessionState.questionIndex + 1 >= TOTAL_INTERVIEW_QUESTIONS ? 'View Results 📊' : 'Next Question →'}
                    </motion.button>
                  </div>
                  
                  {/* Breakdown Bars - Legacy format */}
                  {feedback.breakdown && (
                    <div className="grid grid-cols-1 gap-2 w-full mt-6">
                      {Object.entries(feedback.breakdown).map(([k,v], idx) => (
                        <motion.div 
                          key={k}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                          className="text-left"
                        >
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span className="capitalize">{k.replace('_',' ')}</span>
                            <span>{v}/20</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(v/20)*100}%` }}
                              transition={{ delay: 0.15 + idx * 0.05, duration: 0.6 }}
                              className={`h-full ${feedback.rating==='Green' ? 'bg-green-500' : feedback.rating==='Yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Evaluation */}
                <div className="flex flex-col text-center overflow-y-auto max-h-full pr-2 custom-scrollbar">
                  {/* Score band label */}
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, type: 'spring' }}
                    className={`text-2xl font-bold mb-2 ${getScoreBand(feedback.score).color}`}
                  >
                    {getScoreBand(feedback.score).label}
                  </motion.div>
                  
                  {/* Score number */}
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                    className="text-6xl font-bold mb-2"
                  >
                    <span className={getScoreBand(feedback.score).color}>
                      {feedback.score}/100
                    </span>
                  </motion.div>
                  
                  {/* Score band description */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-xs text-gray-400 mb-6 px-4"
                  >
                    {getScoreBand(feedback.score).description}
                  </motion.div>

                  {/* AI Service Structured Feedback (if available) */}
                  {feedback.aiData?.strengths?.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      whileHover={{ x: 4, backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
                      className="bg-green-500/10 p-4 rounded-xl text-left border-l-4 border-green-500 mb-4 w-full cursor-pointer transition-colors"
                    >
                      <p className="text-xs text-green-400 font-bold uppercase mb-2">💪 Strengths</p>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {feedback.aiData.strengths.map((strength, idx) => (
                          <motion.li 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + idx * 0.05 }}
                            className="flex items-start"
                          >
                            <span className="text-green-400 mr-2">✓</span>
                            <span>{strength}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {feedback.aiData?.improvements?.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      whileHover={{ x: 4, backgroundColor: 'rgba(234, 179, 8, 0.15)' }}
                      className="bg-yellow-500/10 p-4 rounded-xl text-left border-l-4 border-yellow-500 mb-4 w-full cursor-pointer transition-colors"
                    >
                      <p className="text-xs text-yellow-400 font-bold uppercase mb-2">📈 Areas to Improve</p>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {feedback.aiData.improvements.map((improvement, idx) => (
                          <motion.li 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + idx * 0.05 }}
                            className="flex items-start"
                          >
                            <span className="text-yellow-400 mr-2">→</span>
                            <span>{improvement}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* Legacy justification (fallback if no AI data) */}
                  {feedback.justification && !feedback.aiData?.strengths && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-300 mb-6 text-sm px-4"
                    >
                      {feedback.justification}
                    </motion.p>
                  )}

                  {/* Improvement tip */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-blue-500/10 p-4 rounded-xl text-left border-l-4 border-blue-500 w-full"
                  >
                    <p className="text-xs text-blue-400 font-bold uppercase">💡 Next Step</p>
                    <p className="text-sm text-gray-300">{feedback.improvement_tip}</p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onClick={handleAction} 
          disabled={analyzing || loading || !currentQuestion}
          className={`w-full py-5 rounded-2xl font-bold text-xl transition-all shadow-lg
            ${isRecording ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-linear-to-r from-blue-600 to-cyan-600 text-white hover:shadow-cyan-500/40 disabled:opacity-50'}`}
        >
          {analyzing ? (
            <motion.span 
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Analyzing...
            </motion.span>
          ) : isRecording ? (
            <>
              <motion.span 
                className="inline-block mr-2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🔴
              </motion.span>
              Submit Answer
            </>
          ) : (
            'Start Answer 🎤'
          )}
        </motion.button>
      </motion.div>

      {/* RIGHT: Terminal */}
      <motion.div 
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-black rounded-3xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-800 flex items-center gap-2">
          <motion.div 
            className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div 
            className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.div 
            className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
          <span className="ml-2 text-xs font-mono text-gray-500">LIVE_TRANSCRIPT</span>
        </div>
        <div className="grow p-6 font-mono text-sm overflow-y-auto">
          {transcript ? (
            <span className="text-cyan-400">
              <span className="text-gray-600 mr-2">$</span>
              {transcript}
              <motion.span 
                className="animate-pulse"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                _
              </motion.span>
            </span>
          ) : (
            <span className="text-gray-700">$ Ready for input...</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TestMode;