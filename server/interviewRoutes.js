/**
 * Interview API Routes - Express endpoints for interview flow
 * POST /interview/start - Begin new interview
 * POST /interview/submit - Submit answer and get next question
 * GET /interview/summary - Get interview results
 * GET /interview/status - Get current interview status
 */

const express = require('express');
const router = express.Router();
const InterviewEngine = require('./InterviewEngine');
const QuestionSelector = require('./QuestionSelector');

// Store active interviews in memory (consider using Redis for production)
const activeInterviews = new Map();

/**
 * POST /interview/start
 * Start a new interview
 * Body: { role, level, allQuestions }
 */
router.post('/start', (req, res) => {
  try {
    const { role = 'any', level = 'mid', allQuestions = [] } = req.body;

    if (!allQuestions || allQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No questions provided. Load questions from dataset first.'
      });
    }

    // Create new interview engine
    const engine = new InterviewEngine(allQuestions);
    const { state, question } = engine.startInterview(role, level);

    // Store interview session
    activeInterviews.set(state.id, engine);

    // Return first question
    res.json({
      success: true,
      interviewId: state.id,
      role,
      level,
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
      error: 'Failed to start interview'
    });
  }
});

/**
 * POST /interview/submit
 * Submit answer and get next question
 * Body: { interviewId, questionId, answer }
 */
router.post('/submit', (req, res) => {
  try {
    const { interviewId, questionId, answer } = req.body;

    if (!interviewId || !questionId || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: interviewId, questionId, answer'
      });
    }

    // Get interview engine
    const engine = activeInterviews.get(interviewId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    // Submit answer and get next question
    const result = engine.submitAnswer(questionId, answer);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Prepare response
    const response = {
      success: true,
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
      error: 'Failed to process answer'
    });
  }
});

/**
 * GET /interview/status
 * Get current interview status
 * Query: ?interviewId=xxx
 */
router.get('/status', (req, res) => {
  try {
    const { interviewId } = req.query;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        error: 'Missing interviewId query parameter'
      });
    }

    const engine = activeInterviews.get(interviewId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const state = engine.getState();
    res.json({
      success: true,
      id: state.id,
      role: state.role,
      level: state.level,
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
      error: 'Failed to get interview status'
    });
  }
});

/**
 * GET /interview/summary
 * Get complete interview summary
 * Query: ?interviewId=xxx
 */
router.get('/summary', (req, res) => {
  try {
    const { interviewId } = req.query;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        error: 'Missing interviewId query parameter'
      });
    }

    const engine = activeInterviews.get(interviewId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const summary = engine.getInterviewSummary();

    // Clean up interview from memory (optional)
    // activeInterviews.delete(interviewId);

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interview summary'
    });
  }
});

/**
 * POST /interview/skip
 * Skip current question (for development/testing)
 * Body: { interviewId }
 */
router.post('/skip', (req, res) => {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        error: 'Missing interviewId'
      });
    }

    const engine = activeInterviews.get(interviewId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const nextQuestion = engine.skipQuestion();

    res.json({
      success: true,
      message: 'Question skipped',
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
      error: 'Failed to skip question'
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
    interviewIds: Array.from(activeInterviews.keys())
  });
});

module.exports = router;
