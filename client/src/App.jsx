import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from './components/Navbar';
import GuidedMode from './components/GuidedMode';
import TestMode from './components/TestMode';
import SetupScreen from './components/SetupScreen';
import './App.css';

function App() {
  const [activeMode, setActiveMode] = useState('guided');
  
  // Initialize from LocalStorage if available, otherwise default
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('mockMateUser');
    return saved ? JSON.parse(saved) : { resumeText: null, jobDescription: '', isReady: false };
  });

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
  };

  const handleNewSession = () => {
    if (userData.isReady) {
      const confirmed = window.confirm('🔄 Start a new session? Your current data will be cleared.');
      if (confirmed) {
        setUserData({ resumeText: null, jobDescription: '', isReady: false });
        localStorage.removeItem('mockMateUser');
      }
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
              <GuidedMode userData={userData} />
            ) : (
              <TestMode userData={userData} />
            )}
          </main>
        </>
      )}

    </div>
  );
}

export default App;