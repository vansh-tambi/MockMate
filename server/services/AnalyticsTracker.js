/**
 * AnalyticsTracker - Comprehensive interview performance tracking
 * Tracks scores by category, identifies strengths/weaknesses
 * Provides actionable insights and progress tracking over time
 */

const fs = require('fs');
const path = require('path');

class AnalyticsTracker {
  constructor(userId = null) {
    this.userId = userId;
    this.sessionId = null;
    this.startTime = new Date();
    
    // Current session metrics
    this.categoryScores = {};
    this.questionMetrics = [];
    this.stageMetrics = {};
    this.overallMetrics = {
      total_questions: 0,
      correct_answers: 0,
      avg_score: 0,
      strongest_category: null,
      weakest_category: null
    };

    // User profile (across sessions)
    this.userProfile = this._loadUserProfile();
  }

  /**
   * Load user profile from storage
   * @private
   */
  _loadUserProfile() {
    if (!this.userId) {
      return {
        sessions: [],
        total_interviews: 0,
        overall_average: 0,
        category_history: {},
        progress_over_time: []
      };
    }

    try {
      const profilePath = this._getUserProfilePath();
      if (fs.existsSync(profilePath)) {
        return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
      }
    } catch (err) {
      console.warn('Could not load user profile:', err.message);
    }

    return {
      sessions: [],
      total_interviews: 0,
      overall_average: 0,
      category_history: {},
      progress_over_time: []
    };
  }

  /**
   * Track answer to a question
   * @param {Object} questionData - Question information
   * @param {Object} scoreData - Score and evaluation data
   */
  trackAnswer(questionData, scoreData) {
    const {
      id: questionId,
      stage,
      skill,
      category,
      difficulty
    } = questionData;

    const {
      score = 0.5,
      correct = false,
      evaluation = ''
    } = scoreData;

    // Initialize category if needed
    if (!this.categoryScores[skill]) {
      this.categoryScores[skill] = {
        category: skill,
        total: 0,
        correct: 0,
        scores: [],
        avg_score: 0,
        questions: []
      };
    }

    // Initialize stage if needed
    if (!this.stageMetrics[stage]) {
      this.stageMetrics[stage] = {
        stage,
        total: 0,
        correct: 0,
        avg_score: 0
      };
    }

    // Record question metric
    const questionMetric = {
      question_id: questionId,
      stage,
      skill,
      category,
      difficulty,
      score,
      correct,
      timestamp: new Date(),
      evaluation
    };

    this.questionMetrics.push(questionMetric);

    // Update category scores
    const catData = this.categoryScores[skill];
    catData.total++;
    catData.scores.push(score);
    catData.questions.push(questionId);
    if (correct) catData.correct++;
    catData.avg_score = catData.scores.reduce((a, b) => a + b, 0) / catData.scores.length;

    // Update stage metrics
    const stageData = this.stageMetrics[stage];
    stageData.total++;
    stageData.correct += correct ? 1 : 0;
    stageData.avg_score = (stageData.avg_score * (stageData.total - 1) + score) / stageData.total;

    // Update overall metrics
    this.overallMetrics.total_questions++;
    this.overallMetrics.correct_answers += correct ? 1 : 0;
    this.overallMetrics.avg_score = (this.overallMetrics.avg_score * (this.overallMetrics.total_questions - 1) + score) / this.overallMetrics.total_questions;
  }

