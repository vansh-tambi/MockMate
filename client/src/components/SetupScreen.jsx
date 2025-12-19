import React, { useState } from 'react';
import { motion } from 'framer-motion';

// NOTE: ESLint's base no-unused-vars rule may not count JSX member usage like <motion.div />.
void motion;

const SetupScreen = ({ onComplete }) => {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume || !jobDescription) return alert("Please fill in all fields");

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', resume);

    try {
      const res = await fetch('http://localhost:5000/api/parse-resume', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      const data = await res.json();

      if (data.text) {
        onComplete({ resumeText: data.text, jobDescription });
      } else {
        throw new Error("Server returned no text.");
      }
    } catch (error) {
      console.error("Setup failed:", error);
      alert("Setup Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black selection:bg-cyan-500 selection:text-black overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 bg-gray-900/60 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-2xl max-w-xl w-full mx-4"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
            Initialize Session
          </h1>
          <p className="text-gray-400">
            Upload your context. The AI will tailor the experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resume Upload */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Resume (PDF)</label>
            <div className="relative group">
              <input 
                type="file" accept=".pdf"
                onChange={(e) => setResume(e.target.files[0])}
                className="w-full bg-black/40 text-gray-300 rounded-xl p-4 border border-white/10 focus:border-cyan-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 cursor-pointer"
              />
            </div>
          </div>

          {/* JD Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Job Role / Description</label>
            <textarea 
              rows="4"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description or role details here..."
              className="w-full bg-black/40 text-white rounded-xl p-4 border border-white/10 focus:border-cyan-500 outline-none resize-none transition-all placeholder:text-gray-600"
            />
          </div>

          {/* Submit Button */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide shadow-lg shadow-cyan-500/20 transition-all
              ${loading 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-cyan-500/40'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Parsing...
              </span>
            ) : 'Start Session 🚀'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default SetupScreen;
