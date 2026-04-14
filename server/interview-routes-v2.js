/**
 * Enhanced Interview Routes v2.0
 * Integrates:
 * - Resume-aware question filtering
 * - Difficulty progression
 * - Follow-up questions
 * - Analytics tracking
 * - Weakness-based adaptation
 * - Real-time performance feedback
 * - AI-powered answer evaluation (Phi-3)
 */

const express = require('express');
const router = express.Router();
const EnhancedInterviewEngine = require('./EnhancedInterviewEngine');
const questionLoaderModule = require('./questionLoader');
const AIService = require('./services/AIService');

// Store active interviews
const activeInterviews = new Map();

/**
 * POST /interview/v2/start
 * Start enhanced interview with resume and advanced features
 * Body: {
 *   role, level, userId (optional),
 *   resumeText (optional - enables resume-aware filtering)
 * }
 */
router.post('/v2/start', (req, res) => {
  try {
    const {
      role = 'any',
      level = 'mid',
      userId = null,
      resumeText = '',
      allQuestions = null
    } = req.body;

    // Load questions if not provided
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

    // Create enhanced engine
    const engine = new EnhancedInterviewEngine(questions);
    const result = engine.startInterview({
      role,
      level,
      userId,
      resumeText,
      allQuestions: questions
    });

    const { state, question, sessionId, resumeInsights } = result;

    // Store engine
    activeInterviews.set(sessionId, engine);

    res.json({
      success: true,
      sessionId,
      stage: state.currentStage,
      role: state.role,
      level: state.level,
      userId: userId || null,
      
      // Resume insights if provided
      resume_analysis: resumeInsights ? {
        detected_skills: resumeInsights.skills,
        confidence_score: resumeInsights.confidence,
        message: 'Interview questions will be tailored to your resume'
      } : null,

      question: {
        id: question.id,
        text: question.question,
        stage: question.stage,
        difficulty: question.difficulty,
        expectedDuration: question.expected_duration_sec,
        idealPoints: question.ideal_points || []
      },
      
      totalQuestionsInInterview: 25,
      message: 'Enhanced interview started with advanced features enabled'
    });
  } catch (error) {
    console.error('Error starting enhanced interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start interview',
      details: error.message
    });
  }
});

/**
 * POST /interview/v2/submit
 * Submit answer with AI evaluation
 * Body: {
 *   sessionId,
 *   questionId,
 *   answer: { text, depth, clarity, completeness }
 * }
 */
