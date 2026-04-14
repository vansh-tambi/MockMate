/**
 * AIServiceIntegration.js
 * 
 * Bridge between Node.js server and Python AI Service (Ollama Phi-3)
 * 
 * Handles:
 * - Answer evaluation with scoring rubric
 * - Question generation based on resume
 * - Follow-up question suggestions
 * - Session management with AI context
 * 
 * Fallback: If AI service unavailable, uses local algorithms
 */

const axios = require('axios');

class AIServiceIntegration {
  constructor(aiServiceUrl = 'http://localhost:8000') {
    this.aiServiceUrl = aiServiceUrl;
    this.timeout = 60000; // 60 second timeout for Phi-3 responses
    this.isHealthy = false;
    this.lastHealthCheck = null;
    
    // Initialize health check
    this.checkHealth();
  }

  /**
   * Check if AI service is running and healthy
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000
      });
      
      this.isHealthy = true;
      this.lastHealthCheck = new Date();
      
      console.log('✅ AI Service (Phi-3) is healthy and ready');
      return {
        healthy: true,
        status: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      
      console.warn('⚠️ AI Service not available:', err.message);
      return {
        healthy: false,
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Evaluate answer using Phi-3 LLM
   * 
   * @param {string} question - Interview question
   * @param {string} userAnswer - Candidate's answer
   * @param {array} idealPoints - Expected talking points
   * @param {string} questionId - Question ID
   * @param {object} resumeContext - Candidate's resume context
   * @returns {Promise<object>} - Evaluation with score, strengths, improvements
   */
  async evaluateAnswer(question, userAnswer, idealPoints = [], questionId = null, resumeContext = null) {
    // If AI service is down, use fallback local evaluation
    if (!this.isHealthy) {
      return this.localEvaluateAnswer(question, userAnswer, idealPoints);
    }

    try {
      const payload = {
        question,
        user_answer: userAnswer,
        ideal_points: idealPoints,
        question_id: questionId,
        resume_context: resumeContext || {}
      };

      const response = await axios.post(
        `${this.aiServiceUrl}/evaluate`,
        payload,
        { timeout: this.timeout }
      );

      // Convert Phi-3 score (0-10) to local format (0-1)
      const evaluation = response.data;
      const normalizedScore = evaluation.score / 10;
      
      console.log(`✅ Answer evaluated by Phi-3 (score: ${evaluation.score}/10)`);

      return {
        success: true,
        source: 'phi3',
        score: normalizedScore,
        rawScore: evaluation.score,
        strengths: evaluation.strengths || [],
        improvements: evaluation.improvements || [],
        feedback: evaluation.feedback || '',
        missedOpportunities: evaluation.missed_opportunities || [],
        depth: this.calculateDepth(userAnswer),
        clarity: this.calculateClarity(evaluation.feedback),
        completeness: this.calculateCompleteness(userAnswer, idealPoints),
        followUps: evaluation.follow_ups || []
      };
    } catch (err) {
      console.warn('⚠️ Phi-3 evaluation failed, using fallback:', err.message);
      return this.localEvaluateAnswer(question, userAnswer, idealPoints);
    }
  }

  /**
   * Generate interview questions using Phi-3
   * 
   * @param {string} resumeText - Candidate's resume
   * @param {string} role - Target role (backend, frontend, fullstack, etc)
   * @param {string} level - Experience level (junior, mid, senior)
   * @param {array} skills - Key skills to focus on
   * @param {integer} count - Number of questions to generate
   * @returns {Promise<array>} - Generated questions
   */
  async generateQuestions(resumeText, role = 'backend', level = 'mid', skills = [], count = 10) {
    if (!this.isHealthy) {
      return this.localGenerateQuestions(resumeText, role, level, skills, count);
    }

    try {
      const payload = {
        resume: resumeText,
        target_role: role,
        experience_level: level,
        skills: skills,
        questionCount: count,
        interview_mode: 'comprehensive'
      };

      const response = await axios.post(
        `${this.aiServiceUrl}/api/generate-qa`,
        payload,
        { timeout: this.timeout }
      );

      const questions = response.data.qaPairs || [];
      
      console.log(`✅ Generated ${questions.length} questions with Phi-3`);

      return {
        success: true,
        source: 'phi3',
        questions: questions,
        sessionId: response.data.session_id,
        currentPhase: response.data.current_phase,
        statistics: response.data.statistics
      };
    } catch (err) {
      console.warn('⚠️ Phi-3 question generation failed, using fallback:', err.message);
      return {
        success: false,
        source: 'fallback',
        questions: [],
        error: err.message
      };
    }
  }

