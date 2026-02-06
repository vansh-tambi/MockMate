/**
 * Stage Configuration for MockMate Interview System
 * Defines the strict progression order and question distribution
 * 
 * 7-STAGE SYSTEM: 25 questions total
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
  // Total: 2 + 2 + 3 + 10 + 5 + 2 + 1 = 25 questions
  QUESTIONS_PER_STAGE: {
    introduction: 2,        // Opening: "Tell me about yourself", etc.
    warmup: 2,              // Easy warm-up questions
    resume_based: 3,        // Resume deep-dive: Skills, projects
    technical: 10,          // Technical questions: DSA, system design, coding
    behavioral: 5,          // Behavioral: Teamwork, conflict, motivation
    real_world: 2,          // Real-world scenarios, edge cases
    hr_closing: 1           // Final: "Why hire you?", "Questions for us?"
  },

  // Total questions in interview
  getTotalQuestions() {
    return Object.values(this.QUESTIONS_PER_STAGE).reduce((a, b) => a + b, 0);
  },

  // Stage descriptions for logging
  STAGE_DESCRIPTIONS: {
    introduction: "Opening comfort (2 questions)",
    warmup: "Easy warm-up questions (2 questions)",
    resume_based: "Resume deep-dive and skills (3 questions)",
    technical: "Technical depth and problem-solving (10 questions)",
    behavioral: "Teamwork and situational scenarios (5 questions)",
    real_world: "Real-world edge cases (2 questions)",
    hr_closing: "Final hiring decision (1 question)"
  }
};
