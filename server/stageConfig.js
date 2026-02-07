/**
 * Stage Configuration for MockMate Interview System
 * Defines the strict progression order and question distribution
 * 
 * 7-STAGE SYSTEM: 35 questions total (expanded for comprehensive coverage)
 * Progressive interviewer flow: introduction → warmup → resume_based → technical → behavioral → real_world → hr_closing
 */

module.exports = {
  // Strict stage order - never changes (simulates real interview flow)
  STAGE_ORDER: [
    "introduction",
    "warmup",
    "resume_based",
    "technical",
    "behavioral",
    "real_world",
    "hr_closing"
  ],

  // Questions per stage - controls total interview length
  // Total: 2 + 3 + 4 + 12 + 6 + 3 + 5 = 35 questions (expanded from 22)
  QUESTIONS_PER_STAGE: {
    introduction: 2,        // Opening: "Tell me about yourself", etc.
    warmup: 3,              // Easy warm-up questions (increased from 2)
    resume_based: 4,        // Resume deep-dive: Skills, projects (increased from 3)
    technical: 12,          // Technical questions: DSA, system design, coding (increased from 10)
    behavioral: 6,          // Behavioral: Teamwork, conflict, motivation (increased from 5)
    real_world: 3,          // Real-world scenarios, edge cases (increased from 2)
    hr_closing: 5           // HR & Closing: Compensation, culture fit, expectations (increased from 1)
  },

  // Total questions in interview
  getTotalQuestions() {
    return Object.values(this.QUESTIONS_PER_STAGE).reduce((a, b) => a + b, 0);
  },

  // Stage descriptions for logging
  STAGE_DESCRIPTIONS: {
    introduction: "Opening comfort (2 questions)",
    warmup: "Easy warm-up questions (3 questions)",
    resume_based: "Resume deep-dive and skills (4 questions)",
    technical: "Technical depth and problem-solving (12 questions)",
    behavioral: "Teamwork and situational scenarios (6 questions)",
    real_world: "Real-world edge cases and challenges (3 questions)",
    hr_closing: "HR, culture fit, and closing (5 questions)"
  }
};
