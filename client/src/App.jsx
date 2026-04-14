import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import GuidedMode from './components/GuidedMode';
import TestMode from './components/TestMode';
import SetupScreen from './components/SetupScreen';
import './App.css';

function App() {
  const [activeMode, setActiveMode] = useState('guided');
  const [isGenerating, setIsGenerating] = useState(false);
  const hasShownAlertRef = useRef(false);

  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('mockMateUser');
    return saved ? JSON.parse(saved) : { resumeText: null, jobDescription: '', isReady: false };
  });

  const [sessionState, setSessionState] = useState(() => {
    const saved = localStorage.getItem('mockMateSession');
    return saved ? JSON.parse(saved) : {
      sessionId: null,
      role: null,
      currentStage: 'introduction',
      questionIndex: 0,
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
        total: 35,
        stageQuestionsRemaining: 2
      }
    };
  });

  const [qaPairs, setQaPairs] = useState([]);

  useEffect(() => {
    if (hasShownAlertRef.current) return;
    const saved = localStorage.getItem('mockMateUser');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.isReady) {
        hasShownAlertRef.current = true;
        const continueSession = window.confirm('Start a new session? Your current data will be cleared.');
        if (continueSession) {
          setUserData({ resumeText: null, jobDescription: '', isReady: false });
          setQaPairs([]);
          localStorage.removeItem('mockMateUser');
        }
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mockMateUser', JSON.stringify(userData));
  }, [userData]);

  useEffect(() => {
    localStorage.setItem('mockMateSession', JSON.stringify(sessionState));
  }, [sessionState]);

  const handleSetupComplete = (data) => {
    setUserData({
      resumeText: data.resumeText,
      jobDescription: data.jobDescription,
      isReady: true
    });

    setQaPairs([]);

    const resumeAnalysis = data.parsedResume ? {
      skills: data.parsedResume.skills || [],
      totalSkills: data.parsedResume.totalSkills || 0,
      experienceLevel: data.parsedResume.experienceLevel || 'mid-level',
      skillsByCategory: data.parsedResume.skillsByCategory || {},
      projects: data.parsedResume.projects || [],
      experience: data.parsedResume.experience || [],
      education: data.parsedResume.education || []
    } : {
      skills: [], totalSkills: 0, experienceLevel: 'mid-level',
      skillsByCategory: {}, projects: [], experience: [], education: []
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
    const confirmed = window.confirm('Start a new session? Your current progress will be cleared.');
    if (confirmed) {
      setUserData({ resumeText: null, jobDescription: '', isReady: false });
      setQaPairs([]);
      setSessionState({
        sessionId: null, role: null, currentStage: 'warmup', questionIndex: 0,
        sequence: [], questionSequence: [], currentQuestionCache: null,
        askedQuestions: [], weakTopics: [], strongTopics: [], answers: [],
        evaluation: [], resumeAnalysis: null
      });
      localStorage.removeItem('mockMateUser');
      localStorage.removeItem('mockMateSession');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>

      {!userData.isReady ? (
        <SetupScreen onComplete={handleSetupComplete} />
      ) : (
        <>
          <Navbar
            activeMode={activeMode}
            setActiveMode={setActiveMode}
            onNewSession={handleNewSession}
            isGenerating={isGenerating}
          />

          <main className="max-w-6xl mx-auto px-4 md:px-6">
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