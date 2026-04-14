/**
 * WeaknessAdapter - Adaptive question selection based on performance
 * Targets weak areas for additional practice and remediation
 * Increases weight of questions in identified weak categories
 */

class WeaknessAdapter {
  constructor() {
    this.weakAreaThreshold = 0.55; // Below this = weak area
    this.strongAreaThreshold = 0.75; // Above this = strong area
    this.categoryWeights = {}; // Dynamic weights based on performance
  }

  /**
   * Analyze performance and identify weak areas
   * @param {Object} performanceData - Performance metrics from AnalyticsTracker
   * @returns {Object} Weak areas analysis
   */
  analyzeWeaknesses(performanceData) {
    const categoryScores = performanceData.categoryScores || {};
    const weaknesses = [];
    const strengths = [];

    for (const [category, stats] of Object.entries(categoryScores)) {
      if (!stats.avg_score) continue;

      if (stats.avg_score < this.weakAreaThreshold) {
        weaknesses.push({
          category,
          score: stats.avg_score,
          count: stats.total,
          severity: this._calculateSeverity(stats.avg_score),
          confidence: Math.min(1.0, stats.total / 5) // More questions = more confidence
        });
      } else if (stats.avg_score >= this.strongAreaThreshold) {
        strengths.push({
          category,
          score: stats.avg_score,
          count: stats.total
        });
      }
    }

    // Sort weaknesses by severity
    weaknesses.sort((a, b) => {
      const severityScore = (score) => {
        switch (score) {
          case 'critical': return 3;
          case 'high': return 2;
          case 'moderate': return 1;
          default: return 0;
        }
      };
      return severityScore(b.severity) - severityScore(a.severity);
    });

    return {
      weak_areas: weaknesses,
      strong_areas: strengths,
      needs_intervention: weaknesses.length > 0,
      intervention_strategy: this._getInterventionStrategy(weaknesses)
    };
  }

  /**
   * Calculate severity of weakness
   * @private
   */
  _calculateSeverity(score) {
    if (score < 0.3) return 'critical';
    if (score < 0.45) return 'high';
    if (score < 0.55) return 'moderate';
    return 'minor';
  }

  /**
   * Get intervention strategy based on weaknesses
   * @private
   */
  _getInterventionStrategy(weaknesses) {
    if (weaknesses.length === 0) return 'maintain_momentum';
    
    const criticalCount = weaknesses.filter(w => w.severity === 'critical').length;
    const highCount = weaknesses.filter(w => w.severity === 'high').length;

    if (criticalCount >= 2) {
      return 'intensive_remediation'; // Focus heavily on critical areas
    }
    if (criticalCount === 1 || highCount >= 2) {
      return 'targeted_practice'; // Focus on weak areas with some balance
    }
    return 'balanced_reinforcement'; // Mix weak and strong areas
  }

  /**
   * Calculate dynamic weights for question selection
   * @param {Object} weaknessAnalysis - Analysis from analyzeWeaknesses()
   * @returns {Object} Category weights for question filtering
   */
  calculateCategoryWeights(weaknessAnalysis) {
    const weights = {};
    const baseWeight = 1.0;

    // Boost weak areas
    for (const weakness of weaknessAnalysis.weak_areas) {
      // Higher boost for more severe weaknesses
      const boostMultiplier = {
        'critical': 2.5,
        'high': 2.0,
        'moderate': 1.5,
        'minor': 1.1
      }[weakness.severity] || 1.0;

      // Account for confidence (more data = more boost)
      const confidenceAdjustment = 0.5 + (weakness.confidence * 0.5);
      
      weights[weakness.category] = baseWeight * boostMultiplier * confidenceAdjustment;
    }

    // Reduce strong areas slightly (to allow growth)
    for (const strength of weaknessAnalysis.strong_areas) {
      weights[strength.category] = baseWeight * 0.7;
    }

    // Other areas: maintain base weight
    return weights;
  }

  /**
   * Filter questions with weakness-aware prioritization
   * @param {Array} availableQuestions - Pool of candidate questions
   * @param {Object} weaknessState - Weak areas analysis
   * @param {string} stage - Current stage (to constrain selection)
   * @returns {Array} Prioritized questions (weak areas first)
   */
  filterByWeakness(availableQuestions, weaknessState, stage = null) {
    if (!availableQuestions || availableQuestions.length === 0) {
      return [];
    }

    const weights = this.calculateCategoryWeights(weaknessState);
    const strategy = weaknessState.intervention_strategy;

    // Filter by stage if specified
    let filtered = availableQuestions;
    if (stage) {
      filtered = availableQuestions.filter(q => q.stage === stage);
    }

    // Rank by weakness relevance
    const ranked = filtered.map(question => {
      const questionCategory = question.skill || question.category;
      const categoryWeight = weights[questionCategory] || 1.0;

      // Strategy-specific ranking
      let strategyScore = 1.0;
      
      if (strategy === 'intensive_remediation') {
        // Heavily favor weak areas
        const isWeakArea = weaknessState.weak_areas.some(
          w => w.category === questionCategory
        );
        strategyScore = isWeakArea ? 3.0 : 0.5;
      } else if (strategy === 'targeted_practice') {
        // Favor weak areas but allow some balance
        const isWeakArea = weaknessState.weak_areas.some(
          w => w.category === questionCategory
        );
        strategyScore = isWeakArea ? 2.0 : 0.8;
      } else if (strategy === 'balanced_reinforcement') {
        // Mix weak and strong
        strategyScore = categoryWeight;
      }

      return {
        question,
        priority_score: categoryWeight * strategyScore,
        category_weight: categoryWeight,
        strategy_score: strategyScore
      };
    });

    // Sort by priority
    ranked.sort((a, b) => b.priority_score - a.priority_score);

    // Return questions sorted by priority
    return ranked.map(item => item.question);
  }

