/**
 * Stage Configuration for MockMate Interview System
 * Defines the strict progression order and question distribution
 * 
 * INDUSTRY STANDARD: 17 questions total
 * Matches real interview structure of top companies (Taj, Marriott, Oberoi, Google, Amazon, etc.)
 */

module.exports = {
  // Strict stage order - never changes (simulates real interview flow)
  STAGE_ORDER: [
    "introduction",
    "warmup",
    "resume_technical",
    "real_life",
    "hr_closing"
  ],

  // Industry-standard questions per stage
  // Total: 2 + 3 + 6 + 4 + 2 = 17 questions
  QUESTIONS_PER_STAGE: {
    introduction: 2,        // Opening: "Tell me about yourself", etc.
    warmup: 3,              // Light motivation: "Why this role?", "What motivates you?"
    resume_technical: 6,    // Deep dive: Skills, projects, technical depth (or service specifics)
    real_life: 4,           // Situational/crisis: "Handle X scenario", "Solve Y problem"
    hr_closing: 2           // Final: "Why hire you?", "Questions for us?"
  },

  // Total questions in interview
  getTotalQuestions() {
    return Object.values(this.QUESTIONS_PER_STAGE).reduce((a, b) => a + b, 0);
  },

  // Stage descriptions for logging
  STAGE_DESCRIPTIONS: {
    introduction: "Opening comfort (2 questions)",
    warmup: "Motivation and goals (3 questions)",
    resume_technical: "Resume deep-dive and skills (6 questions)",
    real_life: "Crisis and situational scenarios (4 questions)",
    hr_closing: "Final hiring decision (2 questions)"
  },

  // Stage boundaries (for clean logic)
  STAGE_BOUNDARIES: {
    introduction: { start: 0, end: 1 },
    warmup: { start: 2, end: 4 },
    resume_technical: { start: 5, end: 10 },
    real_life: { start: 11, end: 14 },
    hr_closing: { start: 15, end: 16 }
  }
};
