/**
 * Interview API Routes - Express endpoints for interview flow
 * Integrates with SessionManager for persistent question tracking
 * POST /interview/start - Begin new interview
 * POST /interview/submit - Submit answer and get next question
 * GET /interview/summary - Get interview results
 * GET /interview/status - Get current interview status
 */

const express = require('express');
const router = express.Router();
const InterviewEngine = require('./InterviewEngine');
const questionLoaderModule = require('./questionLoader');

// Store active interviews in memory (consider using Redis for production)
const activeInterviews = new Map();

/**
 * POST /interview/start
 * Start a new interview with session persistence
 * Body: { role, level, userId (optional), allQuestions (optional - loads from dataset if not provided) }
 */
router.post('/start', (req, res) => {
  try {
    const { role = 'any', level = 'mid', userId = null, allQuestions = null } = req.body;

    // Load questions from dataset if not provided
    let questions = allQuestions;
    if (!questions || questions.length === 0) {
      questions = questionLoaderModule.getAllQuestions();
      if (questions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No questions available. Load questions from /api/questions/load first.'
        });
      }
    }

    // Create new interview engine
    const engine = new InterviewEngine(questions);
    const { state, question, sessionId } = engine.startInterview(role, level, userId);

    // Store interview session (indexed by sessionId)
    activeInterviews.set(state.sessionId, engine);

    // Return first question
    res.json({
      success: true,
      sessionId: state.sessionId,
      interviewId: state.sessionId,  // For backwards compatibility
      role,
      level,
      userId: userId || null,
      message: `Starting interview - first stage: ${state.currentStage}`,
      question: {
        id: question.id,
        text: question.question,
        stage: question.stage,
        difficulty: question.difficulty,
        expectedDuration: question.expected_duration_sec,
        idealPoints: question.ideal_points || []
      },
      totalQuestionsInInterview: 21 // Default 21 total
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start interview',
      details: error.message
    });
  }
});

/**
 * POST /interview/submit
 * Submit answer and get next question
 * Automatically tracks usage and prevents repeats
 * Body: { interviewId (or sessionId), questionId, answer }
 */
router.post('/submit', (req, res) => {
  try {
    const { interviewId, sessionId, questionId, answer } = req.body;
    const id = sessionId || interviewId;

    if (!id || !questionId || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, questionId, answer'
      });
    }

    // Get interview engine
    const engine = activeInterviews.get(id);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }

    // Submit answer and get next question
    const result = engine.submitAnswer(questionId, answer);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Increment usage count for the just-answered question
    try {
      questionLoaderModule.incrementUsage(questionId);
    } catch (err) {
      console.warn('Could not increment usage count:', err.message);
      // Don't fail the request if usage tracking fails
    }

    // Prepare response
    const response = {
      success: true,
      sessionId: engine.state.sessionId,
      stage: engine.state.currentStage,
      questionsAskedInStage: engine.state.askedQuestions.filter(
        q => q.stage === engine.state.currentStage
      ).length,
      totalQuestionsAsked: engine.state.askedQuestions.length,
      interviewComplete: result.interviewComplete
    };

    // Add next question if not complete
    if (result.nextQuestion) {
      response.question = {
        id: result.nextQuestion.id,
        text: result.nextQuestion.question,
        stage: result.nextQuestion.stage,
        difficulty: result.nextQuestion.difficulty,
        expectedDuration: result.nextQuestion.expected_duration_sec,
        idealPoints: result.nextQuestion.ideal_points || [],
        evaluationRubric: result.nextQuestion.evaluation_rubric || {}
      };
    } else {
      response.message = 'Interview complete! See summary endpoint.';
    }

    res.json(response);
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process answer',
      details: error.message
    });
  }
});

/**
 * GET /interview/status
 * Get current interview status
 * Query: ?sessionId=xxx or ?interviewId=xxx
 */
router.get('/status', (req, res) => {
  try {
    const { interviewId, sessionId } = req.query;
    const id = sessionId || interviewId;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or interviewId query parameter'
      });
    }

    const engine = activeInterviews.get(id);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }

    const state = engine.getState();
    res.json({
      success: true,
      sessionId: state.sessionId,
      id: state.sessionId,
      role: state.role,
      level: state.level,
      userId: state.userId || null,
      currentStage: state.currentStage,
      questionsAsked: state.askedQuestions.length,
      stageProgress: engine._getStageBreakdown(),
      currentQuestion: state.currentQuestion ? {
        id: state.currentQuestion.id,
        text: state.currentQuestion.question
      } : null,
      elapsedMinutes: Math.round((new Date() - state.interviewStarted) / 60000)
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interview status',
      details: error.message
    });
  }
});

/**
 * GET /interview/summary
 * Get complete interview summary
 * Query: ?sessionId=xxx or ?interviewId=xxx
 */
router.get('/summary', (req, res) => {
  try {
    const { interviewId, sessionId } = req.query;
    const id = sessionId || interviewId;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or interviewId query parameter'
      });
    }

    const engine = activeInterviews.get(id);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }

    const summary = engine.getInterviewSummary();

    // Optionally clean up interview from memory after summary retrieved
    // activeInterviews.delete(id);

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interview summary',
      details: error.message
    });
  }
});

/**
 * POST /interview/skip
 * Skip current question (for development/testing)
 * Body: { sessionId (or interviewId) }
 */
router.post('/skip', (req, res) => {
  try {
    const { interviewId, sessionId } = req.body;
    const id = sessionId || interviewId;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or interviewId'
      });
    }

    const engine = activeInterviews.get(id);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }

    const nextQuestion = engine.skipQuestion();

    res.json({
      success: true,
      message: 'Question skipped',
      sessionId: engine.state.sessionId,
      nextQuestion: nextQuestion ? {
        id: nextQuestion.id,
        text: nextQuestion.question,
        stage: nextQuestion.stage
      } : null,
      interviewComplete: !nextQuestion
    });
  } catch (error) {
    console.error('Error skipping question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to skip question',
      details: error.message
    });
  }
});

/**
 * GET /interview/info
 * Get information about active interviews (for admin)
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    activeInterviews: activeInterviews.size,
    sessionIds: Array.from(activeInterviews.keys()),
    usageStats: questionLoaderModule.getAllUsageStats && questionLoaderModule.getAllUsageStats()
  });
});

/**
 * GET /interview/usage-stats
 * Get current question usage statistics
 * Useful for monitoring which questions are being asked most
 */
router.get('/usage-stats', (req, res) => {
  try {
    const stats = questionLoaderModule.getAllUsageStats ? questionLoaderModule.getAllUsageStats() : {};
    const sortedStats = Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)  // Top 20
      .map(([id, count]) => ({ questionId: id, usageCount: count }));

    res.json({
      success: true,
      totalQuestionIds: Object.keys(stats).length,
      topUsed: sortedStats,
      allStats: stats
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
});

module.exports = router;

