import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// NOTE: ESLint's base no-unused-vars rule may not count JSX member usage like <motion.div />.
void motion;

const TestMode = ({ userData }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);

  // Fetch Questions
  useEffect(() => {
    const initQuestions = async () => {
      const res = await fetch('http://localhost:5000/api/generate-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      setQuestions(data.qaPairs?.map(q => q.question) || []);
    };
    initQuestions();
  }, []);

  // Camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(err => console.error("Camera Error:", err));
  }, []);

  // Speech Recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        }
        setTranscript(prev => prev + final);
      };
    }
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setAnalyzing(true);
      try {
        const res = await fetch('http://localhost:5000/api/evaluate-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: questions[currentQIndex],
            userAnswer: transcript,
            resumeText: userData.resumeText,
            jobDescription: userData.jobDescription
          })
        });
        const data = await res.json();
        setFeedback(data);
      } catch (err) {
        console.error(err);
        alert("Analysis failed.");
      } finally {
        setAnalyzing(false);
      }
    } else {
      setTranscript('');
      setFeedback(null);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setTranscript('');
    setCurrentQIndex(prev => (prev + 1) % questions.length);
  };

  return (
    <div className="max-w-7xl mx-auto pt-24 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-4rem)]">
      
      {/* LEFT: Interface */}
      <div className="flex flex-col gap-6">
        
        {/* Video Frame */}
        <div className="relative flex-grow bg-black rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative group">
          <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1] opacity-80" />
          
          {/* Scanlines Effect */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

          {/* Recording Border Pulse */}
          {isRecording && (
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 border-4 border-red-500/50 rounded-3xl pointer-events-none"
            />
          )}

          {/* Question Overlay */}
          <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/90 to-transparent">
            <span className="inline-block px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold uppercase tracking-wide mb-2">
              Question {currentQIndex + 1} / {questions.length}
            </span>
            <h2 className="text-xl md:text-2xl text-white font-medium leading-snug shadow-black drop-shadow-lg">
              {questions[currentQIndex] || "Calibrating..."}
            </h2>
          </div>

          {/* Feedback Modal Overlay */}
          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md p-8 flex items-center justify-center z-20"
              >
                <div className="w-full max-w-md text-center">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold mb-6 border ${
                      feedback.rating === 'Green' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 
                      feedback.rating === 'Yellow' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' : 
                      'bg-red-500/10 border-red-500/50 text-red-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current"/>
                    {feedback.rating} Signal • {feedback.score}% Match
                  </motion.div>
                  
                  <p className="text-gray-300 mb-8 leading-relaxed text-lg">
                    {feedback.feedback}
                  </p>
                  
                  <div className="bg-gray-900/80 p-5 rounded-xl border border-white/10 text-left mb-8">
                    <p className="text-blue-400 text-xs font-bold uppercase mb-2">🤖 AI Coach Tip</p>
                    <p className="text-sm text-gray-300">{feedback.improvement_tip}</p>
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextQuestion}
                    className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Next Question
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button */}
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleRecording}
          disabled={analyzing}
          className={`w-full py-5 rounded-2xl font-bold text-xl tracking-wide shadow-lg transition-all flex items-center justify-center gap-3
            ${isRecording 
              ? 'bg-red-500/10 text-red-500 border border-red-500/50 shadow-red-500/20' 
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-cyan-500/20 hover:shadow-cyan-500/40'}`}
        >
          {analyzing ? (
            <span className="flex items-center gap-2 animate-pulse">Processing Analysis...</span>
          ) : isRecording ? (
             <>
               <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"/> 
               Stop Recording
             </>
          ) : (
            <>
              Start Answer <span className="text-2xl">🎤</span>
            </>
          )}
        </motion.button>
      </div>

      {/* RIGHT: Terminal Transcript */}
      <div className="bg-black rounded-3xl border border-gray-800 p-1 flex flex-col shadow-2xl h-full">
        <div className="bg-gray-900/50 px-6 py-4 rounded-t-[20px] border-b border-gray-800 flex justify-between items-center">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"/>
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"/>
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"/>
          </div>
          <span className="text-xs font-mono text-gray-500">TRANSCRIPT_LOG.txt</span>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto font-mono text-sm leading-7">
          {transcript ? (
            <span className="text-cyan-400">
              <span className="text-gray-600 select-none mr-2">$</span>
              {transcript}
              <span className="animate-pulse inline-block w-2 h-4 bg-cyan-500 ml-1 align-middle"/>
            </span>
          ) : (
             <span className="text-gray-700">
               <span className="text-gray-800 mr-2">$</span>
               Waiting for audio input...
             </span>
          )}
        </div>
      </div>

    </div>
  );
};

export default TestMode;
