import React, { useState } from 'react';
import { motion } from 'framer-motion';

const SetupScreen = ({ onComplete }) => {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume || !jobDescription) return alert("Required fields missing");

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', resume);

    try {
      const res = await fetch('http://localhost:5000/api/parse-resume', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      onComplete({ resumeText: data.text, jobDescription });
    } catch (error) {
      alert("Setup failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-gray-900/60 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full"
      >
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 text-center">
          Initialize
        </h1>
        <p className="text-gray-400 text-center mb-8">Upload context for your AI session</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-300 uppercase">Resume (PDF)</label>
            <input 
              type="file" accept=".pdf"
              onChange={(e) => setResume(e.target.files[0])}
              className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl p-3 text-gray-300 file:bg-cyan-500/10 file:text-cyan-400 file:border-0 file:rounded-lg file:px-4 file:py-2 cursor-pointer hover:border-cyan-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-300 uppercase">Target Role</label>
            <textarea 
              rows="3"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="e.g. Senior React Dev"
              className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-colors"
            />
          </div>
          <button 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Launch Session 🚀'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default SetupScreen;