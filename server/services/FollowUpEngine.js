/**
 * FollowUpEngine - Intelligent follow-up question generation
 * Uses existing follow_ups field in questions to drill deeper
 * Prevents repetition and maintains conversation flow
 */

class FollowUpEngine {
  constructor() {
    this.followUpHistory = [];
    this.conversationContext = {};
    this.drillDownLimit = 3; // Max drill-downs per question
  }

  /**
   * Assess answer quality to determine if follow-up is needed
   * @param {Object} answerData - Answer evaluation data
   * @returns {boolean} Whether follow-up is recommended
   */
  shouldFollowUp(answerData) {
    const {
      score = 0.5,
      depth = 0.5,
      clarity = 0.5,
      completeness = 0.5
    } = answerData;

    // Average metrics
    const avgQuality = (score + depth + clarity + completeness) / 4;

    // Follow up if:
    // - Score is moderate (not too high, not too low)
    // - There's room for depth
    // - Answer was somewhat unclear or incomplete
    return (
      avgQuality >= 0.3 && avgQuality <= 0.85 && // Not perfect, not failing
      (depth < 0.7 || clarity < 0.7 || completeness < 0.8) // Room to expand
    );
  }

  /**
   * Select best follow-up question from available options
   * @param {Object} currentQuestion - The parent question
   * @param {Object} answerEvaluation - How user answered
   * @param {Array} askedQuestionIds - Questions already asked (to avoid repeats)
   * @returns {Object|null} Selected follow-up question
   */
  selectFollowUp(currentQuestion, answerEvaluation, askedQuestionIds = []) {
    // Check if this question has follow-ups
    const followUps = currentQuestion.follow_ups || [];
    
    if (!followUps || followUps.length === 0) {
      return null;
    }

    // Get previous follow-ups for this question
    const currentFollowUpCount = this.followUpHistory.filter(
      f => f.parent_id === currentQuestion.id
    ).length;

    // Limit drill-downs to prevent endless questioning
    if (currentFollowUpCount >= this.drillDownLimit) {
      return null; // Move to next stage question
    }

    // Assess if follow-up is appropriate
    if (!this.shouldFollowUp(answerEvaluation)) {
      return null;
    }

    // Detect topic depth in answer
    const mentionedTopics = this._extractTopicsFromAnswer(
      answerEvaluation.answer_text,
      currentQuestion
    );

    // Select follow-up matching mentioned topics
    let selectedFollowUp = this._matchFollowUpToTopics(
      followUps,
      mentionedTopics
    );

    // If no topic match, pick the most relevant follow-up
    if (!selectedFollowUp) {
      selectedFollowUp = this._selectBestFollowUp(
        followUps,
        answerEvaluation,
        askedQuestionIds
      );
    }

    if (!selectedFollowUp) {
      return null;
    }

    // Create follow-up question object
    const followUpQuestion = this._createFollowUpQuestion(
      selectedFollowUp,
      currentQuestion,
      mentionedTopics
    );

    // Track follow-up
    this.followUpHistory.push({
      parent_id: currentQuestion.id,
      follow_up: selectedFollowUp,
      timestamp: new Date(),
      answer_evaluation: answerEvaluation,
      drill_level: currentFollowUpCount + 1
    });

    return followUpQuestion;
  }

  /**
   * Extract topics mentioned in user's answer
   * @private
   */
  _extractTopicsFromAnswer(answerText, parentQuestion) {
    if (!answerText) return [];

    const textLower = answerText.toLowerCase();
    const keywords = [
      'project', 'experience', 'learned', 'challenge', 'success',
      'problem', 'solution', 'technology', 'framework', 'language',
      'achievement', 'team', 'lead', 'manage', 'implement'
    ];

    return keywords.filter(keyword => textLower.includes(keyword));
  }

  /**
   * Match follow-up to mentioned topics
   * @private
   */
  _matchFollowUpToTopics(followUps, topics) {
    if (topics.length === 0) return null;

    for (const topic of topics) {
      const matched = followUps.find(fu =>
        fu.toLowerCase().includes(topic)
      );
      if (matched) {
        return matched;
      }
    }

    return null;
  }

  /**
   * Select best follow-up based on evaluation
   * @private
   */
  _selectBestFollowUp(followUps, evaluation, askedIds) {
    // Rank by relevance to answer quality
    if (evaluation.depth < 0.5) {
      // If answer was shallow, pick follow-up asking for details
      return followUps.find(fu =>
        /tell|explain|elaborate|detail|more|deep/.test(fu.toLowerCase())
      ) || followUps[0];
    }

    if (evaluation.clarity < 0.6) {
      // If unclear, ask clarifying question
      return followUps.find(fu =>
        /what|how|why|mean|clarify|exactly/.test(fu.toLowerCase())
      ) || followUps[0];
    }

    // Otherwise, pick first unused follow-up
    const unused = followUps.find(fu => !askedIds.includes(fu));
    return unused || followUps[0];
  }

