/**
 * Question Loader for MockMate Interview System
 * Loads all questions from data directory once on server startup
 * Initializes usage tracking for smart question selection
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "ai_service", "data");
const USAGE_STATS_FILE = path.join(__dirname, "..", "data", "question_usage_stats.json");

/**
 * Load usage statistics from file (if exists)
 */
function loadUsageStats() {
  try {
    if (fs.existsSync(USAGE_STATS_FILE)) {
      const data = fs.readFileSync(USAGE_STATS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("⚠️  Could not load usage stats:", err.message);
  }
  return {};
}

/**
 * Save usage statistics to file
 */
function saveUsageStats(stats) {
  try {
    const dir = path.dirname(USAGE_STATS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USAGE_STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("❌ Failed to save usage stats:", err.message);
  }
}

/**
 * Load all questions from all JSON files in data directory
 * @returns {Array} Array of all question objects with usage tracking
 */
function loadAllQuestions() {
  console.log("\n📚 Loading all questions from data directory...");
  
  let allQuestions = [];
  let fileCount = 0;
  let errorCount = 0;

  // Load existing usage stats
  const usageStats = loadUsageStats();

  try {
    const files = fs.readdirSync(DATA_DIR);
    
    files.forEach(file => {
      // Only process JSON files, skip indexes and config files
      if (!file.endsWith(".json") || file.includes("embeddings") || file === "taxonomy.json") {
        return;
      }

      try {
        const filePath = path.join(DATA_DIR, file);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(fileContent);

        // Handle different data structures
        let questions = [];
        if (Array.isArray(data)) {
          questions = data;
        } else if (data.questions && Array.isArray(data.questions)) {
          questions = data.questions;
        } else if (data.data && Array.isArray(data.data)) {
          questions = data.data;
        }

        if (questions.length > 0) {
          // Map old stage names to new 7-stage system
          const stageMapping = {
            'introduction': 'introduction',
            'warmup': 'warmup',
            'resume': 'resume_based',
            'resume_technical': 'resume_based',
            'technical': 'technical',
            'behavioral': 'behavioral',
            'real_life': 'real_world',
            'real_world': 'real_world',
            'hr_closing': 'hr_closing',
            'closing': 'hr_closing',
            'pressure': 'behavioral',
            'communication': 'behavioral',
            'teamwork': 'behavioral',
            'leadership': 'behavioral',
            'personality': 'behavioral',
            'hr': 'hr_closing',
            'interview': 'technical'
          };

          // Filename-based stage detection (fallback if no stage property)
          const getStageFromFilename = (filename) => {
            const lower = filename.toLowerCase();
            if (lower.includes('intro')) return 'introduction';
            if (lower.includes('warmup')) return 'warmup';
            if (lower.includes('resume')) return 'resume_based';
            if (lower.includes('behavioral') || lower.includes('communication') || lower.includes('teamwork') || 
                lower.includes('personality') || lower.includes('leadership')) return 'behavioral';
            if (lower.includes('hr') || lower.includes('closing')) return 'hr_closing';
            if (lower.includes('real') || lower.includes('scenario')) return 'real_world';
            return 'technical'; // Default to technical for other files
          };

          // Initialize or load usage count for each question
          questions = questions.map(q => {
            let newStage = 'technical'; // Default
            
            // First try the question's stage property
            if (q.stage) {
              const mapped = stageMapping[q.stage.toLowerCase()];
              if (mapped) newStage = mapped;
            }
            
            // If still default, try filename-based detection
            if (newStage === 'technical' && !q.stage) {
              newStage = getStageFromFilename(file);
            }
            
            return {
              ...q,
              stage: newStage,
              usageCount: usageStats[q.id] || 0  // Load from stats or default to 0
            };
          });

          allQuestions.push(...questions);
          fileCount++;
          console.log(`   ✅ ${file.padEnd(40)} → ${questions.length} questions`);
        }

      } catch (err) {
        console.error(`   ❌ Error loading ${file}:`, err.message);
        errorCount++;
      }
    });

    console.log(`\n📊 Total: ${allQuestions.length} questions from ${fileCount} files`);
    if (errorCount > 0) {
      console.warn(`⚠️  ${errorCount} files failed to load`);
    }

  } catch (err) {
    console.error("❌ Failed to read data directory:", err.message);
    return [];
  }

  return allQuestions;
}

// Load questions once on module import
const allQuestions = loadAllQuestions();
const usageStats = loadUsageStats();

module.exports = {
  questions: allQuestions,
  
  /**
   * Get all questions
   */
  getAllQuestions() {
    return allQuestions;
  },

  /**
   * Increment usage count for a question
   */
  incrementUsage(questionId) {
    usageStats[questionId] = (usageStats[questionId] || 0) + 1;
    
    // Update in-memory questions
    const question = allQuestions.find(q => q.id === questionId);
    if (question) {
      question.usageCount = usageStats[questionId];
    }

    // Save to file (asynchronously to not block)
    setImmediate(() => saveUsageStats(usageStats));
    
    return usageStats[questionId];
  },

  /**
   * Get usage stats for a question
   */
  getUsageCount(questionId) {
    return usageStats[questionId] || 0;
  },

  /**
   * Get all usage stats
   */
  getAllUsageStats() {
    return usageStats;
  },

  /**
   * Reset usage count for testing
   */
  resetUsageStats() {
    Object.keys(usageStats).forEach(key => delete usageStats[key]);
    saveUsageStats(usageStats);
  }
};

