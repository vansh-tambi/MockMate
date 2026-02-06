/**
 * Stage Manager for MockMate Interview System
 * Handles stage progression and question filtering
 */

const { questions: allQuestions } = require("./questionLoader");
const {
  STAGE_ORDER,
  QUESTIONS_PER_STAGE,
  STAGE_DESCRIPTIONS
} = require("./stageConfig");

/**
 * Determine which stage based on question index
 * Uses clean, simple logic for 25-question interview
 * @param {number} index - Current question index (0-based)
 * @returns {string} Current stage name
 */
function getStageFromIndex(index) {
  // 7-stage progressive interview system
  if (index < 2)
    return "introduction";      // Q0-1 (2 total)
  
  if (index < 4)
    return "warmup";            // Q2-3 (2 total)
  
  if (index < 7)
    return "resume_based";      // Q4-6 (3 total)
  
  if (index < 17)
    return "technical";         // Q7-16 (10 total)
  
  if (index < 22)
    return "behavioral";        // Q17-21 (5 total)
  
  if (index < 24)
    return "real_world";        // Q22-23 (2 total)
  
  return "hr_closing";          // Q24 (1 total)
}

/**
 * Get all questions for a specific stage
 * @param {string} stage - Stage name (e.g., 'introduction', 'warmup', 'resume_based', 'technical', 'behavioral', 'real_world', 'hr_closing')
 * @returns {Array} Array of questions for that stage
 */
function getQuestionsForStage(stage) {
  const stageQuestions = allQuestions.filter(q => q.stage === stage);
  
  console.log(`   📂 Stage "${stage}": ${stageQuestions.length} questions available`);
  
  return stageQuestions;
}

/**
 * Filter questions by resume content (smart targeting)
 * @param {Array} stageQuestions - Questions for current stage
 * @param {string} resumeText - Candidate's resume text
 * @returns {Array} Filtered questions relevant to resume
 */
function filterByResume(stageQuestions, resumeText = "") {
  if (!resumeText || resumeText.length < 50) {
    return stageQuestions;
  }

  const resumeLower = resumeText.toLowerCase();
  
  // Skill detection patterns
  const skillMapping = {
    react: ["react", "reactjs", "react.js", "jsx"],
    vue: ["vue", "vuejs", "vue.js"],
    angular: ["angular", "angularjs"],
    nodejs: ["node", "nodejs", "node.js", "express"],
    python: ["python", "django", "flask", "fastapi"],
    java: ["java", "spring", "springboot"],
    database: ["mongodb", "mysql", "postgresql", "sql", "database"],
    cloud: ["aws", "azure", "gcp", "docker", "kubernetes"],
    frontend: ["frontend", "front-end", "ui", "css", "html"],
    backend: ["backend", "back-end", "api", "server"],
    mobile: ["react native", "flutter", "ios", "android"],
    leadership: ["lead", "manager", "team lead", "mentor"]
  };

  // Detect skills in resume
  const detectedSkills = [];
  for (let [skill, keywords] of Object.entries(skillMapping)) {
    if (keywords.some(keyword => resumeLower.includes(keyword))) {
      detectedSkills.push(skill);
    }
  }

  if (detectedSkills.length === 0) {
    console.log("   ⚠️  No specific skills detected, using all stage questions");
    return stageQuestions;
  }

  console.log(`   🎯 Detected skills: ${detectedSkills.join(", ")}`);

  // Filter questions matching detected skills
  const filtered = stageQuestions.filter(q => {
    if (!q.skill) return true; // Include questions without skill field
    
    // Check if question skill matches any detected skill
    return detectedSkills.some(detectedSkill => 
      q.skill.toLowerCase().includes(detectedSkill) ||
      detectedSkill.includes(q.skill.toLowerCase())
    );
  });

  if (filtered.length > 0) {
    console.log(`   ✅ Filtered to ${filtered.length} resume-relevant questions`);
    return filtered;
  }

  // Fallback to all stage questions if filtering yields no results
  console.log("   ⚠️  Filtering resulted in 0 questions, using all stage questions");
  return stageQuestions;
}

/**
 * Select a random unused question from pool
 * @param {Array} questions - Question pool
 * @param {Array} askedQuestionIds - IDs of questions already asked
 * @returns {Object|null} Selected question or null if none available
 */
function getUnusedQuestion(questions, askedQuestionIds = []) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return null;
  }

  // Filter to only unused questions
  const unused = questions.filter(q => !askedQuestionIds.includes(q.id));

  if (unused.length === 0) {
    console.warn("   ⚠️  All questions in pool have been asked, recycling pool");
    // Fallback: return random from full pool
    return questions[Math.floor(Math.random() * questions.length)];
  }

  // Select random from unused pool
  return unused[Math.floor(Math.random() * unused.length)];
}

/**
 * Filter questions by role (critical for system adaptation)
 * Ensures questions match the role (frontend, backend, hospitality, etc.)
 * @param {Array} questions - Question pool
 * @param {string} role - Role name (frontend, backend, any, etc.)
 * @returns {Array} Filtered questions matching the role
 */
function filterByRole(questions, role = "any") {
  if (!Array.isArray(questions) || questions.length === 0) {
    return questions;
  }

  // If role is "any", return all questions
  if (!role || role === "any") {
    console.log(`   👤 Role: "any" (using all questions)`);
    return questions;
  }

  const roleLower = role.toLowerCase();
  console.log(`   👤 Role filtering: "${role}"`);

  // Filter questions where role matches or is "any"
  const filtered = questions.filter(q => {
    // Include if no role field (base questions apply to everyone)
    if (!q.role) return true;
    
    // Include if role matches or question is generic (role="any")
    const questionRole = q.role.toLowerCase();
    return questionRole.includes(roleLower) || 
           questionRole === "any" ||
           roleLower.includes("any");
  });

  if (filtered.length > 0) {
    console.log(`   ✅ Filtered to ${filtered.length} role-relevant questions`);
    return filtered;
  }

  // Fallback: if no role-specific questions, use all
  console.warn(`   ⚠️  No questions match role "${role}", using all questions`);
  return questions;
}