  /**
   * Generate follow-up questions for deeper exploration
   * 
   * @param {string} originalQuestion - Original interview question
   * @param {string} userAnswer - Candidate's answer
   * @param {array} idealPoints - Expected concepts
   * @param {string} evaluationFeedback - Feedback from evaluation
   * @returns {Promise<array>} - Suggested follow-ups
   */
  async generateFollowUps(originalQuestion, userAnswer, idealPoints = [], evaluationFeedback = '') {
    if (!this.isHealthy) {
      return this.localGenerateFollowUps(originalQuestion, userAnswer, idealPoints);
    }

    try {
      const prompt = `Based on this interview interaction, suggest 2-3 targeted follow-up questions that would help evaluate deeper understanding.

Original Question: ${originalQuestion}

Expected Talking Points:
${idealPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Candidate's Answer:
${userAnswer}

Evaluation Feedback:
${evaluationFeedback}

Requirements:
- Each follow-up should drill deeper into 1 specific concept
- Make them progressively harder
- Include reasoning for why each follow-up is asked
- Format as JSON array with structure: { "question": "...", "reason": "...", "difficulty": 2-3 }`;

      const response = await axios.post(
        `${this.aiServiceUrl}/evaluate`,
        {
          question: prompt,
          user_answer: '',
          ideal_points: ['Valid JSON response with follow-up questions']
        },
        { timeout: 30000 }
      );

      // Parse follow-ups from response
      const followUps = this.parseFollowUps(response.data.feedback);
      
      console.log(`✅ Generated ${followUps.length} follow-ups with Phi-3`);

      return {
        success: true,
        source: 'phi3',
        followUps: followUps
      };
    } catch (err) {
      console.warn('⚠️ Phi-3 follow-up generation failed:', err.message);
      return {
        success: false,
        source: 'fallback',
        followUps: [],
        error: err.message
      };
    }
  }

  /**
   * Get session data from AI service
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<object>} - Session data
   */
  async getSessionData(sessionId) {
    if (!this.isHealthy) {
      return { success: false, error: 'AI Service unavailable' };
    }

    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/session`,
        {
          session_id: sessionId,
          action: 'get'
        },
        { timeout: 5000 }
      );

      return {
        success: true,
        session: response.data
      };
    } catch (err) {
      console.warn('⚠️ Failed to get session data:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Create session in AI service
   * 
   * @returns {Promise<string>} - Session ID
   */
  async createSession() {
    if (!this.isHealthy) {
      return { success: false, error: 'AI Service unavailable' };
    }

    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/session`,
        { action: 'create' },
        { timeout: 5000 }
      );

