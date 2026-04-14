/**
 * AIService.js
 * Simple bridge between Node.js server and Python AI Service
 * 
 * If AI service fails → falls back to local evaluation
 * If Ollama fails → platform still works
 */

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT = 10000; // 10 second timeout

/**
 * Main function: Evaluate answer using Phi-3 AI
 * Falls back to local evaluation if AI unavailable
 */
async function evaluateAnswer({
  question,
  answer,
  idealPoints = [],
  questionId = null,
  resumeContext = null
}) {
  try {
    // Call Python AI service
    const response = await axios.post(
      `${AI_SERVICE_URL}/evaluate`,
      {
        question,
        user_answer: answer,
        ideal_points: idealPoints,
        question_id: questionId,
        resume_context: resumeContext || {}
      },
      { timeout: AI_TIMEOUT }
    );

    // Convert Phi-3 score (0-10) to normalized format (0-1)
    const data = response.data;
    const score = data.score ? data.score / 10 : 0.5;

    console.log(`✅ AI evaluation successful (score: ${data.score}/10)`);

    return {
      success: true,
      source: 'phi3',
      score: Math.min(1, score),
      rawScore: data.score,
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      feedback: data.feedback || 'Answer evaluated by Phi-3',
      depth: calculateDepth(answer),
      clarity: 0.7,
      completeness: calculateCompleteness(answer, idealPoints)
    };
  } catch (error) {
    console.warn(`⚠️ AI service failed (${error.message}), using local evaluation`);
    return localEvaluateAnswer(question, answer, idealPoints);
  }
}

/**
 * Generate questions using Phi-3
 */
async function generateQuestions({
  resume = '',
  role = 'backend',
  level = 'mid',
  skills = [],
  count = 10
}) {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/generate-qa`,
      {
        resume,
        target_role: role,
        experience_level: level,
        skills,
        questionCount: count
      },
      { timeout: 30000 }
    );

    console.log(`✅ Generated ${response.data.qaPairs?.length || 0} questions with Phi-3`);

    return {
      success: true,
      source: 'phi3',
      questions: response.data.qaPairs || []
    };
  } catch (error) {
    console.warn(`⚠️ Question generation failed: ${error.message}`);
    return {
      success: false,
      source: 'error',
      questions: [],
      error: error.message
    };
  }
}

/**
 * Check if AI service is healthy
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, {
      timeout: 5000
    });

    console.log('✅ AI Service is healthy');
    return {
      healthy: true,
      status: response.data
    };
  } catch (error) {
    console.warn(`⚠️ AI Service unavailable: ${error.message}`);
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * LOCAL FALLBACK: If AI service is down, use local evaluation
 */
function localEvaluateAnswer(question, answer, idealPoints = []) {
  const wordCount = answer.split(' ').length;
  const minWords = 30;

  // Scoring logic
  let score = 0.5;

  if (wordCount < minWords) {
    score = 0.3; // Too short
  } else if (wordCount > 200) {
    score = 0.7; // Good length
  } else {
    score = 0.6; // Acceptable
  }

  // Check ideal points coverage
  if (idealPoints.length > 0) {
    const lowerAnswer = answer.toLowerCase();
    let covered = 0;

    for (const point of idealPoints) {
      if (lowerAnswer.includes(point.toLowerCase())) {
        covered++;
      }
    }

    const coverage = covered / idealPoints.length;
    score = Math.max(0.3, Math.min(1, 0.3 + coverage * 0.7));
  }

  console.log(`📊 Local evaluation (fallback): score ${score}`);

  return {
    success: true,
    source: 'local_fallback',
    score,
    rawScore: Math.round(score * 10),
    strengths: ['Answer provided'],
    improvements: score < 0.6 ? ['Provide more detail', 'Cover all key points'] : [],
    feedback: `Answer evaluated locally. Length: ${wordCount} words. Consider more details.`,
    depth: Math.max(0.3, Math.min(1, wordCount / 300)),
    clarity: 0.6,
    completeness: idealPoints.length > 0 ? Math.max(0.3, score) : 0.6
  };
}

/**
 * Utility: Calculate answer depth
 */
function calculateDepth(answer) {
  const hasExamples = /example|like|such as|for instance|e\.g/i.test(answer);
  const hasExplanation = /because|therefore|results in|leads to|causes|means/i.test(answer);

  let depth = Math.min(1, Math.max(0.2, answer.length / 500));
  if (hasExamples) depth += 0.15;
  if (hasExplanation) depth += 0.1;

  return Math.min(1, depth);
}

/**
 * Utility: Calculate completeness
 */
function calculateCompleteness(answer, idealPoints) {
  if (!idealPoints || idealPoints.length === 0) return 0.6;

  const lowerAnswer = answer.toLowerCase();
  let matched = 0;

  for (const point of idealPoints) {
    if (lowerAnswer.includes(point.toLowerCase())) {
      matched++;
    }
  }

  return matched / idealPoints.length;
}

module.exports = {
  evaluateAnswer,
  generateQuestions,
  checkHealth
};
