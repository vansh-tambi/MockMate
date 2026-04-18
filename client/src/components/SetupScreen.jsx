import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Brain, 
  Zap, 
  BarChart3, 
  ChevronRight, 
  Loader2,
  FileSearch
} from 'lucide-react';

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
            <div className="flex items-center gap-4 mb-12">
              <div className="p-2 rounded-xl bg-card border border-border shadow-inner">
                <img src="/Logo.png" alt="MockMate Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tighter text-foreground block leading-none">MockMate</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Scale your career</span>
              </div>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
              Master <br />
              <span className="text-muted/60 font-medium">the interview.</span>
            </h1>
            
            <p className="text-muted/80 leading-relaxed mb-10 text-base">
              Precision-engineered interview simulation. Upload your history, define your path, and receive clinical analysis of your performance.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-emerald-500/20">
                  <Zap className="text-emerald-500 w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-none mb-1">Adaptive Progression</h3>
                  <p className="text-xs text-muted">Questioning that evolves based on your logic.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-blue-500/20">
                  <Brain className="text-blue-500 w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-none mb-1">Deep Evaluation</h3>
                  <p className="text-xs text-muted">Technical and behavioral stage modeling.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-purple-500/20">
                  <BarChart3 className="text-purple-500 w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-none mb-1">Clinical Analysis</h3>
                  <p className="text-xs text-muted">Instant, actionable data on every answer.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-16 flex items-center gap-4 text-[10px] font-bold text-muted/50 uppercase tracking-widest relative z-10 transition hover:text-muted cursor-default">
            <span>Core v2.4.0</span>
            <div className="w-1 h-1 rounded-full bg-border"></div>
            <span>Authored by DeepMind</span>
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
                      <FileSearch className="w-10 h-10 text-primary mb-2" />
                      <p className="text-sm font-medium text-foreground">{resume.name}</p>
                      <p className="text-xs text-muted mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                        <Upload className="w-5 h-5 text-muted" />
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    Start Session
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
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