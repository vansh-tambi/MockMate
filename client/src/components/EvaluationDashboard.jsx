import React from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCcw, 
  Download, 
  CheckCircle2, 
  TrendingUp, 
  Target,
  Award,
  BarChart3
} from 'lucide-react';

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
        <div className="p-2 rounded-xl bg-card border border-border shadow-inner">
          <img src="/Logo.png" alt="MockMate Logo" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground leading-none">MockMate Analysis</h2>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Session ID: {sessionState.sessionId || 'Local-001'}</p>
        </div>
      </div>

      <div className="glass-panel p-8 sm:p-12 mb-12">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          
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
              <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">Performance Summary</h1>
              <p className="text-muted text-lg max-w-2xl leading-relaxed">
                Based on your {answers.length} responses, we've analyzed your communication style, technical accuracy, and structural reasoning. 
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="bg-card/50 border border-border/50 rounded-2xl p-6 group transition-colors hover:border-primary/20 shadow-inner">
                <Award className="w-5 h-5 text-primary mx-auto mb-3" />
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Clarity</span>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-foreground">8.2</span>
                  <span className="text-xs text-muted mb-1">/10</span>
                </div>
              </div>
              <div className="bg-card/50 border border-border/50 rounded-2xl p-6 group transition-colors hover:border-primary/20 shadow-inner">
                <BarChart3 className="w-5 h-5 text-blue-500 mx-auto mb-3" />
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Structure</span>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-foreground">7.5</span>
                  <span className="text-xs text-muted mb-1">/10</span>
                </div>
              </div>
              <div className="bg-card/50 border border-border/50 rounded-2xl p-6 group transition-colors hover:border-primary/20 shadow-inner">
                <Target className="w-5 h-5 text-emerald-500 mx-auto mb-3" />
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Confidence</span>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-foreground">9.1</span>
                  <span className="text-xs text-muted mb-1">/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-16">
        <button onClick={onRestart} className="btn-primary flex items-center gap-3 py-4 px-10 rounded-2xl shadow-xl shadow-primary/20">
          <RefreshCcw className="w-5 h-5" />
          Start New Practice
        </button>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-3 py-4 px-10 rounded-2xl">
          <Download className="w-5 h-5" />
          Save Analytics (PDF)
        </button>
      </div>

      {/* Detailed Question Breakdown */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-lg font-bold text-foreground">Detailed Feedback</span>
          <div className="flex-1 h-[1px] bg-border/50"></div>
          <span className="text-xs font-bold text-muted uppercase tracking-widest">{answers.length} Modules Analyzed</span>
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
              <div className="p-8 sm:p-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-10 pb-8 border-b border-border/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted shadow-sm">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Question Segment</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-foreground leading-snug">{item.question}</h3>
                  </div>
                  <div className="flex flex-col items-center sm:items-end shrink-0 md:bg-card/30 md:p-4 rounded-2xl border border-transparent md:hover:border-border/50 transition-colors">
                    <span className={`text-3xl font-black ${band.color}`}>{item.feedback?.score}<span className="text-sm text-muted font-bold tracking-tight">/100</span></span>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${band.color}`}>{band.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-4">Transcription</span>
                      <div className="bg-[#121214] border border-border/40 rounded-2xl p-6 sm:p-8 italic text-foreground/80 leading-relaxed text-base shadow-inner">
                        "{item.answer}"
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {item.feedback?.aiData?.strengths?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-4">Core Strengths</span>
                        <ul className="space-y-3">
                          {item.feedback.aiData.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-3.5 text-sm text-foreground/80 font-medium">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.feedback?.aiData?.improvements?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-4">Growth Strategy</span>
                        <ul className="space-y-3">
                          {item.feedback.aiData.improvements.map((s, i) => (
                            <li key={i} className="flex items-start gap-3.5 text-sm text-foreground/80 font-medium">
                              <TrendingUp className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.feedback?.improvement_tip && (
                      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Synthesis Highlight</span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed font-medium">{item.feedback.improvement_tip}</p>
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
