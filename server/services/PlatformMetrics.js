const fs = require('fs');
const path = require('path');

/**
 * PlatformMetrics Service
 * Dynamically scans and analyzes the entire MockMate question dataset
 * Returns comprehensive platform statistics
 */

// Interview structure configuration (7-stage system)
const INTERVIEW_STRUCTURE = {
  introduction: 2,
  warmup: 3,
  resume_based: 4,
  technical: 12,
  behavioral: 6,
  real_world: 3,
  hr_closing: 5
};

/**
 * Scans all question JSON files and extracts comprehensive metrics
 * @returns {Promise<Object>} Platform metrics object
 */
async function getPlatformMetrics() {
  try {
    // Path to question data directory
    const dataDir = path.join(__dirname, '../../ai_service/data');
    
    // Read all JSON files
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    // Initialize metrics
    const metrics = {
      totalQuestions: 0,
      totalFiles: files.length,
      totalStages: 0,
      stages: new Set(),
      roles: new Set(),
      domains: new Set(),
      difficultyDistribution: {
        easy: 0,
        medium: 0,
        hard: 0,
        unknown: 0
      },
      questionsPerStage: {},
      questionsPerRole: {},
      questionsPerDomain: {},
      questionsPerDifficulty: {},
      interviewStructure: {
        totalQuestionsPerInterview: 0,
        interviewCoverageRatio: 0,
        uniqueInterviewCapacity: 0
      }
    };

    // Parse each file
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      try {
        const questions = JSON.parse(fileContent);
        
        // Process each question
        if (Array.isArray(questions)) {
          questions.forEach(q => {
            metrics.totalQuestions++;
            
            // Extract stage
            if (q.stage) {
              metrics.stages.add(q.stage);
              metrics.questionsPerStage[q.stage] = (metrics.questionsPerStage[q.stage] || 0) + 1;
            } else {
              // Infer stage from filename if not present
              const inferredStage = inferStageFromFilename(file);
              if (inferredStage) {
                metrics.stages.add(inferredStage);
                metrics.questionsPerStage[inferredStage] = (metrics.questionsPerStage[inferredStage] || 0) + 1;
              }
            }
            
            // Extract role
            if (q.role) {
              metrics.roles.add(q.role);
              metrics.questionsPerRole[q.role] = (metrics.questionsPerRole[q.role] || 0) + 1;
            }
            
            // Extract domain
            if (q.domain) {
              metrics.domains.add(q.domain);
              metrics.questionsPerDomain[q.domain] = (metrics.questionsPerDomain[q.domain] || 0) + 1;
            }
            
            // Extract difficulty
            if (q.difficulty) {
              const difficulty = typeof q.difficulty === 'string' 
                ? q.difficulty.toLowerCase() 
                : (typeof q.difficulty === 'object' ? 'medium' : String(q.difficulty).toLowerCase());
              
              if (metrics.difficultyDistribution[difficulty] !== undefined) {
                metrics.difficultyDistribution[difficulty]++;
              } else {
                // Handle custom difficulty levels
                metrics.difficultyDistribution[difficulty] = 1;
              }
              metrics.questionsPerDifficulty[difficulty] = (metrics.questionsPerDifficulty[difficulty] || 0) + 1;
            } else {
              metrics.difficultyDistribution.unknown++;
            }
          });
        }
      } catch (parseError) {
        console.warn(`⚠️  Failed to parse ${file}:`, parseError.message);
      }
    }
    
    // Convert Sets to Arrays
    metrics.stages = Array.from(metrics.stages).sort();
    metrics.roles = Array.from(metrics.roles).sort();
    metrics.domains = Array.from(metrics.domains).sort();
    metrics.totalStages = metrics.stages.length;
    
    // Calculate interview structure metrics
    const totalQuestionsPerInterview = Object.values(INTERVIEW_STRUCTURE).reduce((a, b) => a + b, 0);
    metrics.interviewStructure.totalQuestionsPerInterview = totalQuestionsPerInterview;
    metrics.interviewStructure.interviewCoverageRatio = parseFloat((metrics.totalQuestions / totalQuestionsPerInterview).toFixed(2));
    metrics.interviewStructure.uniqueInterviewCapacity = Math.floor(metrics.totalQuestions / totalQuestionsPerInterview);
    metrics.interviewStructure.stageConfiguration = INTERVIEW_STRUCTURE;
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Error calculating platform metrics:', error);
    throw error;
  }
}

/**
 * Infer stage from filename if not present in question data
 * @param {string} filename 
 * @returns {string|null}
 */
function inferStageFromFilename(filename) {
  const name = filename.toLowerCase().replace('.json', '');
  
  // Stage mapping based on filename keywords
  const stageMap = {
    introduction: ['introduction', 'intro'],
    warmup: ['warmup', 'warm_up', 'warm'],
    resume_based: ['resume', 'experience', 'project'],
    technical: ['technical', 'coding', 'dsa', 'algorithm', 'system_design', 'backend', 'frontend', 'database', 'architecture'],
    behavioral: ['behavioral', 'behavior', 'communication', 'teamwork', 'leadership', 'motivation', 'personality', 'failure'],
    real_world: ['real_world', 'realworld', 'scenario', 'edge_case', 'tradeoff'],
    hr_closing: ['hr', 'closing', 'career', 'company', 'culture']
  };
  
  for (const [stage, keywords] of Object.entries(stageMap)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return stage;
    }
  }
  
  return null;
}

/**
 * Print formatted console dashboard
 * @param {Object} metrics 
 */
function printMetricsDashboard(metrics) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MockMate Platform Metrics Dashboard');
  console.log('='.repeat(60));
  console.log(`📚 Total Questions:           ${metrics.totalQuestions}`);
  console.log(`📂 Total Files:               ${metrics.totalFiles}`);
  console.log(`🎭 Total Roles:               ${metrics.roles.length}`);
  console.log(`🌐 Total Domains:             ${metrics.domains.length}`);
  console.log(`📊 Total Stages:              ${metrics.totalStages}`);
  console.log(`🎯 Interview Questions:       ${metrics.interviewStructure.totalQuestionsPerInterview}`);
  console.log(`📈 Coverage Ratio:            ${metrics.interviewStructure.interviewCoverageRatio}x`);
  console.log(`🔄 Unique Interviews Possible: ${metrics.interviewStructure.uniqueInterviewCapacity}`);
  console.log('='.repeat(60));
  
  // Stage breakdown
  console.log('\n🎬 Questions Per Stage:');
  Object.entries(metrics.questionsPerStage)
    .sort(([, a], [, b]) => b - a)
    .forEach(([stage, count]) => {
      console.log(`   ${stage.padEnd(20)} ${count}`);
    });
  
  // Difficulty breakdown
  console.log('\n⚖️  Difficulty Distribution:');
  Object.entries(metrics.difficultyDistribution)
    .filter(([, count]) => count > 0)
    .forEach(([difficulty, count]) => {
      const percentage = ((count / metrics.totalQuestions) * 100).toFixed(1);
      console.log(`   ${difficulty.padEnd(15)} ${count} (${percentage}%)`);
    });
  
  // Top 10 roles
  console.log('\n👤 Top 10 Roles by Question Count:');
  Object.entries(metrics.questionsPerRole)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([role, count]) => {
      console.log(`   ${role.padEnd(20)} ${count}`);
    });
  
  console.log('\n' + '='.repeat(60) + '\n');
}

module.exports = {
  getPlatformMetrics,
  printMetricsDashboard
};