router.post('/v2/submit', async (req, res) => {
  try {
    const { sessionId, questionId, answer } = req.body;

    if (!sessionId || !questionId || !answer || !answer.text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, questionId, answer.text'
      });
    }

    const engine = activeInterviews.get(sessionId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }

    // Get current question
    const question = engine.allQuestions.find(q => q.id === questionId);
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question not found'
      });
    }

    // ===== AI EVALUATION =====
    console.log(`📊 Evaluating answer for question: ${questionId}`);
    
    let answerData = { ...answer };

    // Call AI service (with automatic fallback)
    const aiResult = await AIService.evaluateAnswer({
      question: question.question,
      answer: answer.text,
      idealPoints: question.ideal_points || [],
      questionId: questionId,
      resumeContext: {
        skills: engine.resumeAnalyzer?.resume?.detected_skills || [],
        role: engine.state.role,
        level: engine.state.level
      }
    });

    // Use AI result
    if (aiResult.success) {
      const source = aiResult.source === 'phi3' ? '🤖 Phi-3 AI' : '📊 Local';
      console.log(`${source} evaluation complete (score: ${aiResult.rawScore}/10)`);

      answerData = {
        text: answer.text,
        score: aiResult.score,
        rawScore: aiResult.rawScore,
        correct: aiResult.rawScore >= 6,
        feedback: aiResult.feedback,
        depth: aiResult.depth,
        clarity: aiResult.clarity,
        completeness: aiResult.completeness,
        source: aiResult.source,
        strengths: aiResult.strengths,
        improvements: aiResult.improvements
      };
    } else {
      // Fallback (should rarely happen)
      console.warn('⚠️ AI evaluation failed completely, using basic score');
      answerData = {
        ...answer,
        score: 0.5,
        rawScore: 5,
        correct: false,
        feedback: 'Answer recorded (evaluation unavailable)',
        source: 'error'
      };
    }

    // Submit answer to engine
    const result = engine.submitAnswer(questionId, answerData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Track usage
    try {
      questionLoaderModule.incrementUsage(questionId);
    } catch (err) {
      console.warn('Could not increment usage count:', err.message);
    }

    // Get real-time performance
    const performance = engine.getPerformanceSnapshot();

    const response = {
      success: true,
      sessionId,
      stage: engine.state.currentStage,
      questionsAsked: engine.state.askedQuestions.length,
      interviewComplete: result.interviewComplete,
      
      // AI Evaluation details
      evaluation: {
        aiPowered: aiResult.source === 'phi3',
        source: aiResult.source,
        score: answerData.score,
        rawScore: answerData.rawScore || Math.round(answerData.score * 10),
        feedback: answerData.feedback,
        strengths: answerData.strengths || [],
        improvements: answerData.improvements || []
      },
      
      // Real-time performance
      performance: performance ? {
        current_score: performance.current_score,
        accuracy: performance.accuracy + '%',
        strengths: performance.strengths,
        weaknesses: performance.weaknesses,
        trend: performance.performance_trend
      } : null
    };

    // Add next question
    if (result.nextQuestion) {
      response.question = {
        id: result.nextQuestion.id,
        text: result.nextQuestion.question,
        stage: result.nextQuestion.stage,
        difficulty: result.nextQuestion.difficulty,
        expectedDuration: result.nextQuestion.expected_duration_sec,
        is_follow_up: result.nextQuestion.is_follow_up || false,
        parent_question: result.nextQuestion.parent_question || null,
        idealPoints: result.nextQuestion.ideal_points || []
      };
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
 * POST /interview/v2/complete
 * Complete interview and get comprehensive report
 * Body: { sessionId }
 */
router.post('/v2/complete', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId'
      });
    }

    const engine = activeInterviews.get(sessionId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }

    // Complete and generate report
    const report = engine.completeInterview();

    // Remove from active interviews
    activeInterviews.delete(sessionId);

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete interview',
      details: error.message
    });
  }
});

/**
 * GET /interview/v2/performance
 * Get real-time performance snapshot
 * Query: ?sessionId=xxx
 */
router.get('/v2/performance', (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId query parameter'
      });
    }

    const engine = activeInterviews.get(sessionId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }

    const performance = engine.getPerformanceSnapshot();

    res.json({
      success: true,
      sessionId,
      performance
    });
  } catch (error) {
    console.error('Error getting performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance data',
      details: error.message
    });
  }
});

/**
 * GET /interview/v2/analytics
 * Get detailed analytics for current interview
 * Query: ?sessionId=xxx
 */
router.get('/v2/analytics', (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId'
      });
    }

    const engine = activeInterviews.get(sessionId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (!engine.analyticsTracker) {
      return res.status(400).json({
        success: false,
        error: 'No analytics data available yet'
      });
    }

    const analytics = engine.analyticsTracker.generateAnalyticsReport();

    res.json({
      success: true,
      sessionId,
      analytics
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      details: error.message
    });
  }
});

/**
 * GET /interview/v2/weaknesses
 * Get identified weak areas and remediation plan
 * Query: ?sessionId=xxx
 */
router.get('/v2/weaknesses', (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId'
      });
    }

    const engine = activeInterviews.get(sessionId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (!engine.analyticsTracker) {
      return res.status(400).json({
        success: false,
        error: 'Not enough data for weakness analysis'
      });
    }

    const analyticsData = engine.analyticsTracker.getInterviewSummary();
    const weaknessAnalysis = engine.weaknessAdapter.analyzeWeaknesses(analyticsData);

    res.json({
      success: true,
      sessionId,
      weakness_analysis: weaknessAnalysis,
      readiness: engine.weaknessAdapter.assessReadiness(weaknessAnalysis),
      remediation_plan: engine.weaknessAdapter.generateRemediationPlan(weaknessAnalysis, 60),
      follow_up_topics: engine.weaknessAdapter.getSuggestedFollowUpTopics(weaknessAnalysis)
    });
  } catch (error) {
    console.error('Error analyzing weaknesses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze weaknesses',
      details: error.message
    });
  }
});

