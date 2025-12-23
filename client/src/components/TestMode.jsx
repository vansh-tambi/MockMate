import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TestMode = ({ userData }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchQ = async () => {
      const res = await fetch('http://localhost:5000/api/generate-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      setQuestions(data.qaPairs?.map(q => q.question) || []);
    };
    fetchQ();
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => { if (videoRef.current) videoRef.current.srcObject = s; });
    
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
        setTranscript(p => p + final);
      };
    }
  }, []);

  const handleAction = async () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setAnalyzing(true);
      const res = await fetch('http://localhost:5000/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questions[currentQIndex],
          userAnswer: transcript,
          jobDescription: userData.jobDescription
        })
      });
      const data = await res.json();
      setFeedback(data);
      setAnalyzing(false);
    } else {
      setTranscript('');
      setFeedback(null);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="pt-24 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-4rem)] pb-8"
    >
      
      {/* LEFT: HUD Interface */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col gap-6"
      >
        <motion.div 
          className="relative flex-grow bg-black rounded-3xl overflow-hidden border border-gray-800 shadow-2xl"
          whileHover={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}
          transition={{ duration: 0.3 }}
        >
          <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1] opacity-80" />
          
          {/* Overlay UI */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent"
          >
            <motion.span 
              className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold uppercase"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Question {currentQIndex + 1}
            </motion.span>
            <h2 className="text-xl text-white font-medium mt-2 shadow-black drop-shadow-md">
              {questions[currentQIndex] || "Initializing AI..."}
            </h2>
          </motion.div>

          {/* Feedback Modal */}
          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md p-8 flex flex-col justify-center text-center z-20"
              >
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
                  className={`text-lg font-bold mb-6 ${feedback.rating === 'Green' ? 'text-green-400' : 'text-yellow-400'}`}
                >
                  {feedback.rating} Signal
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-300 mb-6"
                >
                  {feedback.feedback}
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/5 p-4 rounded-xl text-left border-l-4 border-blue-500 mb-8"
                >
                  <p className="text-xs text-blue-400 font-bold uppercase">Tip</p>
                  <p className="text-sm text-gray-300">{feedback.improvement_tip}</p>
                </motion.div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => { setFeedback(null); setCurrentQIndex(i => (i+1)%questions.length); }}
                  className="py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
                >
                  Next Question →
                </motion.button>
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
          disabled={analyzing}
          className={`w-full py-5 rounded-2xl font-bold text-xl transition-all shadow-lg
            ${isRecording ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-cyan-500/40'}`}
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
              Stop Recording
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
        <div className="flex-grow p-6 font-mono text-sm overflow-y-auto">
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