      return {
        success: true,
        sessionId: response.data.session_id,
        statistics: response.data.statistics
      };
    } catch (err) {
      console.warn('⚠️ Failed to create session:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  // ==================== LOCAL FALLBACK IMPLEMENTATIONS ====================

  /**
   * Local evaluation fallback - uses regex and heuristics
   */
  localEvaluateAnswer(question, userAnswer, idealPoints = []) {
    // Calculate basic metrics
    const answerLength = userAnswer.split(' ').length;
    const minLength = 30;
    const maxLength = 500;
    
    // Score based on answer length and ideal points coverage
    let score = 0.5;
    
    if (answerLength < minLength) {
      score = 0.3; // Too short
    } else if (answerLength > maxLength) {
      score = 0.7; // Good length but might be too verbose
    } else {
      score = 0.6; // Reasonable length
    }

    // Check for ideal points coverage
    const lowerAnswer = userAnswer.toLowerCase();
    let pointsCovered = 0;
    
    if (idealPoints.length > 0) {
      for (const point of idealPoints) {
        if (lowerAnswer.includes(point.toLowerCase())) {
          pointsCovered++;
        }
      }
      const coverage = pointsCovered / idealPoints.length;
      score = 0.3 + (coverage * 0.7); // Score based on coverage
    }

    return {
      success: true,
      source: 'local_fallback',
      score: Math.min(1, score),
      rawScore: Math.round(score * 10),
      strengths: [
        'Answer was provided',
        answerLength > minLength ? 'Answer has sufficient length' : 'Could expand on the answer'
      ],
      improvements: [
        answerLength < minLength ? 'Provide a more detailed answer' : null,
        pointsCovered < idealPoints.length ? `Consider addressing all key points: ${idealPoints.slice(0, 2).join(', ')}` : null
      ].filter(Boolean),
      feedback: `Answer has ${answerLength} words. Covered ${pointsCovered}/${idealPoints.length} expected points (${Math.round(pointsCovered/idealPoints.length*100)}%)`,
      missedOpportunities: idealPoints.slice(pointsCovered),
      depth: Math.max(0.3, Math.min(0.9, answerLength / maxLength)),
      clarity: 0.6,
      completeness: Math.max(0.3, (pointsCovered / Math.max(1, idealPoints.length))),
      followUps: []
    };
  }

  /**
   * Local question generation fallback
   */
  localGenerateQuestions(resumeText, role, level, skills, count) {
    // This would use the existing questions from ai_service/data
    // Already handled by the main server, so return empty
    return {
      success: false,
      source: 'fallback',
      questions: [],
      note: 'Use main question loader from ai_service/data'
    };
  }

  /**
   * Local follow-up generation fallback
   */
  localGenerateFollowUps(originalQuestion, userAnswer, idealPoints) {
    // Generate basic follow-ups based on patterns
    const followUps = [];

    if (userAnswer.length < 100) {
      followUps.push({
        question: `Can you elaborate more on that?`,
        reason: 'Answer was brief and needs expansion',
        difficulty: 1
      });
    }

    if (idealPoints.length > 0) {
      followUps.push({
        question: `How does this relate to ${idealPoints[0]}?`,
        reason: 'Exploring connection to key concept',
        difficulty: 2
      });
    }

    return {
      success: true,
      source: 'local_fallback',
      followUps: followUps.slice(0, 2)
    };
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Calculate depth metric (0-1)
   */
  calculateDepth(answer) {
    const wordCount = answer.split(' ').length;
    const hasExamples = /example|like|such as|for instance/i.test(answer);
    const hasExplanation = /because|therefore|results in|leads to|causes/i.test(answer);
    
    let depth = Math.max(0.3, Math.min(0.95, wordCount / 200));
    if (hasExamples) depth += 0.15;
    if (hasExplanation) depth += 0.1;
    
    return Math.min(1, depth);
  }

  /**
   * Calculate clarity metric (0-1) based on feedback
   */
  calculateClarity(feedback) {
    if (!feedback) return 0.5;
    
    const hasPositiveFeedback = /clear|clear|well|good|strong|excellent/i.test(feedback);
    const hasNegativeFeedback = /unclear|vague|confusing|difficult|hard/i.test(feedback);
    
    let clarity = 0.5;
    if (hasPositiveFeedback) clarity += 0.3;
    if (hasNegativeFeedback) clarity -= 0.3;
    
    return Math.max(0.2, Math.min(1, clarity));
  }

  /**
   * Calculate completeness metric (0-1)
   */
  calculateCompleteness(answer, idealPoints) {
    if (idealPoints.length === 0) return 0.6;
    
    const lowerAnswer = answer.toLowerCase();
    let pointsMatched = 0;
    
    for (const point of idealPoints) {
      if (lowerAnswer.includes(point.toLowerCase())) {
        pointsMatched++;
      }
    }
    
    return pointsMatched / idealPoints.length;
  }

  /**
   * Parse follow-ups from LLM response
   */
  parseFollowUps(response) {
    try {
      // Try to find JSON in response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]).slice(0, 3);
      }
    } catch (err) {
      console.warn('Failed to parse follow-ups:', err.message);
    }
    
    return [];
  }

  /**
   * Get health status
   */
  getStatus() {
    return {
      healthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      uptime: this.isHealthy ? 'Connected to Phi-3' : 'Using local fallback'
    };
  }
}

module.exports = AIServiceIntegration;
