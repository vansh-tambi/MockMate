import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Navbar from './components/Navbar';
import GuidedMode from './components/GuidedMode';
import TestMode from './components/TestMode';
import SetupScreen from './components/SetupScreen';
import './App.css';

function App() {
  const [activeMode, setActiveMode] = useState('guided');
  const hasShownAlertRef = useRef(false);
  
  // Initialize from LocalStorage if available, otherwise default
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('mockMateUser');
    return saved ? JSON.parse(saved) : { resumeText: null, jobDescription: '', isReady: false };
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

  // Save to LocalStorage whenever userData changes
  useEffect(() => {
    localStorage.setItem('mockMateUser', JSON.stringify(userData));
  }, [userData]);

  const handleSetupComplete = (data) => {
    setUserData({
      resumeText: data.resumeText,
      jobDescription: data.jobDescription,
      isReady: true
    });
    // Reset questions when starting new session
    setQaPairs([]);
  };

  const handleNewSession = () => {
    // Always show confirmation dialog when clicking logo
    const confirmed = window.confirm('🔄 Start a new session? Your current data will be cleared.');
    if (confirmed) {
      setUserData({ resumeText: null, jobDescription: '', isReady: false });
      setQaPairs([]);
      localStorage.removeItem('mockMateUser');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500 selection:text-black">
      
      {!userData.isReady ? (
        <SetupScreen onComplete={handleSetupComplete} />
      ) : (
        <>
          <Navbar activeMode={activeMode} setActiveMode={setActiveMode} onNewSession={handleNewSession} />
          
          <main className="max-w-7xl mx-auto p-6 md:p-8">
            {activeMode === 'guided' ? (
              <GuidedMode userData={userData} qaPairs={qaPairs} setQaPairs={setQaPairs} />
            ) : (
              <TestMode userData={userData} qaPairs={qaPairs} setQaPairs={setQaPairs} />
            )}
          </main>
        </>
      )}

    </div>
  );
}

export default App;