  /**
   * Create a complete follow-up question object
   * @private
   */
  _createFollowUpQuestion(followUpText, parentQuestion, topics) {
    return {
      id: `${parentQuestion.id}_followup_${this.followUpHistory.length + 1}`,
      type: 'follow_up',
      parent_id: parentQuestion.id,
      parent_question: parentQuestion.question,
      question: followUpText,
      stage: parentQuestion.stage,
      role: parentQuestion.role,
      level: parentQuestion.level,
      skill: parentQuestion.skill,
      difficulty: Math.min(5, (parentQuestion.difficulty || 3) + 0.5),
      category: parentQuestion.category || 'follow_up',
      context: {
        mentioned_topics: topics,
        drill_level: (this.followUpHistory.filter(f => f.parent_id === parentQuestion.id).length) + 1
      },
      is_follow_up: true
    };
  }

  /**
   * Get follow-up chain for a question
   * @param {string} questionId - Parent question ID
   * @returns {Array} List of follow-ups asked for this question
   */
  getFollowUpChain(questionId) {
    return this.followUpHistory
      .filter(f => f.parent_id === questionId)
      .map(f => ({
        follow_up: f.follow_up,
        drill_level: f.drill_level,
        answer_quality: f.answer_evaluation.score
      }));
  }

  /**
   * Check if we should move to next main question
   * @param {string} questionId - Current question ID
   * @returns {boolean} True if sufficient drilling done
   */
  shouldAdvanceToNextQuestion(questionId) {
    const followUpCount = this.followUpHistory.filter(
      f => f.parent_id === questionId
    ).length;

    // Advance if:
    // 1. We've done max drill-downs
    // 2. Or no follow-ups available
    return followUpCount >= this.drillDownLimit;
  }

  /**
   * Build conversation context for next question
   * Helps system understand what was discussed
   * @param {string} questionId - Current/previous question ID
   * @returns {Object} Context for next question
   */
  buildConversationContext(questionId) {
    const followUpChain = this.getFollowUpChain(questionId);
    
    return {
      parent_question_id: questionId,
      follow_up_count: followUpChain.length,
      topics_explored: followUpChain.map(f => f.follow_up),
      avg_quality: followUpChain.length > 0
        ? followUpChain.reduce((sum, f) => sum + f.answer_quality, 0) / followUpChain.length
        : 0,
      last_updated: new Date()
    };
  }

  /**
   * Reset follow-up tracker for new question
   * @param {string} questionId - New question being asked
   */
  resetForNewQuestion(questionId) {
    this.conversationContext = {
      current_question: questionId,
      started_at: new Date()
    };
  }

  /**
   * Generate follow-up statistics
   * @returns {Object} Stats about follow-up effectiveness
   */
  getFollowUpStats() {
    const totalFollowUps = this.followUpHistory.length;
    const avgDrillDeeper = totalFollowUps === 0 
      ? 0 
      : this.followUpHistory.reduce((sum, f) => sum + f.drill_level, 0) / totalFollowUps;

    const avgQuality = totalFollowUps === 0
      ? 0
      : this.followUpHistory.reduce((sum, f) => sum + (f.answer_evaluation.score || 0), 0) / totalFollowUps;

    const parentQuestions = new Set(this.followUpHistory.map(f => f.parent_id));

    return {
      total_follow_ups: totalFollowUps,
      parent_questions_with_follow_ups: parentQuestions.size,
      avg_drill_depth: Number(avgDrillDeeper.toFixed(2)),
      avg_follow_up_quality: Number(avgQuality.toFixed(2)),
      effectiveness_rating: this._calculateEffectiveness(totalFollowUps, avgQuality)
    };
  }

  /**
   * Calculate effectiveness of follow-ups
   * @private
   */
  _calculateEffectiveness(totalFollowUps, avgQuality) {
    if (totalFollowUps === 0) return 'not_attempted';
    if (avgQuality >= 0.75) return 'very_effective';
    if (avgQuality >= 0.60) return 'effective';
    if (avgQuality >= 0.40) return 'moderate';
    return 'needs_improvement';
  }

  /**
   * Clear history (for new interview)
   */
  reset() {
    this.followUpHistory = [];
    this.conversationContext = {};
  }
}

module.exports = FollowUpEngine;
