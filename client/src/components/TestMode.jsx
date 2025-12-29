import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const TestMode = ({ userData, qaPairs, setQaPairs }) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
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

  // Extract questions from qaPairs
  const questions = useMemo(() => qaPairs?.map(q => q.question) || [], [qaPairs]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentQIndex(0);
    setTranscript('');
    transcriptRef.current = '';
    setFeedback(null);
    try {
      const res = await fetch('http://localhost:5000/api/generate-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (data.qaPairs && data.qaPairs.length > 0) {
        setQaPairs(data.qaPairs);
        setError(null);
      } else {
        setError('Failed to generate questions');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [userData, setQaPairs]);

  useEffect(() => {
    // Only fetch if questions are not already loaded
    if (qaPairs.length === 0) {
      fetchQuestions();
    }
  }, [qaPairs.length, fetchQuestions]);

  // Keep a ref to the current question for evaluation callbacks
  useEffect(() => {
    currentQuestionRef.current = questions[currentQIndex] || '';
  }, [questions, currentQIndex]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => { if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(err => console.error('Camera/mic error:', err));
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new Speech();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (e) => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        }
        if (final) {
          setTranscript(p => {
            const next = p + final;
            transcriptRef.current = next;
            return next;
          });
        }
      };
      recognitionRef.current.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsRecording(false);
        setError('Microphone permission or speech recognition failed. Please try again.');
      };
      recognitionRef.current.onend = async () => {
        // Called when recognition stops (manually or due to silence)
        setIsRecording(false);
        if (!pendingSubmitRef.current) return;
        pendingSubmitRef.current = false;
        const captured = transcriptRef.current.trim();
        if (!captured) {
          setAnalyzing(false);
          setError('No speech captured. Please try again.');
          return;
        }
        try {
          const res = await fetch('http://localhost:5000/api/evaluate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: currentQuestionRef.current,
              userAnswer: captured
            })
          });
          const data = await res.json();
          setFeedback(data);
        } catch (err) {
          console.error('Evaluation error:', err);
          setFeedback({ rating: 'Yellow', score: 50, justification: 'Error evaluating.', breakdown: { relevance: 10, clarity: 10, structure: 10, technical_depth: 10, impact: 10 }, improvement_tip: 'Try again' });
        } finally {
          setAnalyzing(false);
        }
      };
    }
  }, []);

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
    setFeedback(null);
    setTranscript('');
    setError(null);
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(i => i + 1);
    } else {
      // Ask if want to refresh for new batch
      if (window.confirm('You\'ve answered all questions! Generate a new batch?')) {
        fetchQuestions();
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
            Generating questions...
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
              Question {currentQIndex + 1} / {questions.length}
            </motion.span>
            <h2 className="text-xl text-white font-medium mt-2 shadow-black drop-shadow-md line-clamp-3">
              {loading ? 'Loading questions...' : questions[currentQIndex] || 'Initializing AI...'}
            </h2>
          </motion.div>

          {/* Feedback Modal (Transcript + Evaluation side-by-side) */}
          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 z-20"
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
                      {currentQIndex >= questions.length - 1 ? 'New Batch ↻' : 'Next Question →'}
                    </motion.button>
                  </div>
                </div>

                {/* Right: Evaluation */}
                <div className="flex flex-col items-center text-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                    className="text-5xl font-bold mb-4"
                  >
                    <span className={feedback.rating === 'Green' ? 'text-green-400' : feedback.rating === 'Yellow' ? 'text-yellow-400' : 'text-red-400'}>
                      {feedback.score}/100
                    </span>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`text-lg font-bold mb-4 ${feedback.rating === 'Green' ? 'text-green-400' : feedback.rating === 'Yellow' ? 'text-yellow-400' : 'text-red-400'}`}
                  >
                    {feedback.rating} Signal
                  </motion.div>
                  {feedback.justification && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-300 mb-6 text-sm"
                    >
                      {feedback.justification}
                    </motion.p>
                  )}
                  {/* Breakdown Bars */}
                  {feedback.breakdown && (
                    <div className="grid grid-cols-1 gap-2 w-full max-w-md mb-6">
                      {Object.entries(feedback.breakdown).map(([k,v]) => (
                        <div key={k} className="text-left">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span className="capitalize">{k.replace('_',' ')}</span>
                            <span>{v}/20</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full ${feedback.rating==='Green' ? 'bg-green-500' : feedback.rating==='Yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(v/20)*100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/5 p-4 rounded-xl text-left border-l-4 border-blue-500 mb-2 w-full max-w-md"
                  >
                    <p className="text-xs text-blue-400 font-bold uppercase">Tip</p>
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
          disabled={analyzing || loading || !questions.length}
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