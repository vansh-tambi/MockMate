/**
 * Question Loader for MockMate Interview System
 * Loads all questions from data directory once on server startup
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "ai_service", "data");

/**
 * Load all questions from all JSON files in data directory
 * @returns {Array} Array of all question objects
 */
function loadAllQuestions() {
  console.log("\n📚 Loading all questions from data directory...");
  
  let allQuestions = [];
  let fileCount = 0;
  let errorCount = 0;

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

module.exports = allQuestions;
