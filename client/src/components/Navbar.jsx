import React from 'react';

const Navbar = ({ setActiveMode, activeMode }) => {
  
  const getButtonClass = (mode) => {
    const baseClass = "px-5 py-2 rounded-full font-medium transition-all duration-300 text-sm tracking-wide";
    return activeMode === mode
      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' // Glowing Active State
      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'; // Inactive State
  };

  return (
    <nav className="w-full bg-gray-900/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveMode('guided')}>
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-black text-xl shadow-lg">
            M
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">
            MockMate
          </h1>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 bg-gray-900 p-1.5 rounded-full border border-gray-800">
          <button 
            onClick={() => setActiveMode('guided')}
            className={getButtonClass('guided')}
          >
            Guided
          </button>
          <button 
            onClick={() => setActiveMode('test')}
            className={getButtonClass('test')}
          >
            Test
          </button>
          <button 
            onClick={() => setActiveMode('code')}
            className={getButtonClass('code')}
          >
            Code
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;