/**
 * Get stage progress information
 * @param {number} questionIndex - Current question index
 * @returns {Object} Stage progress details
 */
function getStageProgress(questionIndex) {
  const currentStage = getStageFromIndex(questionIndex);
  const totalQuestions = Object.values(QUESTIONS_PER_STAGE).reduce((a, b) => a + b, 0);
  
  // Calculate questions completed in current stage
  let questionsBeforeStage = 0;
  for (let stage of STAGE_ORDER) {
    if (stage === currentStage) break;
    questionsBeforeStage += QUESTIONS_PER_STAGE[stage];
  }
  
  const questionsInCurrentStage = questionIndex - questionsBeforeStage + 1;
  const totalInCurrentStage = QUESTIONS_PER_STAGE[currentStage];

  return {
    stage: currentStage,
    description: STAGE_DESCRIPTIONS[currentStage],
    stageProgress: `${questionsInCurrentStage}/${totalInCurrentStage}`,
    overallProgress: `${questionIndex + 1}/${totalQuestions}`,
    percentComplete: Math.round(((questionIndex + 1) / totalQuestions) * 100)
  };
}

/**
 * Get allowed difficulty range based on experience level
 * @param {string} level - Experience level (intern, fresher, junior, mid, senior)
 * @returns {Object} Min and max difficulty allowed
 */
function getAllowedDifficulty(level = "mid") {
  const levelLower = level.toLowerCase();
  
  const difficultyMapping = {
    intern: { min: 1, max: 2 },
    fresher: { min: 2, max: 3 },
    junior: { min: 2, max: 4 },
    mid: { min: 2, max: 4 },
    senior: { min: 3, max: 5 }
  };

  return difficultyMapping[levelLower] || difficultyMapping.mid;
}

/**
 * Filter questions by difficulty progression
 * Ensures questions match candidate's experience level
 * @param {Array} questions - Question pool
 * @param {string} level - Experience level (intern, fresher, junior, mid, senior)
 * @returns {Array} Filtered questions within allowed difficulty range
 */
function filterByDifficulty(questions, level = "mid") {
  if (!Array.isArray(questions) || questions.length === 0) {
    return questions;
  }

  const { min, max } = getAllowedDifficulty(level);
  console.log(`   📊 Difficulty filter: Level "${level}" → Difficulty ${min}-${max}`);

  const filtered = questions.filter(q => {
    // If no difficulty field, include the question
    if (!q.difficulty) return true;
    
    // Check if difficulty is within allowed range
    return q.difficulty >= min && q.difficulty <= max;
  });

  if (filtered.length > 0) {
    console.log(`   ✅ Filtered to ${filtered.length} appropriate difficulty questions`);
    return filtered;
  }

  // Fallback: if no questions match, return all (prevents empty pool)
  console.warn(`   ⚠️  No questions match difficulty ${min}-${max}, using all questions`);
  return questions;
}

/**
 * Smart question filtering with all criteria
 * Combines stage, role, resume, and difficulty filtering
 * @param {string} stage - Interview stage
 * @param {string} role - Target role (frontend, backend, etc.)
 * @param {string} level - Experience level
 * @param {string} resumeText - Resume content
 * @param {Array} askedQuestionIds - Already asked question IDs
 * @returns {Object|null} Selected question or null
 */
function getSmartQuestion(stage, role = "any", level = "mid", resumeText = "", askedQuestionIds = []) {
  console.log(`\n🎯 Smart Question Selection:`);
  console.log(`   Stage: ${stage}`);
  console.log(`   Role: ${role}`);
  console.log(`   Level: ${level}`);
  
  // Step 1: Get all questions for this stage
  let questions = getQuestionsForStage(stage);
  
  if (questions.length === 0) {
    console.error(`   ❌ No questions available for stage: ${stage}`);
    return null;
  }

  // Step 2: Filter by role (CRITICAL for system adaptation)
  questions = filterByRole(questions, role);

  if (questions.length === 0) {
    console.warn(`   ⚠️  No questions match role, fetching all questions for stage`);
    questions = getQuestionsForStage(stage);
  }

  // Step 3: Filter by difficulty (based on experience level)
  questions = filterByDifficulty(questions, level);

  // Step 4: Filter by resume (only for resume_based stage)
  if (stage === "resume_based" && resumeText) {
    questions = filterByResume(questions, resumeText);
  }

  // Step 5: Select unused question
  const selectedQuestion = getUnusedQuestion(questions, askedQuestionIds);
  
  if (selectedQuestion) {
    console.log(`   ✅ Selected: "${selectedQuestion.question.slice(0, 60)}..."`);
    console.log(`   📌 Difficulty: ${selectedQuestion.difficulty || "N/A"}`);
    console.log(`   🎭 Role: ${selectedQuestion.role || "any"}`);
  }

  return selectedQuestion;
}

module.exports = {
  getStageFromIndex,
  getQuestionsForStage,
  filterByResume,
  filterByRole,
  filterByDifficulty,
  getAllowedDifficulty,
  getUnusedQuestion,
  getStageProgress,
  getSmartQuestion
};
