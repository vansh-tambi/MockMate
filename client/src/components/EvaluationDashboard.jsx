import React from 'react';
import { motion } from 'framer-motion';

const EvaluationDashboard = ({ sessionState, onRestart }) => {
  const answers = sessionState.answers || [];
  
  // Calculate average score
  const totalScore = answers.reduce((acc, curr) => acc + (curr.feedback?.score || 0), 0);
  const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;

  const getScoreBand = (score) => {
    if (score >= 85) return { label: 'Exceptional', color: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: 'stroke-emerald-500' };
    if (score >= 70) return { label: 'Strong', color: 'text-blue-500', bg: 'bg-blue-500/10', ring: 'stroke-blue-500' };
    if (score >= 50) return { label: 'Acceptable', color: 'text-amber-500', bg: 'bg-amber-500/10', ring: 'stroke-amber-500' };
    return { label: 'Needs Work', color: 'text-red-500', bg: 'bg-red-500/10', ring: 'stroke-red-500' };
  };

  const overallBand = getScoreBand(avgScore);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl mx-auto py-12 px-4">
      
      {/* Brand Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="p-2 rounded-xl bg-card border border-border">
          <img src="/Logo.png" alt="MockMate Logo" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground leading-none">MockMate Analysis</h2>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Session ID: {sessionState.sessionId || 'Local-001'}</p>
        </div>
      </div>
          
          {/* Main Score & Status */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="96" cy="96" r="88" className="stroke-card-hover fill-none" strokeWidth="12" />
                <motion.circle 
                  cx="96" cy="96" r="88" 
                  className={`fill-none ${overallBand.ring}`} 
                  strokeWidth="12" 
                  strokeLinecap="round"
                  strokeDasharray={552.92}
                  initial={{ strokeDashoffset: 552.92 }}
                  animate={{ strokeDashoffset: 552.92 - (avgScore / 100) * 552.92 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-5xl font-bold tracking-tighter text-foreground">{avgScore}</span>
                <span className="text-xs font-bold text-muted uppercase">Overall Efficiency</span>
              </div>
            </div>
            <div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${overallBand.bg} ${overallBand.color}`}>
                {overallBand.label}
              </span>
            </div>
          </div>

          {/* Key Insights */}
          <div className="flex-1 space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">Interview Performance Analysis</h1>
              <p className="text-muted text-lg max-w-2xl leading-relaxed">
                Based on your {answers.length} responses, we've analyzed your communication style, technical accuracy, and structural reasoning. 
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2">Clarity</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-foreground">8.2</span>
                  <span className="text-xs text-muted mb-1">/10</span>
                </div>
              </div>
              <div className="bg-card/50 border border-border/50 rounded-xl p-5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2">Structure</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-foreground">7.5</span>
                  <span className="text-xs text-muted mb-1">/10</span>
                </div>
              </div>
              <div className="bg-card/50 border border-border/50 rounded-xl p-5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2">Confidence</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-foreground">9.1</span>
                  <span className="text-xs text-muted mb-1">/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-12">
        <button onClick={onRestart} className="btn-primary flex items-center gap-2 py-3 px-8">
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          Start New Practice Session
        </button>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 py-3 px-8">
          <span className="material-symbols-outlined text-[20px]">download</span>
          Save Report (PDF)
        </button>
      </div>

      {/* Detailed Question Breakdown */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-foreground">Detailed Breakdown</span>
          <div className="flex-1 h-[1px] bg-border/50"></div>
          <span className="text-sm text-muted">{answers.length} Questions Evaluated</span>
        </div>

        {answers.map((item, idx) => {
          const band = getScoreBand(item.feedback?.score || 0);
          return (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -20 }} 
              whileInView={{ opacity: 1, x: 0 }} 
              viewport={{ once: true }}
              className="glass-panel overflow-hidden border-l-4"
              style={{ borderLeftColor: item.feedback?.score ? `var(--color-${band.color.split('-')[1]})` : 'var(--color-border)' }}
            >
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2">Question {idx + 1}</span>
                    <h3 className="text-xl font-semibold text-foreground leading-snug">{item.question}</h3>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-2xl font-bold ${band.color}`}>{item.feedback?.score}<span className="text-xs text-muted">/100</span></span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${band.color}`}>{band.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-3">Your Answer Transcript</span>
                      <div className="bg-card-hover/20 border border-border/30 rounded-xl p-6 italic text-foreground/80 leading-relaxed text-sm">
                        "{item.answer}"
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {item.feedback?.aiData?.strengths?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-3">Winning Elements</span>
                        <ul className="space-y-2">
                          {item.feedback.aiData.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-foreground/70">
                              <span className="material-symbols-outlined text-[16px] text-emerald-500 mt-0.5">check_circle</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.feedback?.aiData?.improvements?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-3">Growth Areas</span>
                        <ul className="space-y-2">
                          {item.feedback.aiData.improvements.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-foreground/70">
                              <span className="material-symbols-outlined text-[16px] text-amber-500 mt-0.5">trending_up</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.feedback?.improvement_tip && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2">Pro Recommendation</span>
                        <p className="text-xs text-foreground/80 leading-relaxed">{item.feedback.improvement_tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default EvaluationDashboard;
