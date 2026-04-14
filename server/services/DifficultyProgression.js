/**
 * DifficultyProgression - Manages adaptive difficulty throughout interview
 * Ensures progressive difficulty: Easy → Medium → Hard
 * Adapts based on performance while maintaining realistic progression
 */

class DifficultyProgression {
  constructor() {
    // Define difficulty progression for each stage
    this.stageDifficultyMap = {
      introduction: { min: 1, max: 2, target: 1 },
      warmup: { min: 1, max: 2, target: 1.5 },
      resume_based: { min: 1, max: 3, target: 2 },
      technical: { min: 2, max: 4, target: 2.5 },
      behavioral: { min: 2, max: 4, target: 2.5 },
      real_world: { min: 2, max: 4, target: 3 },
      hr_closing: { min: 1, max: 3, target: 2 }
    };

    // Track performance by category for adaptive difficulty
    this.categoryPerformance = {};
    this.performanceHistory = [];
  }

  /**
   * Get expected difficulty for current question position
   * @param {number} questionIndex - Current question position (0-based)
   * @param {number} totalQuestions - Total questions in interview (default 35)
   * @returns {Object} Difficulty guidance
   */
  getExpectedDifficulty(questionIndex, totalQuestions = 35) {
    const progressRatio = questionIndex / totalQuestions;

    // Linear difficulty progression: 1.0 → 4.0
    const baseDifficulty = 1.0 + (progressRatio * 3.0);

    return {
      position: questionIndex,
      progress: Number((progressRatio * 100).toFixed(1)),
      base_difficulty: Number(baseDifficulty.toFixed(1)),
      min_difficulty: Math.max(1, Math.floor(baseDifficulty)),
      max_difficulty: Math.min(5, Math.ceil(baseDifficulty)),
      recommended_difficulty: Number(baseDifficulty.toFixed(1))
    };
  }

  /**
   * Get difficulty range for a stage
   * @param {string} stage - Stage name
   * @returns {Object} Min, max, and target difficulty
   */
  getStageDifficultyRange(stage) {
    return this.stageDifficultyMap[stage] || { min: 1, max: 5, target: 3 };
  }

