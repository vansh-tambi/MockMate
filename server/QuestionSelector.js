/**
 * QuestionSelector - Intelligently selects questions based on multiple criteria
 * Selection priority: stage > role > level > weight > avoid repeats
 */

class QuestionSelector {
  /**
   * Select the best question for current interview state
   * @param {Object} criteria - Selection criteria
   * @param {String} criteria.stage - Interview stage
   * @param {String} criteria.role - Candidate role
   * @param {String} criteria.level - Candidate level
   * @param {Array} criteria.excludeQuestionIds - Questions to exclude (current + previous sessions)
   * @param {Array} criteria.availableQuestions - Pool of available questions
   * @param {Boolean} criteria.strictMode - Avoid questions from previous sessions (default true)
   * @returns {Object|null} Selected question or null if none available
   */
  static selectQuestion({stage, role, level, excludeQuestionIds = [], availableQuestions = [], strictMode = true}) {
    if (!availableQuestions || availableQuestions.length === 0) {
      return null;
    }

    // Filter 1: Stage match (REQUIRED)
    let candidates = availableQuestions.filter(q => q.stage === stage);
    if (candidates.length === 0) {
      return null;
    }

    // Filter 2: Role match (role-agnostic questions OR exact match preferred)
    const roleMatches = candidates.filter(q => q.role === role);
    const anyRolQuestions = candidates.filter(q => q.role === 'any');
    
    // Prefer exact role match, but include 'any' role
    candidates = roleMatches.length > 0 
      ? [...roleMatches, ...anyRolQuestions]
      : anyRolQuestions.length > 0
        ? anyRolQuestions
        : candidates; // Fallback to all stage questions

    if (candidates.length === 0) {
      return null;
    }

    // Filter 3: Level match (level-agnostic questions OR exact match preferred)
    const levelMatches = candidates.filter(q => q.level === level);
    const anyLevelQuestions = candidates.filter(q => q.level === 'any');

    candidates = levelMatches.length > 0
      ? [...levelMatches, ...anyLevelQuestions]
      : anyLevelQuestions.length > 0
        ? anyLevelQuestions
        : candidates; // Fallback

    if (candidates.length === 0) {
      return null;
    }

    // Filter 4: Exclude already asked questions (current + previous sessions)
    // This prevents repetition within current session AND optionally across sessions
    const unaskedQuestions = candidates.filter(q => !excludeQuestionIds.includes(q.id));
    candidates = unaskedQuestions.length > 0 ? unaskedQuestions : candidates;

    if (candidates.length === 0) {
      return null;
    }

    // Filter 5: Sort by usage count (ascending) - prefer least-used questions
    // This distributes question load evenly across the dataset
    candidates.sort((a, b) => {
      const usageA = a.usageCount || 0;
      const usageB = b.usageCount || 0;
      return usageA - usageB; // Lower usage first
    });

    // If multiple questions have same usage, secondary sort by weight (descending)
    candidates.sort((a, b) => {
      const usageA = a.usageCount || 0;
      const usageB = b.usageCount || 0;
      
      if (usageA === usageB) {
        const weightA = a.weight || 1.5;
        const weightB = b.weight || 1.5;
        return weightB - weightA;
      }
      return usageA - usageB;
    });

    // Return the top candidate
    return candidates[0];
  }

  /**
   * Select multiple questions for a stage
   * @param {Object} criteria - Same as selectQuestion
   * @param {Number} count - Number of questions to select
   * @returns {Array} Selected questions
   */
  static selectMultipleQuestions({stage, role, level, excludeQuestionIds = [], availableQuestions = [], strictMode = true}, count = 3) {
    const selected = [];
    let tempExcluded = [...excludeQuestionIds];

    for (let i = 0; i < count; i++) {
      const question = this.selectQuestion({
        stage,
        role,
        level,
        excludeQuestionIds: tempExcluded,
        availableQuestions,
        strictMode
      });

      if (!question) break; // No more questions available

      selected.push(question);
      tempExcluded.push(question.id);
    }

    return selected;
  }

  /**
   * Get questions for a stage, filtered by role and level
   * @returns {Array} Filtered questions
   */
  static getQuestionsByStageRoleLevel(questions, stage, role, level) {
    return questions.filter(q => {
      const stageMatch = q.stage === stage;
      const roleMatch = q.role === role || q.role === 'any';
      const levelMatch = q.level === level || q.level === 'any';
      return stageMatch && roleMatch && levelMatch;
    });
  }

  /**
   * Get questions of a specific difficulty range for a stage
   * @returns {Array} Questions within difficulty range
   */
  static getQuestionsByDifficulty(questions, stage, minDifficulty, maxDifficulty) {
    return questions
      .filter(q => q.stage === stage)
      .filter(q => {
        const difficulty = q.difficulty || 1;
        return difficulty >= minDifficulty && difficulty <= maxDifficulty;
      });
  }

  /**
   * Calculate candidate's appropriate level based on performance
   * @param {Number} score - Current score (0-1)
   * @returns {String} Recommended level
   */
  static getAdaptiveLevel(score, currentLevel) {
    // If scoring very well, suggest higher difficulty
    if (score > 0.75) {
      return currentLevel === 'entry' ? 'mid' : currentLevel === 'mid' ? 'senior' : 'principal';
    }
    // If struggling, suggest lower difficulty (but don't go below entry)
    if (score < 0.40) {
      return currentLevel === 'principal' ? 'senior' : currentLevel === 'senior' ? 'mid' : 'entry';
    }
    return currentLevel;
  }
}

module.exports = QuestionSelector;
