import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Navbar from './components/Navbar';
import GuidedMode from './components/GuidedMode';
import TestMode from './components/TestMode';
import SetupScreen from './components/SetupScreen';
import './App.css';

function App() {
  const [activeMode, setActiveMode] = useState('guided');
  const [isGenerating, setIsGenerating] = useState(false);
  const hasShownAlertRef = useRef(false);
  
  // Initialize from LocalStorage if available, otherwise default
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('mockMateUser');
    return saved ? JSON.parse(saved) : { resumeText: null, jobDescription: '', isReady: false };
  });

  // Session state with STAGED progression (5 stages, 22 total questions)
  const [sessionState, setSessionState] = useState(() => {
    const saved = localStorage.getItem('mockMateSession');
    return saved ? JSON.parse(saved) : {
      sessionId: null,
      role: null,
      currentStage: 'introduction', // Start with Introduction stage
      questionIndex: 0, // 0 = first question
      sequence: ['introduction', 'warmup', 'resume_technical', 'real_life', 'hr_closing'],
      questionSequence: [],
      currentQuestionCache: null,
      askedQuestions: [],
      weakTopics: [],
      strongTopics: [],
      answers: [],
      evaluation: [],
      resumeAnalysis: null,
      stageProgress: {
        current: 0,
        total: 22,
        stageQuestionsRemaining: 3
      }
    };
  });

  // Lift questions state to persist across tab switches
  const [qaPairs, setQaPairs] = useState([]);

  // Show alert on page load if session exists
  useEffect(() => {
    if (hasShownAlertRef.current) return;
    
    const saved = localStorage.getItem('mockMateUser');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.isReady) {
        hasShownAlertRef.current = true;
        const continueSession = window.confirm('🔄 Start a new session? Your current data will be cleared.');
        if (continueSession) {
          setUserData({ resumeText: null, jobDescription: '', isReady: false });
          setQaPairs([]);
          localStorage.removeItem('mockMateUser');
        }
      }
    }
  }, []);

  // Save to LocalStorage whenever userData or sessionState changes
  useEffect(() => {
    localStorage.setItem('mockMateUser', JSON.stringify(userData));
  }, [userData]);

  useEffect(() => {
    localStorage.setItem('mockMateSession', JSON.stringify(sessionState));
  }, [sessionState]);

  const handleSetupComplete = (data) => {
    console.log('Setup complete with data:', data);
    
    setUserData({
      resumeText: data.resumeText,
      jobDescription: data.jobDescription,
      isReady: true
    });
    
    // Reset questions and session when starting new session
    setQaPairs([]);
    
    // Initialize session state with parsed resume data
    const resumeAnalysis = data.parsedResume ? {
      skills: data.parsedResume.skills || [],
      totalSkills: data.parsedResume.totalSkills || 0,
      experienceLevel: data.parsedResume.experienceLevel || 'mid-level',
      skillsByCategory: data.parsedResume.skillsByCategory || {},
      projects: data.parsedResume.projects || [],
      experience: data.parsedResume.experience || [],
      education: data.parsedResume.education || []
    } : {
      skills: [],
      totalSkills: 0,
      experienceLevel: 'mid-level',
      skillsByCategory: {},
      projects: [],
      experience: [],
      education: []
    };
    
    setSessionState({
      sessionId: null,
      role: null,
      currentStage: 'warmup',
      questionIndex: 0,
      sequence: [],
      questionSequence: [],
      currentQuestionCache: null,
      askedQuestions: [],
      weakTopics: [],
      strongTopics: [],
      answers: [],
      evaluation: [],
      resumeAnalysis
    });
  };

  const handleNewSession = () => {
    // Always show confirmation dialog when clicking logo
    const confirmed = window.confirm('🔄 Start a new session? Your current data will be cleared.');
    if (confirmed) {
      setUserData({ resumeText: null, jobDescription: '', isReady: false });
      setQaPairs([]);
      setSessionState({
        sessionId: null,
        role: null,
        currentStage: 'warmup',
        questionIndex: 0,
        sequence: [],
        questionSequence: [],
        currentQuestionCache: null,
        askedQuestions: [],
        weakTopics: [],
        strongTopics: [],
        answers: [],
        evaluation: [],
        resumeAnalysis: null
      });
      localStorage.removeItem('mockMateUser');
      localStorage.removeItem('mockMateSession');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500 selection:text-black">
      
      {!userData.isReady ? (
        <SetupScreen onComplete={handleSetupComplete} />
      ) : (
        <>
          <Navbar activeMode={activeMode} setActiveMode={setActiveMode} onNewSession={handleNewSession} isGenerating={isGenerating} />
          
          <main className="max-w-7xl mx-auto p-6 md:p-8">
            {activeMode === 'guided' ? (
              <GuidedMode 
                userData={userData} 
                qaPairs={qaPairs} 
                setQaPairs={setQaPairs} 
                setIsGenerating={setIsGenerating}
                sessionState={sessionState}
                setSessionState={setSessionState}
              />
            ) : (
              <TestMode 
                userData={userData} 
                qaPairs={qaPairs} 
                setQaPairs={setQaPairs}
                sessionState={sessionState}
                setSessionState={setSessionState}
              />
            )}
          </main>
        </>
      )}

    </div>
  );
}

export default App;