  /**
   * Select question with appropriate difficulty
   * @param {Array} candidates - Candidate questions
   * @param {string} stage - Current stage
   * @param {number} questionIndex - Position in interview
   * @param {number} performanceScore - Recent performance (0-1)
   * @returns {Object|null} Selected question
   */
  selectQuestionByDifficulty(
    candidates,
    stage,
    questionIndex,
    performanceScore = 0.5
  ) {
    if (!candidates || candidates.length === 0) {
      return null;
    }

    // Get expected difficulty for this position
    const expectedDifficulty = this.getExpectedDifficulty(questionIndex);
    const stageRange = this.getStageDifficultyRange(stage);

    // Adjust based on performance
    let targetDifficulty = expectedDifficulty.recommended_difficulty;

    // If performing well (>0.7), increase difficulty
    if (performanceScore > 0.7) {
      targetDifficulty = Math.min(5, targetDifficulty + 0.5);
    }
    // If struggling (<0.4), decrease difficulty
    else if (performanceScore < 0.4) {
      targetDifficulty = Math.max(1, targetDifficulty - 0.5);
    }

    // Clamp difficulty to stage range
    targetDifficulty = Math.max(
      stageRange.min,
      Math.min(stageRange.max, targetDifficulty)
    );

    // Filter questions by difficulty (closest match)
    const candidates_by_difficulty = this._rankByDifficultyMatch(
      candidates,
      targetDifficulty
    );

    if (candidates_by_difficulty.length === 0) {
      // Fallback to any question
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Return best matching question
    return candidates_by_difficulty[0];
  }

  /**
   * Rank questions by how well they match target difficulty
   * @private
   * @param {Array} questions - Candidate questions
   * @param {number} targetDifficulty - Target difficulty level
   * @returns {Array} Ranked questions
   */
  _rankByDifficultyMatch(questions, targetDifficulty) {
    const ranked = questions.map(question => {
      const difficulty = question.difficulty || 3;
      const match = Math.abs(difficulty - targetDifficulty);

      return {
        question,
        difficulty_match: 1 / (1 + match), // Higher is better (0-1)
        difficulty_distance: match
      };
    });

    // Sort by difficulty match (best first)
    ranked.sort((a, b) => b.difficulty_match - a.difficulty_match);

    return ranked.map(item => item.question);
  }

  /**
   * Update performance tracking for adaptive difficulty
   * @param {string} category - Question category/skill
   * @param {boolean} success - Whether answer was correct
   * @param {number} score - Score received (0-1)
   */
  updatePerformance(category, success, score = 0) {
    // Initialize category if needed
    if (!this.categoryPerformance[category]) {
      this.categoryPerformance[category] = {
        total: 0,
        correct: 0,
        average_score: 0,
        scores: []
      };
    }

    const cat = this.categoryPerformance[category];
    cat.total++;
    if (success) {
      cat.correct++;
    }

    cat.scores.push(score);
    // Keep only last 10 scores for rolling average
    if (cat.scores.length > 10) {
      cat.scores.shift();
    }

    cat.average_score = cat.scores.reduce((a, b) => a + b, 0) / cat.scores.length;

    // Track in history
    this.performanceHistory.push({
      timestamp: new Date(),
      category,
      success,
      score,
      average: cat.average_score
    });
  }

  /**
   * Get performance score for adaptive difficulty (0-1)
   * Recent performance (last 5 questions) weighted more
   * @returns {number} Performance score
   */
  getPerformanceScore() {
    if (this.performanceHistory.length === 0) {
      return 0.5; // Neutral starting point
    }

    // Weight recent performance more heavily
    const recentCount = Math.min(5, this.performanceHistory.length);
    const recent = this.performanceHistory.slice(-recentCount);
    const older = this.performanceHistory.slice(0, -recentCount);

    const recentAvg = recent.length > 0
      ? recent.reduce((sum, p) => sum + p.score, 0) / recent.length
      : 0.5;

    const olderAvg = older.length > 0
      ? older.reduce((sum, p) => sum + p.score, 0) / older.length
      : 0.5;

    // Weighted average: 70% recent, 30% overall
    return (recentAvg * 0.7) + (olderAvg * 0.3);
  }

  /**
   * Get performance by category
   * @param {string} category - Specific category or null for all
   * @returns {Object} Performance metrics
   */
  getPerformanceByCategory(category = null) {
    if (category) {
      return this.categoryPerformance[category] || null;
    }

    return this.categoryPerformance;
  }

  /**
   * Predict weak areas for follow-up questions
   * @returns {Array} Categories with low performance
   */
  getWeakAreas(threshold = 0.5) {
    const weakAreas = [];

    for (const [category, stats] of Object.entries(this.categoryPerformance)) {
      if (stats.average_score < threshold) {
        weakAreas.push({
          category,
          score: stats.average_score,
          questions_asked: stats.total
        });
      }
    }

    return weakAreas.sort((a, b) => a.score - b.score);
  }

  /**
   * Get strong areas for confidence building
   * @returns {Array} Categories with high performance
   */
  getStrongAreas(threshold = 0.7) {
    const strongAreas = [];

    for (const [category, stats] of Object.entries(this.categoryPerformance)) {
      if (stats.average_score >= threshold && stats.total >= 2) {
        strongAreas.push({
          category,
          score: stats.average_score,
          questions_asked: stats.total
        });
      }
    }

    return strongAreas.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate difficulty adaptation report
   * @returns {Object} Comprehensive report
   */
  generateAdaptationReport() {
    const currentScore = this.getPerformanceScore();
    const weakAreas = this.getWeakAreas();
    const strongAreas = this.getStrongAreas();

    return {
      overall_performance: Number(currentScore.toFixed(2)),
      total_questions: this.performanceHistory.length,
      weak_areas: weakAreas,
      strong_areas: strongAreas,
      trend: this._calculateTrend(),
      recommendation: this._generateRecommendation(currentScore, weakAreas)
    };
  }

  /**
   * Calculate performance trend
   * @private
   */
  _calculateTrend() {
    if (this.performanceHistory.length < 3) {
      return 'insufficient_data';
    }

    const third = Math.ceil(this.performanceHistory.length / 3);
    const part1 = this.performanceHistory.slice(0, third);
    const part3 = this.performanceHistory.slice(-third);

    const avg1 = part1.reduce((sum, p) => sum + p.score, 0) / part1.length;
    const avg3 = part3.reduce((sum, p) => sum + p.score, 0) / part3.length;

    if (avg3 > avg1 + 0.1) return 'improving';
    if (avg3 < avg1 - 0.1) return 'declining';
    return 'stable';
  }

  /**
   * Generate adaptation recommendation
   * @private
   */
  _generateRecommendation(score, weakAreas) {
    if (score >= 0.75) {
      return 'Excellent performance. Difficulty will increase.';
    }
    if (score >= 0.6) {
      return 'Good performance. Maintaining current difficulty level.';
    }
    if (score >= 0.4) {
      return 'Moderate performance. Focus on weak areas.';
    }
    return 'Struggling. Consider more fundamentals review before progressing.';
  }
}

module.exports = DifficultyProgression;
