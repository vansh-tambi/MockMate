/**
 * EnhancedInterviewEngine v2.0
 * Integrates advanced features:
 * - Resume-aware question filtering
 * - Difficulty progression
 * - Follow-up question engine
 * - Analytics tracking
 * - Weakness-based adaptive targeting
 */

const QuestionSelector = require('./QuestionSelector');
const SessionManager = require('./SessionManager');
const ResumeAnalyzer = require('./services/ResumeAnalyzer');
const DifficultyProgression = require('./services/DifficultyProgression');
const FollowUpEngine = require('./services/FollowUpEngine');
const AnalyticsTracker = require('./services/AnalyticsTracker');
const WeaknessAdapter = require('./services/WeaknessAdapter');

class EnhancedInterviewEngine {
  constructor(questions = []) {
    this.allQuestions = questions;
    this.sessionManager = new SessionManager();
    
    // Initialize advanced modules
    this.resumeAnalyzer = new ResumeAnalyzer();
    this.difficultyProgression = new DifficultyProgression();
    this.followUpEngine = new FollowUpEngine();
    this.analyticsTracker = null; // Initialized per interview
    this.weaknessAdapter = new WeaknessAdapter();

    this.stageOrder = [
      'introduction',
      'warmup',
      'resume_based',
      'technical',
      'behavioral',
      'real_world',
      'hr_closing'
    ];

    this.questionsPerStage = {
      introduction: 2,
      warmup: 2,
      resume_based: 3,
      technical: 10,
      behavioral: 5,
      real_world: 2,
      hr_closing: 1
    };
  }

  /**
   * Initialize a new enhanced interview
   * @param {Object} interviewConfig - Configuration object
   */
  startInterview(interviewConfig = {}) {
    const {
      role = 'any',
      level = 'mid',
      userId = null,
      resumeText = '',
      allQuestions = null
    } = interviewConfig;

    const sessionId = this._generateSessionId();
    
    // Create session
    const session = this.sessionManager.createSession(sessionId, { 
      role, 
      level, 
      userId,
      resumeText
    });

    // Initialize analytics tracker
    this.analyticsTracker = new AnalyticsTracker(userId);
    this.analyticsTracker.sessionId = sessionId;

    // Analyze resume if provided
    let resumeAnalysis = null;
    if (resumeText && resumeText.length > 50) {
      resumeAnalysis = this.resumeAnalyzer.analyzeResume(resumeText);
      console.log('📋 Resume Analysis:', {
        detected_skills: resumeAnalysis.skills_analysis.detected_skills.length,
        confidence: resumeAnalysis.skills_analysis.confidence_score
      });
    }

    this.state = {
      sessionId,
      userId,
      role,
      level,
      resumeText,
      resumeAnalysis,
      currentStageIndex: 0,
      currentStage: this.stageOrder[0],
      currentQuestionIndex: 0,
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
      currentQuestion: null,
      analyticsData: null
    };

    // Get first question
    const firstQuestion = this.getNextQuestion();
    
    return {
      state: this.state,
      question: firstQuestion,
      sessionId: sessionId,
      resumeInsights: resumeAnalysis ? {
        skills: resumeAnalysis.skills_analysis.strengths,
        confidence: resumeAnalysis.skills_analysis.confidence_score
      } : null
    };
  }

