/**
 * InterviewEngine - Orchestrates the complete interview flow
 * Manages state, question progression, scoring, and session persistence
 * Integrates with SessionManager for tracking across sessions
 */

const QuestionSelector = require('./QuestionSelector');
const SessionManager = require('./SessionManager');

class InterviewEngine {
  constructor(questions = []) {
    this.allQuestions = questions;
    this.sessionManager = new SessionManager();
    this.stageOrder = [
      'introduction',
      'warmup',
      'resume',
      'resume_technical',
      'real_life',
      'hr_closing'
    ];
    this.questionsPerStage = {
      introduction: 2,
      warmup: 4,
      resume: 3,
      resume_technical: 5,
      real_life: 4,
      hr_closing: 3
    };
  }

  /**
   * Initialize a new interview
   * @param {String} role - Candidate's role (frontend, backend, fullstack, etc.)
   * @param {String} level - Candidate's level (entry, mid, senior, principal)
   * @param {String} userId - Optional user ID for tracking across sessions
   * @returns {Object} Interview state
   */
  startInterview(role = 'any', level = 'mid', userId = null) {
    const sessionId = this._generateSessionId();
    
    // Create session in persistent storage
    const session = this.sessionManager.createSession(sessionId, { 
      role, 
      level, 
      userId 
    });

    this.state = {
      sessionId: session.sessionId,
      userId: session.userId,
      role,
      level,
      currentStageIndex: 0,
      currentStage: this.stageOrder[0],
      askedQuestions: [],
      answers: [],
      scores: {
        technical: 0,
        behavioral: 0,
        communication: 0,
        culture_fit: 0,
        overall: 0
      },
      strengths: [],
      weaknesses: [],
      interviewStarted: new Date(),
      currentQuestion: null
    };

    // Get first question
    const firstQuestion = this.getNextQuestion();
    return {
      state: this.state,
      question: firstQuestion,
      sessionId: sessionId
    };
  }

  /**
   * Get the next question for the interview
   * Smart question selection with session-aware exclusion
   * @returns {Object|null} Next question or null if interview complete
   */
  getNextQuestion() {
    const stage = this.state.currentStage;
    const questionsNeededForStage = this.questionsPerStage[stage] || 3;
    const stageQuestions = this.state.askedQuestions.filter(q => q.stage === stage);

    // Check if we've asked enough questions for this stage
    if (stageQuestions.length >= questionsNeededForStage) {
      // Move to next stage
      if (!this._advanceStage()) {
        return null; // Interview complete
      }
    }

    // Build comprehensive exclusion list:
    // 1. Questions asked in THIS interview
    const currentSessionAsked = this.state.askedQuestions.map(q => q.id);
    
    // 2. Questions asked in PREVIOUS sessions (if userId provided)
    let previousSessionAsked = [];
    if (this.state.userId) {
      previousSessionAsked = this.sessionManager.getPreviouslyAskedQuestionIds(
        this.state.userId,
        this.state.sessionId
      );
    }

    // Combine exclusion lists
    const excludeQuestionIds = [...currentSessionAsked, ...previousSessionAsked];

    // Select a question with smart exclusion logic
    const question = QuestionSelector.selectQuestion({
      stage: this.state.currentStage,
      role: this.state.role,
      level: this.state.level,
      excludeQuestionIds: excludeQuestionIds,  // NEW: Comprehensive exclusion
      availableQuestions: this.allQuestions,
      strictMode: true  // Prevent repeats across sessions
    });

    if (question) {
      this.state.currentQuestion = question;
    }

    return question;
  }

  /**
   * Submit an answer to the current question
   * Persists both to session and increments usage count
   * @param {String} questionId - ID of the question being answered
   * @param {String} answer - Candidate's answer
   * @returns {Object} {success, feedback, nextQuestion}
   */
  submitAnswer(questionId, answer) {
    if (!this.state.currentQuestion || this.state.currentQuestion.id !== questionId) {
      return {
        success: false,
        error: 'Question ID mismatch'
      };
    }

    // Record the answer
    const currentQuestion = this.state.currentQuestion;
    this.state.askedQuestions.push(currentQuestion);
    this.state.answers.push({
      questionId,
      answer,
      timestamp: new Date(),
      stage: this.state.currentStage
    });

    // Persist to session storage
    this.sessionManager.addAskedQuestion(
      this.state.sessionId,
      questionId,
      currentQuestion.question
    );

    // Get next question
    const nextQuestion = this.getNextQuestion();

    return {
      success: true,
      askedQuestions: this.state.askedQuestions.length,
      currentStage: this.state.currentStage,
      nextQuestion: nextQuestion,
      interviewComplete: nextQuestion === null
    };
  }