  /**
   * Recommend remedial questions for weak areas
   * @param {Array} allQuestions - Full question bank
   * @param {Object} weaknessAnalysis - Weak areas analysis
   * @returns {Array} Recommended questions for remediation
   */
  getRemediationQuestions(allQuestions, weaknessAnalysis) {
    const critical = weaknessAnalysis.weak_areas
      .filter(w => w.severity === 'critical')
      .map(w => w.category);

    if (critical.length === 0) {
      return [];
    }

    // Find questions in critical weak areas, prioritizing lower difficulty
    const remedial = allQuestions
      .filter(q => {
        const qCategory = q.skill || q.category;
        return critical.includes(qCategory);
      })
      .sort((a, b) => {
        // Lower difficulty first (for building confidence)
        return (a.difficulty || 3) - (b.difficulty || 3);
      });

    return remedial.slice(0, 5); // Top 5 remedial questions
  }

  /**
   * Suggest follow-up topics based on weaknesses
   * @param {Object} weaknessAnalysis - Weak areas analysis
   * @returns {Array} Suggested topics
   */
  getSuggestedFollowUpTopics(weaknessAnalysis) {
    const topics = [];

    // Critical weaknesses need immediate attention
    for (const weakness of weaknessAnalysis.weak_areas) {
      if (weakness.severity === 'critical' || weakness.severity === 'high') {
        topics.push({
          topic: weakness.category,
          priority: weakness.severity === 'critical' ? 'immediate' : 'high',
          reason: `Low performance (${(weakness.score * 100).toFixed(0)}%) suggests need for practice`,
          suggested_action: this._suggestAction(weakness)
        });
      }
    }

    return topics;
  }

  /**
   * Suggest action for weakness
   * @private
   */
  _suggestAction(weakness) {
    switch (weakness.severity) {
      case 'critical':
        return `Intensive study: ${weakness.category} requires fundamental review`;
      case 'high':
        return `Targeted practice: Focus on ${weakness.category} with more examples`;
      case 'moderate':
        return `Reinforcement: Review and practice ${weakness.category} more`;
      default:
        return `Practice: Work on ${weakness.category} to reach mastery`;
    }
  }

  /**
   * Check if candidate is ready to move forward
   * Based on weakness analysis
   * @param {Object} weaknessAnalysis - Weak areas analysis
   * @returns {Object} Readiness assessment
   */
  assessReadiness(weaknessAnalysis) {
    const critical = weaknessAnalysis.weak_areas.filter(w => w.severity === 'critical');
    const high = weaknessAnalysis.weak_areas.filter(w => w.severity === 'high');

    let readyToAdvance = true;
    let readinessScore = 1.0;

    if (critical.length > 0) {
      readyToAdvance = false;
      readinessScore -= critical.length * 0.3; // -0.3 per critical area
    }

    if (high.length > 0) {
      readinessScore -= high.length * 0.1; // -0.1 per high area
    }

    readinessScore = Math.max(0, readinessScore);

    return {
      ready_to_advance: readyToAdvance,
      readiness_score: Number(readinessScore.toFixed(2)),
      weak_areas_count: critical.length + high.length,
      recommendation: this._getReadinessRecommendation(readyToAdvance, readinessScore)
    };
  }

  /**
   * Get readiness recommendation
   * @private
   */
  _getReadinessRecommendation(readyToAdvance, score) {
    if (readyToAdvance && score >= 0.8) {
      return 'Ready! No critical gaps detected. You can advance.';
    }
    if (readyToAdvance && score >= 0.6) {
      return 'Mostly ready. A few areas to watch but you can proceed.';
    }
    if (score >= 0.4) {
      return 'Consider more practice. Several areas need improvement.';
    }
    return 'Not ready. Critical gaps must be addressed before advancing.';
  }

  /**
   * Generate weakness remediation plan
   * @param {Object} weaknessAnalysis - Weak areas analysis
   * @param {number} minutesAvailable - Time available for remediation
   * @returns {Object} Remediation plan
   */
  generateRemediationPlan(weaknessAnalysis, minutesAvailable = 60) {
    const plan = {
      total_time_minutes: minutesAvailable,
      areas_to_address: weaknessAnalysis.weak_areas.length,
      estimated_questions: Math.ceil(minutesAvailable / 5), // ~5 min per question
      phases: []
    };

    // Phase 1: Critical areas
    const critical = weaknessAnalysis.weak_areas.filter(w => w.severity === 'critical');
    if (critical.length > 0) {
      plan.phases.push({
        phase: 1,
        name: 'Critical Remediation',
        areas: critical.map(w => w.category),
        time_minutes: Math.ceil((minutesAvailable * 0.5) / 1),
        focus: 'Fundamentals and basics'
      });
    }

    // Phase 2: High priority areas
    const high = weaknessAnalysis.weak_areas.filter(w => w.severity === 'high');
    if (high.length > 0) {
      plan.phases.push({
        phase: 2,
        name: 'High Priority Practice',
        areas: high.map(w => w.category),
        time_minutes: Math.ceil((minutesAvailable * 0.3) / 1),
        focus: 'Applied practice with examples'
      });
    }

    // Phase 3: Moderation (mix weak and strong)
    plan.phases.push({
      phase: 3,
      name: 'Balanced Assessment',
      areas: 'Mix of all categories',
      time_minutes: Math.ceil((minutesAvailable * 0.2) / 1),
      focus: 'Overall performance check'
    });

    return plan;
  }

  /**
   * Reset weights (for new interview)
   */
  reset() {
    this.categoryWeights = {};
  }
}

module.exports = WeaknessAdapter;
