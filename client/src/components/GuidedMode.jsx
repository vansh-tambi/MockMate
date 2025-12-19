import React, { useState } from 'react';
import { motion } from 'framer-motion';

const GuidedMode = () => {
  // --- STATE MANAGEMENT ---
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]); 

  // --- HANDLERS ---

  // Handle file selection
  const handleFileChange = (e) => {
    setResume(e.target.files[0]);
  };

  // Handle form submission to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic Validation
    if (!resume || !jobDescription) {
      alert("Please upload a resume and paste a job description.");
      return;
    }

    setLoading(true);
    setQuestions([]); // Clear previous questions if any

    // Prepare data to send
    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('jobDescription', jobDescription);
    formData.append('difficulty', difficulty);

    try {
      // Make request to your Express backend
      const response = await fetch('http://localhost:5000/api/generate-questions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setQuestions(data.questions);
      } else {
        alert("Error from server: " + data.error);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to connect to the server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-cyan-400">
            Generate Interview
          </h2>
          <p className="text-gray-400 mt-2">
            Upload your details to get a tailored AI interview session.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
        
        {/* --- LEFT COLUMN: INPUT FORM --- */}
        <div className="bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800 flex flex-col h-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 h-full">
            
            {/* 1. Resume Upload */}
            <div>
              <label className="block text-gray-300 mb-2 text-sm font-semibold tracking-wide">
                UPLOAD RESUME (PDF)
              </label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-400
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-full file:border-0
                    file:text-sm file:font-bold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-500
                    cursor-pointer bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            {/* 2. Job Description */}
            <div className="flex-grow flex flex-col">
              <label className="block text-gray-300 mb-2 text-sm font-semibold tracking-wide">
                JOB DESCRIPTION
              </label>
              <textarea 
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full h-full bg-gray-800 text-white rounded-lg p-4 border border-gray-700 focus:outline-none focus:border-cyan-500 resize-none transition-all placeholder-gray-600"
              ></textarea>
            </div>

            {/* 3. Difficulty Selector */}
            <div>
              <label className="block text-gray-300 mb-2 text-sm font-semibold tracking-wide">
                DIFFICULTY LEVEL
              </label>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-lg font-bold text-lg tracking-wider transition-all shadow-lg flex justify-center items-center
                ${loading 
                  ? 'bg-gray-700 cursor-not-allowed text-gray-500' 
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/20 transform hover:-translate-y-1'
                }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  GENERATING...
                </span>
              ) : (
                'START INTERVIEW PREP'
              )}
            </button>
          </form>
        </div>

        {/* --- RIGHT COLUMN: OUTPUT DISPLAY --- */}
        <div className="bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800 h-full overflow-hidden flex flex-col">
          <h3 className="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">
            Session Preview
          </h3>
          
          <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
            {questions.length === 0 ? (
              // Empty State
              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                <div className="text-7xl mb-4 animate-pulse">🤖</div>
                <p className="text-lg font-medium">AI Agent Standing By</p>
                <p className="text-sm mt-2 text-center max-w-xs">
                  Provide your details on the left to initialize the question generation engine.
                </p>
              </div>
            ) : (
              // Questions List
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.15, duration: 0.4 }}
                    className="p-5 bg-gray-800/50 rounded-lg border-l-4 border-cyan-500 hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex gap-3">
                      <span className="text-cyan-400 font-mono font-bold text-lg opacity-70 group-hover:opacity-100">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                      <p className="text-gray-200 font-medium leading-relaxed">
                        {q}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Action Button (Visible only when questions exist) */}
          {questions.length > 0 && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.8 }}
               className="mt-6 pt-4 border-t border-gray-700"
             >
              <button 
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-all flex justify-center items-center gap-2"
                onClick={() => alert("Moving to Phase 3: Test Mode & Recording")}
              >
                <span>🎥</span> GO TO TEST MODE
              </button>
             </motion.div>
          )}
        </div>

      </div>
    </motion.div>
  );
};

export default GuidedMode;