  /**
   * Enhanced question selection with multiple filters
   * Applies: resume filtering, difficulty progression, weakness-based targeting
   */
  getNextQuestion() {
    const stage = this.state.currentStage;
    const questionsNeededForStage = this.questionsPerStage[stage] || 3;
    const stageQuestions = this.state.askedQuestions.filter(q => q.stage === stage);

    // Check if stage is complete
    if (stageQuestions.length >= questionsNeededForStage) {
      // Try follow-up first if previous question available
      if (this.state.askedQuestions.length > 0) {
        const lastQuestion = this.state.askedQuestions[this.state.askedQuestions.length - 1];
        const lastAnswer = this.state.answers[this.state.answers.length - 1];
        
        const followUp = this.followUpEngine.selectFollowUp(
          lastQuestion,
          {
            score: lastAnswer.score || 0.5,
            depth: lastAnswer.depth || 0.5,
            clarity: lastAnswer.clarity || 0.5,
            completeness: lastAnswer.completeness || 0.5,
            answer_text: lastAnswer.text || ''
          },
          this.state.askedQuestions.map(q => q.id)
        );

        if (followUp) {
          this.state.currentQuestion = followUp;
          return followUp;
        }
      }

      // No follow-up, advance to next stage
      if (!this._advanceStage()) {
        return null; // Interview complete
      }
    }

    // Build exclusion list
    const currentSessionAsked = this.state.askedQuestions.map(q => q.id);
    let previousSessionAsked = [];
    
    if (this.state.userId) {
      previousSessionAsked = this.sessionManager.getPreviouslyAskedQuestionIds(
        this.state.userId,
        this.state.sessionId
      );
    }

    const excludeQuestionIds = [...currentSessionAsked, ...previousSessionAsked];

    // Get candidate questions by stage
    let candidates = this.allQuestions.filter(q => q.stage === this.state.currentStage);

    // FILTER 1: Resume-based filtering (if resume provided)
    if (this.state.resumeText && this.state.resumeAnalysis) {
      candidates = this.resumeAnalyzer.filterQuestionsByResume(
        candidates,
        this.state.resumeText,
        this.state.currentStage
      );
    }

    // FILTER 2: Exclude already asked
    candidates = candidates.filter(q => !excludeQuestionIds.includes(q.id));

    if (candidates.length === 0) {
      // Fallback: use all stage questions except asked ones
      candidates = this.allQuestions
        .filter(q => q.stage === this.state.currentStage && !excludeQuestionIds.includes(q.id));
    }

    // FILTER 3: Weakness-based adaptive targeting
    if (this.analyticsTracker && this.state.askedQuestions.length > 2) {
      const analyticsData = this.analyticsTracker.getInterviewSummary();
      const weaknessAnalysis = this.weaknessAdapter.analyzeWeaknesses(analyticsData);
      
      if (weaknessAnalysis.needs_intervention) {
        candidates = this.weaknessAdapter.filterByWeakness(
          candidates,
          weaknessAnalysis,
          this.state.currentStage
        );
      }
    }

    // FILTER 4: Difficulty progression
    const performanceScore = this.difficultyProgression.getPerformanceScore();
    const question = this.difficultyProgression.selectQuestionByDifficulty(
      candidates,
      this.state.currentStage,
      this.state.currentQuestionIndex,
      performanceScore
    );

    if (question) {
      this.state.currentQuestion = question;
      this.state.currentQuestionIndex++;
    }

    return question;
  }

