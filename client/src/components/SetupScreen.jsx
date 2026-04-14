import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'resume', label: 'Resume' },
  { id: 'role', label: 'Target Role' },
];

const ROLE_SUGGESTIONS = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'React Developer', 'Node.js Developer', 'Python Developer',
  'DevOps Engineer', 'Data Scientist', 'Product Manager',
  'Software Engineer', 'Mobile Developer', 'ML Engineer',
];

const SetupScreen = ({ onComplete }) => {
  const [step, setStep] = useState('welcome');
  const [resume, setResume] = useState(null);
  const [manualResume, setManualResume] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const manualTextareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (step === 'resume' && manualMode && manualTextareaRef.current) {
      manualTextareaRef.current.focus();
    }
  }, [step, manualMode]);

  const handleSubmit = async () => {
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

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to parse resume');
      }

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

  const canProceedToRole = manualMode ? manualResume.trim().length > 20 : resume !== null;

  // --- Step Indicator ---
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              s.id === step
                ? 'scale-125'
                : STEPS.indexOf(STEPS.find(st => st.id === step)) > i
                ? ''
                : ''
            }`}
            style={{
              background: s.id === step ? 'var(--accent)' : STEPS.indexOf(STEPS.find(st => st.id === step)) > i ? 'var(--success)' : 'var(--bg-elevated)',
              border: s.id === step ? '2px solid var(--accent)' : STEPS.indexOf(STEPS.find(st => st.id === step)) > i ? '2px solid var(--success)' : '2px solid var(--border)',
              boxShadow: s.id === step ? '0 0 8px var(--accent-glow)' : 'none',
            }}
          />
          {i < STEPS.length - 1 && (
            <div
              className="w-12 h-0.5 transition-all duration-300"
              style={{
                background: STEPS.indexOf(STEPS.find(st => st.id === step)) > i ? 'var(--success)' : 'var(--border)',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Subtle background gradients */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'rgba(99, 102, 241, 0.08)' }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'rgba(139, 92, 246, 0.06)' }}
      />

      <div className="relative z-10 w-full max-w-lg mx-4">
        <AnimatePresence mode="wait">
          {/* ===== STEP 1: WELCOME ===== */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="mb-12"
              >
                <img
                  src="/Logo.png"
                  alt="MockMate"
                  className="h-20 w-auto mx-auto object-contain"
                />
              </motion.div>

              <h1
                className="text-4xl font-bold mb-5 tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Your personal{' '}
                <span className="mm-gradient-text">interview coach</span>
              </h1>

              <p
                className="text-lg mb-14 max-w-md mx-auto leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                Practice with realistic interview questions, get instant feedback, and build confidence for the real thing.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('resume')}
                className="mm-btn mm-btn-primary mm-btn-lg"
              >
                Get Started
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.button>

              <div className="mt-16 flex items-center justify-center gap-12">
                {[
                  { num: '700+', label: 'Questions' },
                  { num: '7', label: 'Stages' },
                  { num: '35', label: 'Per Session' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-xl font-bold mm-gradient-text">{stat.num}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ===== STEP 2: RESUME ===== */}
          {step === 'resume' && (
            <motion.div
              key="resume"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="mm-glass p-10"
            >
              <StepIndicator />

              <h2 className="text-2xl font-bold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
                Upload your resume
              </h2>
              <p className="text-base mb-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                We'll tailor questions to your experience and skills.
              </p>

              {/* Input mode toggle */}
              <div className="flex gap-3 mb-6 justify-center">
                <button
                  onClick={() => setManualMode(false)}
                  className="mm-btn text-sm py-2 px-5"
                  style={{
                    background: !manualMode ? 'var(--accent-muted)' : 'transparent',
                    color: !manualMode ? 'var(--accent-hover)' : 'var(--text-muted)',
                    border: !manualMode ? '1px solid var(--border-accent)' : '1px solid var(--border)',
                  }}
                >
                  PDF Upload
                </button>
                <button
                  onClick={() => setManualMode(true)}
                  className="mm-btn text-sm py-2 px-5"
                  style={{
                    background: manualMode ? 'var(--accent-muted)' : 'transparent',
                    color: manualMode ? 'var(--accent-hover)' : 'var(--text-muted)',
                    border: manualMode ? '1px solid var(--border-accent)' : '1px solid var(--border)',
                  }}
                >
                  Paste Text
                </button>
              </div>

              {!manualMode ? (
                <div
                  className={`mm-dropzone mb-8 ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setResume(e.target.files[0])}
                    className="hidden"
                  />
                  {resume ? (
                    <div>
                      <div className="text-2xl mb-2">✓</div>
                      <p className="font-medium" style={{ color: 'var(--success)' }}>{resume.name}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl mb-3" style={{ color: 'var(--text-muted)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                          <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M20 16.7428C21.2215 15.734 22 14.2195 22 12.5C22 9.46243 19.5376 7 16.5 7C16.2815 7 16.0771 6.886 15.9661 6.69774C14.6621 4.48484 12.2544 3 9.5 3C5.35786 3 2 6.35786 2 10.5C2 12.5661 2.83545 14.4371 4.18695 15.7935" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Drop your PDF here or click to browse
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF format, max 5MB</p>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  ref={manualTextareaRef}
                  rows="6"
                  value={manualResume}
                  onChange={(e) => setManualResume(e.target.value)}
                  placeholder="Paste your resume text, key projects, skills, and experience here..."
                  className="mm-input mb-6 resize-none"
                  style={{ minHeight: '160px' }}
                />
              )}

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setStep('welcome')}
                  className="mm-btn mm-btn-ghost"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('role')}
                  disabled={!canProceedToRole}
                  className="mm-btn mm-btn-primary flex-1"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== STEP 3: TARGET ROLE ===== */}
          {step === 'role' && (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="mm-glass p-10"
            >
              <StepIndicator />

              <h2 className="text-2xl font-bold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
                What role are you targeting?
              </h2>
              <p className="text-base mb-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                We'll focus questions on what matters for your target position.
              </p>

              <input
                type="text"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="e.g. Senior React Developer"
                className="mm-input mb-5"
              />

              {/* Role suggestions */}
              <div className="flex flex-wrap gap-2.5 mb-10 justify-center">
                {ROLE_SUGGESTIONS.map((role) => (
                  <button
                    key={role}
                    onClick={() => setJobDescription(role)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: jobDescription === role ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                      color: jobDescription === role ? 'var(--accent-hover)' : 'var(--text-muted)',
                      border: jobDescription === role ? '1px solid var(--border-accent)' : '1px solid var(--border)',
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setStep('resume')}
                  className="mm-btn mm-btn-ghost"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleSubmit}
                  disabled={loading || !jobDescription.trim()}
                  className="mm-btn mm-btn-primary mm-btn-lg flex-1"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Processing...
                    </span>
                  ) : (
                    'Start Interview Session'
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SetupScreen;