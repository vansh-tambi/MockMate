/**
 * ResumeAnalyzer - Intelligent resume parsing and skill extraction
 * Uses skills_map.json for comprehensive skill detection
 * Returns matched skills with confidence scores
 */

const fs = require('fs');
const path = require('path');

class ResumeAnalyzer {
  constructor() {
    this.skillsMap = this._loadSkillsMap();
  }

  /**
   * Load skills map from JSON
   */
  _loadSkillsMap() {
    try {
      const filePath = path.join(__dirname, 'skills_map.json');
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('❌ Error loading skills_map.json:', err.message);
      return {};
    }
  }

  /**
   * Extract skills from resume text with confidence scoring
   * @param {string} resumeText - Raw resume text
   * @returns {Object} Extracted skills with metadata
   */
  extractSkills(resumeText = '') {
    if (!resumeText || resumeText.length < 20) {
      return {
        detected_skills: [],
        skill_categories: [],
        confidence_score: 0,
        strengths: [],
        potential_topics: []
      };
    }

    const resumeLower = resumeText.toLowerCase();
    const detectedSkills = [];
    const skillConfidence = {};
    const categoryWeight = {};

    // Iterate through each skill in the skills map
    for (const [skillName, skillData] of Object.entries(this.skillsMap)) {
      const keywords = skillData.keywords || [];
      let matchCount = 0;
      let exactMatches = 0;

      // Count keyword matches
      for (const keyword of keywords) {
        const keywordPattern = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = resumeText.match(keywordPattern);
        
        if (matches) {
          matchCount += matches.length;
          exactMatches++;
        }
      }

      // Only include skills with at least one keyword match
      if (matchCount > 0) {
        const confidence = Math.min(1.0, (exactMatches / keywords.length) * (matchCount / keywords.length) + 0.3);
        
        detectedSkills.push({
          skill: skillName,
          confidence: confidence,
          matches: matchCount,
          weight: skillData.weight || 1.0
        });

        skillConfidence[skillName] = confidence;

        // Add categories for this skill
        const categories = skillData.question_categories || [];
        for (const category of categories) {
          categoryWeight[category] = (categoryWeight[category] || 0) + (skillData.weight || 1.0);
        }
      }
    }

    // Sort skills by confidence and weight
    detectedSkills.sort((a, b) => {
      const scoreA = (a.confidence * a.weight);
      const scoreB = (b.confidence * b.weight);
      return scoreB - scoreA;
    });

    // Get top skills
    const topSkills = detectedSkills.slice(0, 10);

    // Get strongest question categories
    const sortedCategories = Object.entries(categoryWeight)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, weight]) => ({ category: cat, weight }));

    // Calculate overall confidence
    const overallConfidence = topSkills.length > 0 
      ? topSkills.reduce((sum, s) => sum + s.confidence, 0) / topSkills.length
      : 0;

    // Identify strengths (skills with high confidence)
    const strengths = topSkills
      .filter(s => s.confidence > 0.6)
      .map(s => s.skill);

    // Identify potential weak areas (related topics not mentioned)
    const potentialTopics = this._findPotentialWeakAreas(topSkills);

    return {
      detected_skills: topSkills,
      skill_categories: sortedCategories,
      confidence_score: Number(overallConfidence.toFixed(2)),
      strengths: strengths,
      potential_topics: potentialTopics,
      raw_count: detectedSkills.length
    };
  }

  /**
   * Find potential weak areas based on detected skills
   * @param {Array} detectedSkills - Detected skills array
   * @returns {Array} Potential topics to strengthen
   */
  _findPotentialWeakAreas(detectedSkills) {
    const detectedNames = detectedSkills.map(s => s.skill);
    const potentialTopics = [];

    // Pre-defined weak area mappings
    const weakAreaMappings = {
      'nodejs': ['concurrency', 'networking', 'performance'],
      'react': ['testing', 'performance', 'security'],
      'backend': ['testing', 'security', 'devops'],
      'frontend': ['performance', 'accessibility', 'seo'],
      'database': ['indexing', 'sharding', 'replication'],
      'python': ['async', 'concurrency', 'performance']
    };

    // Check each detected skill for related areas
    for (const skill of detectedNames) {
      if (weakAreaMappings[skill]) {
        for (const topic of weakAreaMappings[skill]) {
          if (!detectedNames.includes(topic)) {
            potentialTopics.push(topic);
          }
        }
      }
    }

    // Return unique potential topics (max 5)
    return [...new Set(potentialTopics)].slice(0, 5);
  }

  /**
   * Get recommended question categories based on detected skills
   * @param {Object} analysisResult - Result from extractSkills()
   * @returns {Object} Recommended questions mapping
   */
  getRecommendedCategories(analysisResult) {
    const categoryPriority = {};

    // Build weighted category priority
    for (const { category, weight } of analysisResult.skill_categories) {
      categoryPriority[category] = {
        priority: weight,
        reason: 'Matched with detected skills'
      };
    }

    // Add weak area categories for extra focus
    for (const topic of analysisResult.potential_topics) {
      if (this.skillsMap[topic]) {
        const categories = this.skillsMap[topic].question_categories || [];
        for (const category of categories) {
          categoryPriority[category] = {
            priority: (categoryPriority[category]?.priority || 0) + 0.5,
            reason: 'Identified as potential weak area'
          };
        }
      }
    }

    return categoryPriority;
  }

  /**
   * Create a resume profile summary
   * @param {string} resumeText - Raw resume text
   * @returns {Object} Complete resume profile
   */
  analyzeResume(resumeText) {
    const skills = this.extractSkills(resumeText);
    const categories = this.getRecommendedCategories(skills);

    return {
      skills_analysis: skills,
      recommended_categories: categories,
      resume_strength: this._calculateResumeStrength(skills),
      key_takeaways: this._generateTakeaways(skills)
    };
  }

  /**
   * Calculate resume strength (0-100)
   * @param {Object} analysis - Analysis result from extractSkills()
   * @returns {number} Resume strength score
   */
  _calculateResumeStrength(analysis) {
    const baseScore = Math.min(100, analysis.detected_skills.length * 5);
    const confidenceBonus = analysis.confidence_score * 20;
    const strengthBonus = analysis.strengths.length * 3;
    return Math.min(100, Math.round(baseScore + confidenceBonus + strengthBonus));
  }

  /**
   * Generate key takeaways from resume analysis
   * @param {Object} analysis - Analysis result
   * @returns {Array} Key takeaways
   */
  _generateTakeaways(analysis) {
    const takeaways = [];

    if (analysis.strengths.length >= 5) {
      takeaways.push(`Strong technical foundation with ${analysis.strengths.length} verified skills`);
    }
    
    if (analysis.potential_topics.length > 0) {
      takeaways.push(`Focus areas for growth: ${analysis.potential_topics.join(', ')}`);
    }

    if (analysis.confidence_score > 0.7) {
      takeaways.push('Well-documented technical experience');
    } else if (analysis.confidence_score < 0.4) {
      takeaways.push('Consider adding more specific technical details to resume');
    }

    return takeaways.slice(0, 3);
  }

  /**
   * Match resume skills to available questions
   * @param {Array} availableQuestions - All available questions
   * @param {string} resumeText - Resume text
   * @param {string} stage - Current interview stage (optional)
   * @returns {Array} Filtered and prioritized questions
   */
  filterQuestionsByResume(availableQuestions, resumeText, stage = null) {
    const analysis = this.extractSkills(resumeText);
    const categories = this.getRecommendedCategories(analysis);

    // Filter questions matching detected skills
    let filtered = availableQuestions.filter(question => {
      if (stage && question.stage !== stage) {
        return false;
      }

      // Match by skill or category
      if (question.skill) {
        const skillInAnalysis = analysis.detected_skills.some(s => 
          s.skill.toLowerCase() === question.skill.toLowerCase()
        );
        return skillInAnalysis;
      }

      // Match by category
      if (categories[question.category] || categories[question.section]) {
        return true;
      }

      // Include generic questions
      if (question.role === 'any' || !question.role) {
        return true;
      }

      return false;
    });

    // If filtered results are empty, return all available for that stage
    if (filtered.length === 0) {
      return stage 
        ? availableQuestions.filter(q => q.stage === stage)
        : availableQuestions;
    }

    // Sort by skill confidence
    filtered.sort((a, b) => {
      const skillA = analysis.detected_skills.find(s => 
        s.skill.toLowerCase() === (a.skill || '').toLowerCase()
      );
      const skillB = analysis.detected_skills.find(s => 
        s.skill.toLowerCase() === (b.skill || '').toLowerCase()
      );

      const scoreA = skillA?.confidence || 0;
      const scoreB = skillB?.confidence || 0;

      return scoreB - scoreA;
    });

    return filtered;
  }
}

module.exports = ResumeAnalyzer;
