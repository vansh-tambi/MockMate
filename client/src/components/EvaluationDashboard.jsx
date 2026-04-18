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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-6xl mx-auto py-12 px-4 shadow-sm"
    >
      
      {/* Brand Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 mb-12">
        <motion.div 
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.7 }}
          className="p-2.5 rounded-2xl bg-card border border-border shadow-inner"
        >
          <img src="/Logo.png" alt="MockMate Logo" className="w-8 h-8 object-contain" />
        </motion.div>
        <div>
          <h2 className="text-xl font-black text-foreground leading-none tracking-tighter uppercase">Clinical Analysis</h2>
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mt-1 opacity-50">Log ID: {sessionState.sessionId || 'MATE-X-402'}</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-panel p-10 sm:p-16 mb-16 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="flex flex-col lg:flex-row gap-16 items-center relative z-10">
          
          {/* Main Score & Status */}
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="112" cy="112" r="102" className="stroke-card-hover fill-none" strokeWidth="12" />
                <motion.circle 
                  cx="112" cy="112" r="102" 
                  className={`fill-none ${overallBand.ring}`} 
                  strokeWidth="12" 
                  strokeLinecap="round"
                  strokeDasharray={640.88}
                  initial={{ strokeDashoffset: 640.88 }}
                  animate={{ strokeDashoffset: 640.88 - (avgScore / 100) * 640.88 }}
                  transition={{ duration: 2, ease: "circOut", delay: 0.5 }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <motion.span 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 10, delay: 1 }}
                  className="text-6xl font-black tracking-tighter text-foreground"
                >
                  {avgScore}
                </motion.span>
                <div className="w-8 h-1 bg-border/50 rounded-full my-1" />
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Efficiency</span>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <span className={`px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.25em] ${overallBand.bg} ${overallBand.color} shadow-lg shadow-current/5 border border-current/10`}>
                {overallBand.label}
              </span>
            </motion.div>
          </div>

          {/* Key Insights */}
          <div className="flex-1 space-y-10">
            <div>
              <h1 className="text-5xl font-black text-foreground mb-6 tracking-tighter leading-none">Diagnostic Result</h1>
              <p className="text-muted text-lg max-w-2xl leading-relaxed font-medium opacity-80">
                Logic synthesis completed. Your communication matrix has been processed across behavioral and technical hardware layers. 
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: Award, label: 'Clarity', val: '8.2', color: 'text-primary' },
                { icon: BarChart3, label: 'Structure', val: '7.5', color: 'text-blue-500' },
                { icon: Target, label: 'Instinct', val: '9.1', color: 'text-emerald-500' }
              ].map((stat, i) => (
                <motion.div 
                  key={stat.label}
                  variants={itemVariants}
                  whileHover={{ y: -5, borderColor: 'var(--color-primary)' }}
                  className="bg-background/40 border border-border/50 rounded-[1.5rem] p-8 text-center transition-all shadow-inner group/stat"
                >
                  <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-4 group-hover/stat:scale-110 transition-transform`} />
                  <span className="text-[10px] font-black text-muted uppercase tracking-widest block mb-1 opacity-50">{stat.label}</span>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-3xl font-black text-foreground tracking-tighter">{stat.val}</span>
                    <span className="text-xs text-muted mb-1 font-bold opacity-30">/10</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-6 mb-20">
        <motion.button 
          whileHover={{ scale: 1.05, x: 4 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart} 
          className="btn-primary flex items-center gap-4 py-5 px-12 rounded-[1.25rem] shadow-2xl shadow-primary/30 font-black uppercase text-xs tracking-widest"
        >
          <RefreshCcw className="w-5 h-5" />
          Recursive Session
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.print()} 
          className="btn-secondary flex items-center gap-4 py-5 px-12 rounded-[1.25rem] font-black uppercase text-xs tracking-widest"
        >
          <Download className="w-5 h-5" />
          Archive Assessment
        </motion.button>
      </motion.div>

      {/* Detailed Question Breakdown */}
      <div className="space-y-12">
        <motion.div variants={itemVariants} className="flex items-center gap-6 mb-4">
          <span className="text-xl font-black text-foreground uppercase tracking-tighter">Module logs</span>
          <div className="flex-1 h-[2px] bg-border/30 rounded-full"></div>
          <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-40">{answers.length} segments analyzed</span>
        </motion.div>

        {answers.map((item, idx) => {
          const band = getScoreBand(item.feedback?.score || 0);
          return (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, scale: 0.98 }} 
              whileInView={{ opacity: 1, scale: 1 }} 
              viewport={{ once: true, margin: "-50px" }}
              className="glass-panel overflow-hidden border-l-[6px] shadow-xl group/card"
              style={{ borderLeftColor: item.feedback?.score ? `var(--color-${band.color.split('-')[1]})` : 'var(--color-border)' }}
            >
              <div className="p-10 sm:p-14">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-12 pb-10 border-b border-border/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-5">
                      <span className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-xs font-black text-muted shadow-inner group-hover/card:text-primary transition-colors">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-50">Hardware Module</span>
                    </div>
                    <h3 className="text-3xl font-bold text-foreground leading-[1.2] tracking-tight">{item.question}</h3>
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center sm:items-end shrink-0 md:bg-background/20 md:p-6 rounded-3xl border border-transparent md:hover:border-border/50 transition-all shadow-sm"
                  >
                    <span className={`text-4xl font-black tracking-tighter ${band.color}`}>{item.feedback?.score}<span className="text-sm text-muted font-bold tracking-tight opacity-30">/100</span></span>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] mt-2 ${band.color}`}>{band.label}</span>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  <div className="space-y-10">
                    <div>
                      <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em] block mb-6 opacity-40">Transcription Capture</span>
                      <div className="bg-background/30 border border-border/30 rounded-[2rem] p-8 sm:p-10 italic text-foreground/70 leading-relaxed text-lg shadow-inner selection:bg-primary/20">
                        "{item.answer}"
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    {item.feedback?.aiData?.strengths?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] block mb-6 border-b border-emerald-500/10 pb-2">Vector Peaks</span>
                        <ul className="space-y-5">
                          {item.feedback.aiData.strengths.map((s, i) => (
                            <motion.li 
                              initial={{ opacity: 0, x: 10 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              key={i} 
                              className="flex items-start gap-5 text-base text-foreground/80 font-medium leading-relaxed"
                            >
                              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              </div>
                              {s}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.feedback?.aiData?.improvements?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] block mb-6 border-b border-amber-500/10 pb-2">Optimization Paths</span>
                        <ul className="space-y-5">
                          {item.feedback.aiData.improvements.map((s, i) => (
                            <motion.li 
                              initial={{ opacity: 0, x: 10 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              key={i} 
                              className="flex items-start gap-5 text-base text-foreground/80 font-medium leading-relaxed"
                            >
                              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                              </div>
                              {s}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.feedback?.improvement_tip && (
                      <motion.div 
                        whileHover={{ x: 4 }}
                        className="bg-primary shadow-2xl shadow-primary/20 rounded-[1.5rem] p-8 text-white relative overflow-hidden group/tip"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover/tip:rotate-12 transition-transform">
                          <Target className="w-12 h-12" />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] block opacity-70">Clinical Insight</span>
                        </div>
                        <p className="text-base leading-relaxed font-bold">{item.feedback.improvement_tip}</p>
                      </motion.div>
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