  /**
   * Advance to the next stage in the interview
   * @returns {Boolean} True if advanced, false if no more stages
   */
  _advanceStage() {
    const currentIndex = this.stageOrder.indexOf(this.state.currentStage);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= this.stageOrder.length) {
      return false; // No more stages
    }

    this.state.currentStageIndex = nextIndex;
    this.state.currentStage = this.stageOrder[nextIndex];
    return true;
  }

  /**
   * Get interview summary after completion
   * @returns {Object} Complete interview summary
   */
  getInterviewSummary() {
    const summary = {
      id: this.state.sessionId,
      role: this.state.role,
      level: this.state.level,
      startedAt: this.state.interviewStarted,
      completedAt: new Date(),
      duration_minutes: Math.round((new Date() - this.state.interviewStarted) / 60000),
      totalQuestionsAsked: this.state.askedQuestions.length,
      stageBreakdown: this._getStageBreakdown(),
      scores: this.state.scores,
      strengths: this.state.strengths,
      weaknesses: this.state.weaknesses,
      answers: this.state.answers,
      questions: this.state.askedQuestions.map(q => ({
        id: q.id,
        question: q.question,
        stage: q.stage,
        difficulty: q.difficulty,
        skill: q.skill
      }))
    };

    // Mark session as complete in persistent storage
    try {
      this.sessionManager.completeSession(this.state.sessionId, {
        totalQuestionsAsked: this.state.askedQuestions.length,
        durationMinutes: summary.duration_minutes,
        scores: this.state.scores
      });
    } catch (err) {
      console.error('Error completing session:', err);
    }

    return summary;
  }

  /**
   * Get breakdown of questions by stage
   * @returns {Object} Questions per stage
   */
  _getStageBreakdown() {
    const breakdown = {};
    this.stageOrder.forEach(stage => {
      breakdown[stage] = this.state.askedQuestions.filter(q => q.stage === stage).length;
    });
    return breakdown;
  }

  /**
   * Generate unique session ID
   * @returns {String} Session ID
   */
  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current state
   * @returns {Object} Current interview state
   */
  getState() {
    return this.state;
  }

  /**
   * Skip to next question (for testing)
   * @returns {Object} Next question
   */
  skipQuestion() {
    if (!this.state.currentQuestion) {
      return null;
    }

    // Mark current question as skipped
    const skippedQuestion = { ...this.state.currentQuestion, skipped: true };
    this.state.askedQuestions.push(skippedQuestion);

    // Also record in persistent storage
    this.sessionManager.addAskedQuestion(
      this.state.sessionId,
      skippedQuestion.id,
      skippedQuestion.question
    );

    return this.getNextQuestion();
  }

  /**
   * Load an interview session from persistent storage
   * Useful for resuming interrupted interviews
   * @param {String} sessionId - ID of session to load
   * @returns {Object|null} Interview state or null if not found
   */
  loadSession(sessionId) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return null;
    }

    this.state = {
      sessionId: session.sessionId,
      userId: session.userId,
      role: session.role,
      level: session.level,
      currentStageIndex: 0,
      currentStage: this.stageOrder[0],
      askedQuestions: [],
      answers: [],
      scores: {
        technical: 0,
        behavioral: 0,
        communication: 0,
        culture_fit: 0,
        overall: 0
      },
      strengths: [],
      weaknesses: [],
      interviewStarted: new Date(session.startedAt),
      currentQuestion: null
    };

    return this.getState();
  }

  /**
   * Get session statistics
   * @param {String} sessionId - ID of session
   * @returns {Object} Session stats
   */
  getSessionStats(sessionId) {
    return this.sessionManager.getSessionStats(sessionId);
  }
}

module.exports = InterviewEngine;

