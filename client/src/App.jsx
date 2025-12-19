import { useState } from 'react';
import Navbar from './components/Navbar';
import GuidedMode from './components/GuidedMode';
import TestMode from './components/TestMode';
import CodeExplain from './components/CodeExplain';
import './App.css';

function App() {
  // State to track which "Page" is currently active
  // Default is 'guided' so users see the form first
  const [activeMode, setActiveMode] = useState('guided');

  // Helper function to render the correct component
  const renderActiveMode = () => {
    switch (activeMode) {
      case 'guided':
        return <GuidedMode />;
      case 'test':
        return <TestMode />;
      case 'code':
        return <CodeExplain />;
      default:
        return <GuidedMode />;
    }
  };

  return (
    // Main Container: Black background, white text, full height
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* 1. Navigation Bar */}
      {/* We pass setActiveMode so the Navbar buttons can change the state */}
      <Navbar 
        activeMode={activeMode} 
        setActiveMode={setActiveMode} 
      />

      {/* 2. Main Content Area */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {renderActiveMode()}
      </main>

    </div>
  );
}

export default App;