  /**
   * Get comprehensive interview summary
   * @returns {Object} Summary of current interview
   */
  getInterviewSummary() {
    const duration = (new Date() - this.startTime) / 1000; // seconds

    const categoryRanking = Object.values(this.categoryScores)
      .map(cat => ({
        category: cat.category,
        score: Number(cat.avg_score.toFixed(2)),
        count: cat.total,
        correct: cat.correct
      }))
      .sort((a, b) => b.score - a.score);

    const stageRanking = Object.values(this.stageMetrics)
      .map(stage => ({
        stage: stage.stage,
        score: Number(stage.avg_score.toFixed(2)),
        count: stage.total,
        correct: stage.correct
      }));

    return {
      interview_stats: {
        total_questions: this.overallMetrics.total_questions,
        correct_answers: this.overallMetrics.correct_answers,
        accuracy: this.overallMetrics.total_questions > 0
          ? Number((this.overallMetrics.correct_answers / this.overallMetrics.total_questions * 100).toFixed(1))
          : 0,
        overall_score: Number(this.overallMetrics.avg_score.toFixed(2)),
        duration_minutes: Number((duration / 60).toFixed(1)),
        started_at: this.startTime,
        completed_at: new Date()
      },
      by_category: categoryRanking,
      by_stage: stageRanking,
      strengths: this._identifyStrengths(),
      weaknesses: this._identifyWeaknesses(),
      insights: this._generateInsights()
    };
  }

  /**
   * Identify strength areas (high score, multiple questions)
   * @private
   */
  _identifyStrengths() {
    return Object.values(this.categoryScores)
      .filter(cat => cat.total >= 2 && cat.avg_score >= 0.7)
      .sort((a, b) => b.avg_score - a.avg_score)
      .map(cat => ({
        category: cat.category,
        score: Number(cat.avg_score.toFixed(2)),
        confidence: this._scoreToConfidence(cat.avg_score)
      }));
  }

  /**
   * Identify weakness areas (low score, multiple questions)
   * @private
   */
  _identifyWeaknesses() {
    return Object.values(this.categoryScores)
      .filter(cat => cat.total >= 2 && cat.avg_score < 0.6)
      .sort((a, b) => a.avg_score - b.avg_score)
      .map(cat => ({
        category: cat.category,
        score: Number(cat.avg_score.toFixed(2)),
        improvement_potential: this._calculateImprovementPotential(cat)
      }));
  }

  /**
   * Convert score to confidence level
   * @private
   */
  _scoreToConfidence(score) {
    if (score >= 0.85) return 'Very Strong';
    if (score >= 0.70) return 'Strong';
    if (score >= 0.55) return 'Moderate';
    if (score >= 0.40) return 'Developing';
    return 'Needs Work';
  }

  /**
   * Calculate improvement potential for weak areas
   * @private
   */
  _calculateImprovementPotential(categoryData) {
    const variance = this._calculateVariance(categoryData.scores);
    
    if (variance > 0.2) {
      return 'High - Performance inconsistent, targeted practice recommended';
    }
    return 'Moderate - Consistent practice needed';
  }

  /**
   * Calculate variance in scores
   * @private
   */
  _calculateVariance(scores) {
    if (scores.length < 2) return 0;
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Generate actionable insights
   * @private
   */
  _generateInsights() {
    const insights = [];

    const weaknesses = this._identifyWeaknesses();
    if (weaknesses.length > 0) {
      insights.push({
        type: 'focus_area',
        message: `Focus on ${weaknesses[0].category} - Your lowest scoring category`,
        priority: 'high'
      });
    }

    const strengths = this._identifyStrengths();
    if (strengths.length > 0) {
      insights.push({
        type: 'strength',
        message: `Great performance in ${strengths[0].category} - Keep leveraging this!`,
        priority: 'info'
      });
    }

    // Check for improvement trend
    if (this.questionMetrics.length > 5) {
      const firstHalf = this.questionMetrics.slice(0, Math.floor(this.questionMetrics.length / 2));
      const secondHalf = this.questionMetrics.slice(Math.floor(this.questionMetrics.length / 2));
      
      const avgFirst = firstHalf.reduce((sum, q) => sum + q.score, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, q) => sum + q.score, 0) / secondHalf.length;

      if (avgSecond > avgFirst + 0.1) {
        insights.push({
          type: 'trend',
          message: 'Great! Your performance is improving as the interview progresses',
          priority: 'high'
        });
      } else if (avgSecond < avgFirst - 0.15) {
        insights.push({
          type: 'trend',
          message: 'Performance declined - You might be experiencing fatigue',
          priority: 'warning'
        });
      }
    }

    return insights;
  }