/**
 * POST /interview/v2/resume-analysis
 * Analyze resume for skill detection
 * Body: { resumeText }
 * (Does NOT require an active interview)
 */
router.post('/v2/resume-analysis', (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Resume text must be at least 50 characters'
      });
    }

    // Create analyzer
    const ResumeAnalyzer = require('./services/ResumeAnalyzer');
    const analyzer = new ResumeAnalyzer();
    const analysis = analyzer.analyzeResume(resumeText);

    res.json({
      success: true,
      analysis,
      message: 'Resume analyzed successfully'
    });
  } catch (error) {
    console.error('Error analyzing resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze resume',
      details: error.message
    });
  }
});

/**
 * GET /interview/v2/status
 * Get current interview status with enhanced data
 * Query: ?sessionId=xxx
 */
router.get('/v2/status', (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId'
      });
    }

    const engine = activeInterviews.get(sessionId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const state = engine.getState();
    const performance = engine.getPerformanceSnapshot();

    res.json({
      success: true,
      sessionId,
      stage: state.currentStage,
      role: state.role,
      level: state.level,
      questionsAsked: state.askedQuestions.length,
      elapsedMinutes: Math.round((new Date() - state.interviewStarted) / 60000),
      currentQuestion: state.currentQuestion ? {
        id: state.currentQuestion.id,
        text: state.currentQuestion.question,
        is_follow_up: state.currentQuestion.is_follow_up || false
      } : null,
      performance: performance
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      details: error.message
    });
  }
});

/**
 * POST /interview/v2/skip
 * Skip current question
 * Body: { sessionId }
 */
router.post('/v2/skip', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId'
      });
    }

    const engine = activeInterviews.get(sessionId);
    if (!engine) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const nextQuestion = engine.skipQuestion();

    res.json({
      success: true,
      message: 'Question skipped',
      sessionId,
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
 * GET /interview/v2/info
 * Get information about active interviews
 */
router.get('/v2/info', (req, res) => {
  res.json({
    success: true,
    activeInterviews: activeInterviews.size,
    sessionIds: Array.from(activeInterviews.keys()),
    timestamp: new Date()
  });
});

/**
 * GET /interview/v2/ai-status
 * Check AI service health and availability
 */
router.get('/v2/ai-status', async (req, res) => {
  try {
    const status = await AIService.checkHealth();
    
    res.json({
      success: true,
      aiService: status,
      timestamp: new Date().toISOString(),
      mode: status.healthy ? '✅ AI-Powered' : '⚠️ Fallback Mode'
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check AI status',
      mode: '⚠️ Fallback Mode'
    });
  }
});

/**
 * POST /interview/v2/generate-questions
 * Generate interview questions using Phi-3 AI
 * Body: {
 *   resumeText (optional),
 *   role (optional, default: backend),
 *   level (optional, default: mid),
 *   skills (optional, array),
 *   count (optional, default: 10)
 * }
 */
router.post('/v2/generate-questions', async (req, res) => {
  try {
    const {
      resumeText = '',
      role = 'backend',
      level = 'mid',
      skills = [],
      count = 10
    } = req.body;

    console.log(`🤖 Generating ${count} questions with Phi-3...`);
    
    const result = await AIService.generateQuestions({
      resume: resumeText,
      role,
      level,
      skills,
      count
    });

    if (result.success) {
      res.json({
        success: true,
        questions: result.questions,
        source: 'phi3_ai',
        message: `Generated ${result.questions.length} questions`
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Question generation failed',
        details: result.error,
        note: 'Use standard question loader as fallback'
      });
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate questions',
      details: error.message
    });
  }
});


module.exports = router;