  /**
   * Submit answer with comprehensive tracking
   */
  submitAnswer(questionId, answerData) {
    if (!this.state.currentQuestion || this.state.currentQuestion.id !== questionId) {
      return {
        success: false,
        error: 'Question mismatch'
      };
    }

    const currentQuestion = this.state.currentQuestion;
    const {
      text = '',
      score = 0.5,
      correct = score >= 0.6,
      feedback = '',
      depth = 0.5,
      clarity = 0.5,
      completeness = 0.5
    } = answerData;

    // Track in analytics
    if (this.analyticsTracker) {
      this.analyticsTracker.trackAnswer(
        {
          id: currentQuestion.id,
          stage: currentQuestion.stage,
          skill: currentQuestion.skill,
          category: currentQuestion.category,
          difficulty: currentQuestion.difficulty
        },
        {
          text,
          score,
          correct,
          evaluation: feedback
        }
      );

      // Update difficulty progression
      this.difficultyProgression.updatePerformance(
        currentQuestion.skill || currentQuestion.category,
        correct,
        score
      );
    }

    // Store answer
    this.state.askedQuestions.push(currentQuestion);
    this.state.answers.push({
      questionId,
      text,
      score,
      correct,
      feedback,
      depth,
      clarity,
      completeness,
      timestamp: new Date(),
      stage: this.state.currentStage,
      is_follow_up: currentQuestion.is_follow_up || false
    });

    // Persist to session
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
      interviewComplete: nextQuestion === null,
      analytics: this.analyticsTracker ? {
        current_score: this.analyticsTracker.overallMetrics.avg_score,
        performance: this.difficultyProgression.getPerformanceScore()
      } : null
    };
  }

  /**
   * Complete interview and generate comprehensive report
   */
  completeInterview() {
    if (this.analyticsTracker) {
      this.analyticsTracker.saveSession();
    }

    const analyticsReport = this.analyticsTracker 
      ? this.analyticsTracker.generateAnalyticsReport()
      : null;

    const weaknessAnalysis = analyticsReport
      ? this.weaknessAdapter.analyzeWeaknesses(analyticsReport.current_session)
      : null;

    const summary = {
      id: this.state.sessionId,
      role: this.state.role,
      level: this.state.level,
      startedAt: this.state.interviewStarted,
      completedAt: new Date(),
      duration_minutes: Math.round((new Date() - this.state.interviewStarted) / 60000),
      totalQuestionsAsked: this.state.askedQuestions.length,
      stageBreakdown: this._getStageBreakdown(),
      
      // Analytics data
      analytics: analyticsReport ? {
        overall_score: analyticsReport.current_session.interview_stats.overall_score,
        accuracy: analyticsReport.current_session.interview_stats.accuracy,
        by_category: analyticsReport.current_session.by_category,
        by_stage: analyticsReport.current_session.by_stage,
        strengths: analyticsReport.current_session.strengths,
        weaknesses: analyticsReport.current_session.weaknesses,
        insights: analyticsReport.current_session.insights
      } : null,
      
      // Weakness analysis
      weakness_assessment: weaknessAnalysis ? {
        weak_areas: weaknessAnalysis.weak_areas,
        readiness: this.weaknessAdapter.assessReadiness(weaknessAnalysis),
        remediation_plan: this.weaknessAdapter.generateRemediationPlan(weaknessAnalysis, 60)
      } : null,

      // Follow-up stats
      follow_up_stats: this.followUpEngine.getFollowUpStats(),
      
      // Difficulty progression
      difficulty_report: this.difficultyProgression.generateAdaptationReport(),

      scores: this.state.scores,
      answers: this.state.answers.map(a => ({
        questionId: a.questionId,
        stage: a.stage,
        score: a.score,
        feedback: a.feedback
      })),
      questions: this.state.askedQuestions.map(q => ({
        id: q.id,
        question: q.question,
        stage: q.stage,
        skill: q.skill,
        difficulty: q.difficulty
      }))
    };

    // Persist to session storage
    this.sessionManager.completeSession(this.state.sessionId, {
      totalQuestionsAsked: this.state.askedQuestions.length,
      durationMinutes: summary.duration_minutes,
      scores: this.state.scores,
      analyticsData: summary.analytics
    });

    return summary;
  }

  /**
   * Get real-time performance snapshot
   */
  getPerformanceSnapshot() {
    if (!this.analyticsTracker) {
      return null;
    }

    const summary = this.analyticsTracker.getInterviewSummary();
    const weaknessAnalysis = this.weaknessAdapter.analyzeWeaknesses(summary);

    return {
      current_score: Number(summary.interview_stats.overall_score.toFixed(2)),
      accuracy: summary.interview_stats.accuracy,
      questions_asked: summary.interview_stats.total_questions,
      strengths: summary.strengths.map(s => s.category),
      weaknesses: weaknessAnalysis.weak_areas.map(w => ({
        category: w.category,
        severity: w.severity,
        score: Number(w.score.toFixed(2))
      })),
      performance_trend: this.difficultyProgression.generateAdaptationReport().trend
    };
  }

  /**
   * Advanced to next stage
   * @private
   */
  _advanceStage() {
    const currentIndex = this.stageOrder.indexOf(this.state.currentStage);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= this.stageOrder.length) {
      return false;
    }

    this.state.currentStageIndex = nextIndex;
    this.state.currentStage = this.stageOrder[nextIndex];
    return true;
  }

  /**
   * Get stage breakdown
   * @private
   */
  _getStageBreakdown() {
    const breakdown = {};
    this.stageOrder.forEach(stage => {
      breakdown[stage] = this.state.askedQuestions.filter(q => q.stage === stage).length;
    });
    return breakdown;
  }

  /**
   * Generate session ID
   * @private
   */
  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Skip current question
   */
  skipQuestion() {
    if (!this.state.currentQuestion) {
      return null;
    }

    const skipped = { ...this.state.currentQuestion, skipped: true };
    this.state.askedQuestions.push(skipped);
    this.sessionManager.addAskedQuestion(this.state.sessionId, skipped.id, skipped.question);
    return this.getNextQuestion();
  }

  /**
   * Load existing session
   */
  loadSession(sessionId) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return null;

    this.state = {
      sessionId: session.sessionId,
      userId: session.userId,
      role: session.role,
      level: session.level,
      resumeText: session.resumeText || '',
      currentStageIndex: 0,
      currentStage: this.stageOrder[0],
      askedQuestions: [],
      answers: [],
      interviewStarted: new Date(session.startedAt),
      currentQuestion: null
    };

    return this.getState();
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId) {
    return this.sessionManager.getSessionStats(sessionId);
  }
}

module.exports = EnhancedInterviewEngine;
