import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_SUGGESTIONS = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Software Engineer', 'Product Manager', 'Data Scientist'
];

const SetupScreen = ({ onComplete }) => {
  const [resume, setResume] = useState(null);
  const [manualResume, setManualResume] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (manualMode) {
      if (!manualResume.trim() || !jobDescription.trim()) {
        return alert("Please add your resume summary and job role.");
      }
      onComplete({ resumeText: manualResume.trim(), jobDescription });
      return;
    }

    if (!resume || !jobDescription) return alert("Required fields missing");

    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_BASE || '';
    const formData = new FormData();
    formData.append('resume', resume);

    try {
      const res = await fetch(`${API_BASE}/api/parse-resume`, {
        method: 'POST',
        body: formData
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || 'Failed to parse resume');

      onComplete({
        resumeText: responseData.text || responseData.data?.summary || '',
        jobDescription,
        parsedResume: responseData.data
      });
    } catch (error) {
      console.error('Resume parsing error:', error);
      alert(`Setup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setResume(file);
    }
  };

  const isFormComplete = manualMode 
    ? (manualResume.trim().length > 20 && jobDescription.trim().length > 2)
    : (resume !== null && jobDescription.trim().length > 2);

  return (
    <div className="min-h-screen w-full flex bg-background items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 bg-card rounded-2xl overflow-hidden shadow-2xl border border-border">
        
        {/* Left Side: Branding & Info */}
        <div className="lg:col-span-2 bg-[#121214] border-r border-border p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary opacity-[0.03] rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">M</div>
              <span className="text-xl font-bold tracking-tight text-foreground">MockMate</span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
              Master the interview. <br />
              <span className="text-muted font-normal">Land the job.</span>
            </h1>
            
            <p className="text-muted leading-relaxed mb-8">
              Configure your session. Upload your experience, specify your target role, and let our AI simulate a realistic technical interview.
            </p>

            <ul className="space-y-4 text-sm text-foreground/80 font-medium">
              <li className="flex items-center gap-3">
                <span className="text-primary material-symbols-outlined text-[18px]">check_circle</span>
                Adaptive progressive questioning
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary material-symbols-outlined text-[18px]">check_circle</span>
                Deep technical & behavioral stages
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary material-symbols-outlined text-[18px]">check_circle</span>
                Actionable immediate feedback
              </li>
            </ul>
          </div>
          
          <div className="mt-12 text-xs text-muted font-mono relative z-10">
            System initialization // v2.0.0
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div className="lg:col-span-3 p-8 lg:p-12">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-semibold text-foreground">Resume Data</label>
                <div className="flex bg-[#09090b] rounded-lg p-1 border border-border">
                  <button type="button" onClick={() => setManualMode(false)} className={`px-3 py-1 text-xs font-medium rounded-md transition ${!manualMode ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}>PDF</button>
                  <button type="button" onClick={() => setManualMode(true)} className={`px-3 py-1 text-xs font-medium rounded-md transition ${manualMode ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}>Text</button>
                </div>
              </div>

              {!manualMode ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 transition-colors duration-200 cursor-pointer flex flex-col items-center justify-center text-center ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted bg-[#121214]'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => setResume(e.target.files[0])} className="hidden" />
                  {resume ? (
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-4xl text-primary mb-2">description</span>
                      <p className="text-sm font-medium text-foreground">{resume.name}</p>
                      <p className="text-xs text-muted mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-muted">upload_file</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted">PDF (max. 5MB)</p>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  rows="5"
                  value={manualResume}
                  onChange={(e) => setManualResume(e.target.value)}
                  placeholder="Paste your past experience, skills, and projects here..."
                  className="input-field resize-none h-[180px]"
                />
              )}
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-foreground mb-2">Target Role</label>
              <input
                type="text"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="input-field mb-3"
              />
              <div className="flex flex-wrap gap-2">
                {ROLE_SUGGESTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setJobDescription(role)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors bg-[#121214] border-border text-muted hover:text-foreground hover:border-muted"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={loading || !isFormComplete}
                className="btn-primary w-full sm:w-auto min-w-[200px]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Processing...
                  </span>
                ) : (
                  'Start Session'
                )}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;