  /**
   * Save session to user profile
   */
  saveSession() {
    if (!this.userId) {
      console.warn('Cannot save session without userId');
      return;
    }

    const summary = this.getInterviewSummary();
    
    // Add to user profile
    this.userProfile.sessions.push({
      date: new Date(),
      summary: summary,
      metrics: this.questionMetrics.length
    });

    this.userProfile.total_interviews++;
    this.userProfile.overall_average = this._calculateOverallAverage();

    // Update category history
    for (const [category, data] of Object.entries(this.categoryScores)) {
      if (!this.userProfile.category_history[category]) {
        this.userProfile.category_history[category] = [];
      }
      this.userProfile.category_history[category].push({
        date: new Date(),
        score: data.avg_score,
        count: data.total
      });
    }

    // Add progress data
    this.userProfile.progress_over_time.push({
      interview_number: this.userProfile.total_interviews,
      date: new Date(),
      overall_score: summary.interview_stats.overall_score,
      accuracy: summary.interview_stats.accuracy
    });

    // Save to file
    this._saveUserProfile();
  }

  /**
   * Calculate overall average across all sessions
   * @private
   */
  _calculateOverallAverage() {
    const allScores = this.userProfile.sessions.map(s => s.summary.interview_stats.overall_score);
    return allScores.length > 0
      ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2))
      : 0;
  }

  /**
   * Save user profile to storage
   * @private
   */
  _saveUserProfile() {
    if (!this.userId) return;

    try {
      const profilePath = this._getUserProfilePath();
      const dir = path.dirname(profilePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(profilePath, JSON.stringify(this.userProfile, null, 2));
    } catch (err) {
      console.error('Error saving user profile:', err.message);
    }
  }

  /**
   * Get user profile path
   * @private
   */
  _getUserProfilePath() {
    return path.join(__dirname, '../data/user_profiles', `${this.userId}_profile.json`);
  }

  /**
   * Get progress over time (for visualization)
   * @returns {Array} Progress data points
   */
  getProgressTimeline() {
    return this.userProfile.progress_over_time || [];
  }

  /**
   * Get category evolution
   * @returns {Object} Score progression by category
   */
  getCategoryEvolution() {
    const evolution = {};

    for (const [category, history] of Object.entries(this.userProfile.category_history || {})) {
      evolution[category] = history.map((item, index) => ({
        interview: index + 1,
        score: Number(item.score.toFixed(2)),
        trend: index === 0 ? 'baseline' : (item.score > (history[index - 1]?.score || 0) ? 'up' : 'down')
      }));
    }

    return evolution;
  }

  /**
   * Generate detailed analytics report
   * @returns {Object} Complete analytics report
   */
  generateAnalyticsReport() {
    return {
      current_session: this.getInterviewSummary(),
      user_profile: {
        total_interviews: this.userProfile.total_interviews,
        overall_average: this.userProfile.overall_average,
        sessions_completed: this.userProfile.sessions.length
      },
      progress: {
        timeline: this.getProgressTimeline(),
        category_evolution: this.getCategoryEvolution()
      },
      generated_at: new Date()
    };
  }

  /**
   * Get resumable session data
   * @returns {Object} Data needed to resume interview
   */
  getSessionSnapshot() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.startTime,
      currentMetrics: {
        total_questions: this.overallMetrics.total_questions,
        correct: this.overallMetrics.correct_answers,
        avg_score: this.overallMetrics.avg_score
      },
      categoryScores: this.categoryScores,
      questionHistory: this.questionMetrics
    };
  }
}

module.exports = AnalyticsTracker;
