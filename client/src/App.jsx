import { useState } from 'react';
import Navbar from './components/Navbar';
import GuidedMode from './components/GuidedMode';
import TestMode from './components/TestMode';
import SetupScreen from './components/SetupScreen'; 
import './App.css'
function App() {
  const [activeMode, setActiveMode] = useState('guided');
  
  // GLOBAL USER DATA
  const [userData, setUserData] = useState({
    resumeText: null,
    jobDescription: '',
    isReady: false // True when data is collected
  });

  // Handler to update data from SetupScreen
  const handleSetupComplete = (data) => {
    setUserData({
      resumeText: data.resumeText,
      jobDescription: data.jobDescription,
      isReady: true
    });
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      
      {/* 1. SETUP SCREEN (Shows if no data yet) */}
      {!userData.isReady ? (
        <SetupScreen onComplete={handleSetupComplete} />
      ) : (
        /* 2. MAIN APP (Shows once data is ready) */
        <>
          <Navbar activeMode={activeMode} setActiveMode={setActiveMode} />
          
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