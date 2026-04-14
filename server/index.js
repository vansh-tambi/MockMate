require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

const app = express();

// CORS configuration - restrict to frontend domain in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://mock-mate-ai-interview.vercel.app'
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
// Increase JSON payload limit to handle large resume text
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

const PORT = process.env.PORT || 5000;
const upload = multer({ storage: multer.memoryStorage() });

const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
if (!hasGeminiKey) {
  console.warn('⚠️ GEMINI_API_KEY missing - Gemini will be used only if configured later');
}

const genAI = hasGeminiKey ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/* ============= STAGE-BASED PROGRESSION MODULES ============= */
const {
  getStageFromIndex,
  getQuestionsForStage,
  filterByResume,
  filterByRole,
  filterByDifficulty,
  getUnusedQuestion,
  getStageProgress,
  getSmartQuestion
} = require('./stageManager');

/* ============= NEW INTERVIEW ENGINE MODULES ============= */
const InterviewEngine = require('./InterviewEngine');
const EnhancedInterviewEngine = require('./EnhancedInterviewEngine');
const QuestionSelector = require('./QuestionSelector');
const interviewRoutes = require('./interviewRoutes');
const interviewRoutesV2 = require('./interview-routes-v2');

// Load questions once at startup
const questionLoader = require('./questionLoader');
let allQuestions = [];

/* ============= NEW STAGED PROGRESSION SYSTEM ============= */

// Stage files - strict 7-stage progression for realistic interview experience
const STAGE_FILES = {
  introduction: [
    'introductory_icebreaker.json',
    'self_awareness.json',
    'personality_questions.json'
  ],
  warmup: [
    'warmup_questions.json',
    'hr_basic_questions.json'
  ],
  resume_based: [
    'resume_deep_dive.json',
    'work_ethic_professionalism.json',
    'career_questions.json'
  ],
  technical: [
    'programming_fundamentals.json',
    'web_frontend.json',
    'database_backend.json',
    'backend_intermediate_advanced.json',
    'dsa_questions.json',
    'problem_solving.json',
    'frontend_advanced.json',
    'backend_advanced.json',
    'system_design.json'
  ],
  behavioral: [
    'behavioral_questions.json',
    'communication_teamwork.json',
    'situational_questions.json',
    'values_ethics_integrity.json'
  ],
  real_world: [
    'pressure_trick_questions.json',
    'leadership_questions.json',
    'leadership_behavioral.json'
  ],
  hr_closing: [
    'hr_closing.json',
    'company_role_fit.json'
  ]
};

// Strict stage order - never changes (simulates real interview flow)
const STAGE_ORDER = [
  'introduction',
  'warmup',
  'resume_based',
  'technical',
  'behavioral',
  'real_world',
  'hr_closing'
];

// Questions per stage - controls total interview length (25 total by default)
const QUESTIONS_PER_STAGE = {
  introduction: 2,
  warmup: 2,
  resume_based: 3,
  technical: 10,
  behavioral: 5,
  real_world: 2,
  hr_closing: 1
};

// Calculate total interview questions
const TOTAL_INTERVIEW_QUESTIONS = Object.values(QUESTIONS_PER_STAGE).reduce((a, b) => a + b, 0);
console.log(`📋 Interview will have ${TOTAL_INTERVIEW_QUESTIONS} total questions across 7 stages`);

// Initialize stages on startup
console.log('\n🚀 Initializing 7-Stage Interview Progression System:');
for (let stage of STAGE_ORDER) {
  const files = STAGE_FILES[stage];
  const count = QUESTIONS_PER_STAGE[stage];
  console.log(`   ✅ ${stage.padEnd(20)} → ${count} questions from ${files.length} files`);
}

/* ============= STAGE PROGRESSION FUNCTIONS ============= */

/**
 * Determine which stage based on question index
 * Ensures strict progression: introduction → warmup → resume_based → technical → behavioral → real_world → hr_closing
 */
function getCurrentStage(questionIndex) {
  let total = 0;
  for (let stage of STAGE_ORDER) {
    total += QUESTIONS_PER_STAGE[stage];
    if (questionIndex < total) {
      return stage;
    }
  }
  return 'hr_closing'; // Final stage
}

/**
 * Load all questions for a specific stage from its data files
 */
function loadStageQuestions(stage) {
  const files = STAGE_FILES[stage];
  if (!files) {
    console.warn(`⚠️ No files defined for stage: ${stage}`);
    return [];
  }

  let questions = [];
  for (let file of files) {
    try {
      const filePath = path.join(DATA_DIR, file);
      const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Extract questions depending on data structure
      if (Array.isArray(fileData)) {
        questions.push(...fileData);
      } else if (fileData.questions) {
        questions.push(...fileData.questions);
      } else if (fileData.data) {
        questions.push(...fileData.data);
      }
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err.message);
    }
  }

  console.log(`📂 Stage "${stage}" loaded ${questions.length} questions from ${files.length} files`);
  return questions;
}

/* ============= LEGACY STAGES (kept for compatibility) ============= */

// Stage definitions - this NEVER changes
const STAGES = {
  WARMUP: 'warmup',
  INTRODUCTION: 'introduction',
  RESUME: 'resume',
  ROLE_FIT: 'role_fit',
  FUNDAMENTALS: 'fundamentals',
  TECHNICAL_FRONTEND: 'technical_frontend',
  TECHNICAL_BACKEND: 'technical_backend',
  TECHNICAL_DSA: 'technical_dsa',
  SYSTEM_DESIGN: 'system_design',
  PROBLEM_SOLVING: 'problem_solving',
  BEHAVIORAL: 'behavioral',
  PRESSURE: 'pressure',
  CLOSING: 'closing'
};

// Map stages to question files
const STAGE_FILE_MAP = {
  warmup: [
    'warmup_questions.json',
    'introductory_icebreaker.json'
  ],
  introduction: [
    'self_awareness.json',
    'personality_questions.json'
  ],
  resume: [
    'career_questions.json',
    'work_ethic_professionalism.json',
    'resume_deep_dive.json'
  ],
  role_fit: [
    'company_role_fit.json',
    'values_ethics_integrity.json'
  ],
  fundamentals: [
    'programming_fundamentals.json'
  ],
  technical_frontend: [
    'web_frontend.json',
    'frontend_advanced.json'
  ],
  technical_backend: [
    'database_backend.json',
    'backend_advanced.json'
  ],
  technical_dsa: [
    'dsa_questions.json'
  ],
  system_design: [
    'system_design.json'
  ],
  problem_solving: [
    'problem_solving.json'
  ],
  behavioral: [
    'behavioral_questions.json',
    'communication_teamwork.json',
    'situational_questions.json'
  ],
  pressure: [
    'pressure_trick_questions.json'
  ],
  closing: [
    'hr_closing.json'
  ]
};

// Role-based interview sequences
const ROLE_SEQUENCES = {
  frontend: [
    STAGES.WARMUP,
    STAGES.INTRODUCTION,
    STAGES.RESUME,
    STAGES.ROLE_FIT,
    STAGES.FUNDAMENTALS,
    STAGES.TECHNICAL_FRONTEND,
    STAGES.PROBLEM_SOLVING,
    STAGES.BEHAVIORAL,
    STAGES.PRESSURE,
    STAGES.CLOSING
  ],
  backend: [
    STAGES.WARMUP,
    STAGES.INTRODUCTION,
    STAGES.RESUME,
    STAGES.ROLE_FIT,
    STAGES.FUNDAMENTALS,
    STAGES.TECHNICAL_BACKEND,
    STAGES.TECHNICAL_DSA,
    STAGES.PROBLEM_SOLVING,
    STAGES.BEHAVIORAL,
    STAGES.PRESSURE,
    STAGES.CLOSING
  ],
  fullstack: [
    STAGES.WARMUP,
    STAGES.INTRODUCTION,
    STAGES.RESUME,
    STAGES.ROLE_FIT,
    STAGES.FUNDAMENTALS,
    STAGES.TECHNICAL_FRONTEND,
    STAGES.TECHNICAL_BACKEND,
    STAGES.TECHNICAL_DSA,
    STAGES.PROBLEM_SOLVING,
    STAGES.BEHAVIORAL,
    STAGES.PRESSURE,
    STAGES.CLOSING
  ],
  'product-company': [
    STAGES.WARMUP,
    STAGES.INTRODUCTION,
    STAGES.RESUME,
    STAGES.ROLE_FIT,
    STAGES.FUNDAMENTALS,
    STAGES.TECHNICAL_FRONTEND,
    STAGES.TECHNICAL_BACKEND,
    STAGES.SYSTEM_DESIGN,
    STAGES.TECHNICAL_DSA,
    STAGES.PROBLEM_SOLVING,
    STAGES.BEHAVIORAL,
    STAGES.PRESSURE,
    STAGES.CLOSING
  ],
  default: [
    STAGES.WARMUP,
    STAGES.INTRODUCTION,
    STAGES.RESUME,
    STAGES.ROLE_FIT,
    STAGES.FUNDAMENTALS,
    STAGES.PROBLEM_SOLVING,
    STAGES.BEHAVIORAL,
    STAGES.PRESSURE,
    STAGES.CLOSING
  ]
};

/* ---------------- DATA LOADING ---------------- */

const DATA_DIR = path.join(__dirname, '..', 'ai_service', 'data');
console.log('📁 Data directory:', DATA_DIR);

const load = (f) => {
  try {
    const filePath = path.join(DATA_DIR, f);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`✅ Loaded ${f}: ${Array.isArray(data) ? data.length : 'object'} items`);
    return data;
  } catch (err) {
    console.error(`❌ Failed to load ${f}:`, err.message);
    return [];
  }
};

// Load all questions organized by stage
const STAGE_QUESTIONS = {};

Object.keys(STAGE_FILE_MAP).forEach(stage => {
  STAGE_QUESTIONS[stage] = [];
  STAGE_FILE_MAP[stage].forEach(file => {
    const questions = load(file);
    STAGE_QUESTIONS[stage].push(...questions);
  });
});

console.log('📊 Stage questions loaded:');
Object.keys(STAGE_QUESTIONS).forEach(stage => {
  console.log(`   ${stage}: ${STAGE_QUESTIONS[stage].length} questions`);
});


/* ---------------- HELPERS ---------------- */

// Enhanced skill extraction with better pattern matching
const extractSkills = (resumeText = '') => {
  const text = resumeText.toLowerCase();
  
  // Comprehensive skill patterns with variations
  const skillPatterns = {
    frontend: [
      'react', 'reactjs', 'react.js', 'react native',
      'vue', 'vuejs', 'vue.js', 
      'angular', 'angularjs',
      'html', 'html5', 'css', 'css3', 
      'javascript', 'js', 'typescript', 'ts',
      'next', 'nextjs', 'next.js',
      'redux', 'mobx', 'recoil',
      'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui',
      'sass', 'scss', 'less',
      'webpack', 'vite', 'parcel',
      'jquery', 'backbone', 'ember'
    ],
    backend: [
      'node', 'nodejs', 'node.js',
      'express', 'expressjs', 'express.js',
      'python', 'django', 'flask', 'fastapi',
      'java', 'spring', 'spring boot', 'hibernate',
      'c#', 'csharp', '.net', 'dotnet', 'asp.net',
      'php', 'laravel', 'symfony', 'codeigniter',
      'ruby', 'rails', 'ruby on rails',
      'go', 'golang', 'rust',
      'nest', 'nestjs', 'nest.js',
      'graphql', 'rest', 'restful', 'api'
    ],
    database: [
      'mongodb', 'mongo', 'mongoose',
      'postgresql', 'postgres', 'psql',
      'mysql', 'mariadb',
      'redis', 'memcached',
      'elasticsearch', 'elastic search', 'opensearch',
      'dynamodb', 'cassandra', 'couchdb',
      'sql', 'nosql', 'plsql', 't-sql',
      'oracle', 'mssql', 'sqlite',
      'firebase', 'firestore', 'supabase'
    ],
    cloud: [
      'aws', 'amazon web services', 'ec2', 's3', 'lambda', 'cloudfront',
      'azure', 'microsoft azure',
      'gcp', 'google cloud', 'google cloud platform',
      'docker', 'containerization',
      'kubernetes', 'k8s', 'helm',
      'ci/cd', 'cicd', 'jenkins', 'travis', 'circle ci',
      'github actions', 'gitlab ci', 'bitbucket pipelines',
      'terraform', 'ansible', 'puppet', 'chef',
      'nginx', 'apache', 'load balancer'
    ],
    mobile: [
      'react native', 'reactnative',
      'flutter', 'dart',
      'swift', 'swiftui', 'ios',
      'kotlin', 'android', 'java android',
      'xamarin', 'ionic', 'cordova',
      'mobile development', 'app development'
    ],
    tools: [
      'git', 'github', 'gitlab', 'bitbucket',
      'jira', 'confluence', 'trello',
      'vs code', 'visual studio', 'intellij',
      'postman', 'swagger', 'insomnia',
      'figma', 'sketch', 'adobe xd'
    ],
    testing: [
      'jest', 'mocha', 'chai', 'jasmine',
      'cypress', 'selenium', 'puppeteer', 'playwright',
      'junit', 'pytest', 'unittest',
      'testing', 'unit testing', 'integration testing', 'e2e'
    ]
  };
  
  const extractedSkills = {
    frontend: [],
    backend: [],
    database: [],
    cloud: [],
    mobile: [],
    tools: [],
    testing: [],
    all: []
  };
  
  // Track found skills to avoid duplicates
  const foundSkills = new Set();
  
  Object.entries(skillPatterns).forEach(([category, skills]) => {
    skills.forEach(skill => {
      // Create regex pattern for word boundary matching
      const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      
      if (pattern.test(text) && !foundSkills.has(skill.toLowerCase())) {
        const displaySkill = skill.charAt(0).toUpperCase() + skill.slice(1);
        extractedSkills[category].push(displaySkill);
        extractedSkills.all.push(displaySkill);
        foundSkills.add(skill.toLowerCase());
      }
    });
  });
  
  // Detect experience level with better patterns
  let experienceLevel = 'mid-level';
  
  // Check for years of experience
  const yearMatch = text.match(/(\d+)\+?\s*years?(?:\s+of)?(?:\s+experience)?/i);
  if (yearMatch) {
    const years = parseInt(yearMatch[1]);
    if (years === 0 || years < 2) {
      experienceLevel = 'fresher';
    } else if (years >= 5) {
      experienceLevel = 'senior';
    } else {
      experienceLevel = 'mid-level';
    }
  } else if (
    text.includes('fresher') || 
    text.includes('intern') || 
    text.includes('graduate') ||
    text.includes('entry level') ||
    text.includes('no experience')
  ) {
    experienceLevel = 'fresher';
  } else if (
    text.includes('senior') || 
    text.includes('lead') || 
    text.includes('architect') ||
    text.includes('principal') ||
    text.includes('manager')
  ) {
    experienceLevel = 'senior';
  }
  
  return {
    skills: extractedSkills,
    experienceLevel,
    totalSkills: extractedSkills.all.length
  };
};

// Detect role from resume AND job description (enhanced)
const detectRole = (resumeText = '', jobDescription = '') => {
  const skills = extractSkills(resumeText);
  const jd = jobDescription.toLowerCase();
  
  // Check for product-based companies first
  const productCompanies = ['google', 'amazon', 'microsoft', 'meta', 'apple', 'netflix', 'uber', 'faang'];
  if (productCompanies.some(company => jd.includes(company))) {
    return 'product-company';
  }
  
  // If job description is explicit, use it
  if (jd.includes('frontend') || jd.includes('front-end')) {
    return 'frontend';
  }
  if (jd.includes('backend') || jd.includes('back-end')) {
    return 'backend';
  }
  if (jd.includes('fullstack') || jd.includes('full-stack') || jd.includes('full stack')) {
    return 'fullstack';
  }
  
  // Otherwise, detect from resume skills
  const frontendCount = skills.skills.frontend.length;
  const backendCount = skills.skills.backend.length;
  
  if (frontendCount > 0 && backendCount > 0) {
    return 'fullstack';
  }
  if (frontendCount > backendCount) {
    return 'frontend';
  }
  if (backendCount > frontendCount) {
    return 'backend';
  }
  
  return 'default';
};

// Get stage from role and question index
const getStageForQuestion = (role, questionIndex) => {
  const sequence = ROLE_SEQUENCES[role] || ROLE_SEQUENCES.default;
  
  // Each stage gets 3 questions (configurable)
  const questionsPerStage = 3;
  const stageIndex = Math.floor(questionIndex / questionsPerStage);
  
  // Safety check - if we exceed sequence length, repeat last stage
  if (stageIndex >= sequence.length) {
    return sequence[sequence.length - 1];
  }
  
  return sequence[stageIndex];
};

const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const shorten = (q) => {
  // Absolute safety net for runaway questions
  if (q.length > 140) {
    return `${q.split('?')[0]}?`;
  }
  return q;
};

const cleanJson = (t = '') => {
  const s = t.replace(/```json|```/g, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1) {
    try {
      return JSON.stringify(JSON.parse(s.slice(a, b + 1)));
    } catch {}
  }
  return '{"direction":"","answer":""}';
};

// Evaluation scoring bands
const SCORING_BANDS = {
  POOR: { min: 0, max: 30, label: 'Poor', color: 'red', advice: 'Needs significant improvement' },
  BASIC: { min: 31, max: 50, label: 'Basic', color: 'orange', advice: 'Foundation present, needs practice' },
  GOOD: { min: 51, max: 70, label: 'Good', color: 'yellow', advice: 'Solid understanding, room for growth' },
  STRONG: { min: 71, max: 85, label: 'Strong', color: 'green', advice: 'Well-prepared, minor improvements' },
  HIRE_READY: { min: 86, max: 100, label: 'Hire-Ready', color: 'cyan', advice: 'Excellent, interview-ready' }
};

const getScoreBand = (score) => {
  for (const [key, band] of Object.entries(SCORING_BANDS)) {
    if (score >= band.min && score <= band.max) {
      return band;
    }
  }
  return SCORING_BANDS.BASIC;
};

// Adaptive difficulty selector
const selectQuestionByDifficulty = (pool, targetDifficulty = 2, experienceLevel = 'mid-level') => {
  if (!pool || pool.length === 0) return null;
  
  // Adjust target difficulty based on experience
  if (experienceLevel === 'fresher') {
    targetDifficulty = Math.max(1, targetDifficulty - 1);
  } else if (experienceLevel === 'senior') {
    targetDifficulty = Math.min(5, targetDifficulty + 1);
  }
  
  // Filter questions by difficulty (if available)
  const difficultyFiltered = pool.filter(q => {
    if (!q.difficulty) return true;
    return Math.abs(q.difficulty - targetDifficulty) <= 1;
  });
  
  const selectedPool = difficultyFiltered.length > 0 ? difficultyFiltered : pool;
  return randomPick(selectedPool);
};

/* ---------------- ROUTES ---------------- */

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      dataDir: DATA_DIR,
      dataLoaded: {
        stages: STAGE_ORDER.length,
        totalQuestions: TOTAL_INTERVIEW_QUESTIONS,
      }
    }
  });
});

// Platform metrics endpoint - returns comprehensive dataset statistics
app.get('/api/platform-metrics', async (req, res) => {
  try {
    const { getPlatformMetrics, printMetricsDashboard } = require('./services/PlatformMetrics');
    const metrics = await getPlatformMetrics();
    
    // Print dashboard if verbose flag is set
    if (req.query.verbose === 'true') {
      printMetricsDashboard(metrics);
    }
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching platform metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate platform metrics',
      message: error.message
    });
  }
});

// Parse resume endpoint
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    console.log('📄 Resume upload:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'text input');
    
    let resumeText = '';
    
    // Handle file upload (PDF or text)
    if (req.file) {
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      
      console.log('📎 File uploaded:', {
        type: mimeType,
        size: fileBuffer.length,
        name: req.file.originalname
      });
      
      // Handle PDF files
      if (mimeType === 'application/pdf' || req.file.originalname?.endsWith('.pdf')) {
        try {
          // Try PDF parsing with correct pdfParse API
          const pdfData = await pdfParse(fileBuffer);
          resumeText = pdfData.text || '';
          console.log('✅ PDF extracted successfully, text length:', resumeText.length);
          
          // If PDF extraction resulted in very little text, try fallback
          if (!resumeText || resumeText.trim().length < 50) {
            console.warn('⚠️ PDF text extraction resulted in minimal text, trying UTF-8 fallback');
            const fallbackText = fileBuffer.toString('utf-8');
            if (fallbackText.length > resumeText.length) {
              resumeText = fallbackText;
              console.log('✅ Using fallback text extraction');
            }
          }
        } catch (pdfError) {
          console.error('❌ PDF extraction failed:', pdfError.message);
          console.log('⚠️ Attempting fallback text extraction...');
          
          // Try to extract as text anyway (some PDFs might work)
          try {
            resumeText = fileBuffer.toString('utf-8');
            console.log('✅ Fallback extraction successful, length:', resumeText.length);
          } catch (fallbackError) {
            return res.status(400).json({ 
              error: 'Failed to extract text from PDF. Please try uploading as a text file or using manual input.',
              details: pdfError.message,
              suggestion: 'Copy and paste your resume text using the Manual option instead.'
            });
          }
        }
      } else {
        // Handle text files
        resumeText = fileBuffer.toString('utf-8');
        console.log('✅ Text file extracted, length:', resumeText.length);
      }
    } else if (req.body.text) {
      resumeText = req.body.text;
      console.log('📝 Text provided directly, length:', resumeText.length);
    } else {
      return res.status(400).json({ error: 'No resume provided' });
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ 
        error: 'Resume text too short or empty',
        text: resumeText,
        length: resumeText?.length || 0
      });
    }

    // ===== INSTANT PATTERN-BASED EXTRACTION (no AI calls needed) =====
    // All questions are pre-loaded in memory. Resume parsing only needs skill extraction
    // to filter questions — no need to call slow AI APIs for this.
    console.log('⚡ Using instant pattern-based extraction...');
    
    const enhancedSkills = extractSkills(resumeText);
    
    const parsedData = {
      skills: enhancedSkills.skills.all,
      skillsByCategory: enhancedSkills.skills,
      totalSkills: enhancedSkills.skills.all.length,
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      summary: resumeText.slice(0, 300),
      experienceLevel: enhancedSkills.experienceLevel,
      parsingMethod: 'instant-pattern-extraction'
    };

    console.log('✅ Resume parsed instantly:', {
      skills: parsedData.totalSkills,
      level: parsedData.experienceLevel,
      frontend: enhancedSkills.skills.frontend.length,
      backend: enhancedSkills.skills.backend.length
    });

    // Return clean text (first 2000 chars) instead of raw PDF to reduce payload
    const cleanText = resumeText.slice(0, 2000);
    
    res.json({
      success: true,
      data: parsedData,
      text: cleanText,
      textLength: resumeText.length,
      service: 'instant-local'
    });

  } catch (error) {
    console.error('❌ Resume parsing error:', error.message);
    res.status(500).json({ 
      error: 'Failed to parse resume',
      details: error.message 
    });
  }
});

// Debug endpoint to check stage data loading
app.get('/api/debug/stages', (req, res) => {
  const stageInfo = {};
  
  for (let stage of STAGE_ORDER) {
    try {
      const questions = loadStageQuestions(stage);
      stageInfo[stage] = {
        fileCount: STAGE_FILES[stage].length,
        questionCount: questions.length,
        expectedCount: QUESTIONS_PER_STAGE[stage],
        files: STAGE_FILES[stage]
      };
    } catch (err) {
      stageInfo[stage] = {
        error: err.message
      };
    }
  }

  res.json({
    DATA_DIR,
    totalInterview: TOTAL_INTERVIEW_QUESTIONS,
    stages: STAGE_ORDER,
    stageInfo,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify a question can be generated
app.post('/api/debug/test-question', async (req, res) => {
  try {
    const { questionIndex = 0 } = req.body;
    
    const stage = getCurrentStage(questionIndex);
    const questions = loadStageQuestions(stage);
    const selected = getUnusedQuestion(questions, []);

    res.json({
      questionIndex,
      stage,
      questionsInStage: questions.length,
      selectedQuestion: selected,
      responseWillHave: {
        success: true,
        question: {
          text: typeof selected === 'string' ? selected : selected.question,
          index: questionIndex,
          stage
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

/* ============= MAIN GENERATE-QA ENDPOINT ============= */
app.post('/api/generate-qa', async (req, res) => {
  try {
    const {
      resumeText = '',
      jobDescription = '',
      questionIndex = 0,
      askedQuestions = [],
      role = 'any',
      level = 'mid'
    } = req.body;

    console.log(`🚀 Q${questionIndex + 1} request | role: ${role} | level: ${level} | asked: ${askedQuestions.length}`);

    // ===== STEP 1: Determine current stage based on question index =====
    let currentStage;
    let stageProgress;
    try {
      currentStage = getStageFromIndex(questionIndex);
      stageProgress = getStageProgress(questionIndex);
    } catch (stageError) {
      console.error('❌ Error determining stage:', stageError.message);
      return res.status(400).json({ 
        error: 'Failed to determine interview stage',
        details: stageError.message
      });
    }

    // ===== STEP 2: Smart Question Selection (combines all filtering) =====
    let selectedQuestion;
    try {
      selectedQuestion = getSmartQuestion(
        currentStage,
        role,
        level,
        resumeText,
        askedQuestions,
        questionIndex
      );
      
      if (!selectedQuestion) {
        console.error('❌ Could not select a question');
        return res.status(500).json({ 
          error: 'Could not select a question from the available pool',
          stage: currentStage,
          role,
          level
        });
      }
    } catch (selectError) {
      console.error('❌ Error selecting question:', selectError.message);
      return res.status(500).json({ 
        error: 'Failed to select question',
        details: selectError.message
      });
    }

    const questionText = typeof selectedQuestion === 'string' 
      ? selectedQuestion 
      : selectedQuestion.question || JSON.stringify(selectedQuestion);

    console.log(`❓ Selected: ${questionText.slice(0, 80)}...`);

    // ===== RICH GUIDANCE from pre-loaded question data =====
    let direction = 'Answer clearly and concisely, relating to your experience.';
    let answer = 'Provide a brief, structured response with specific examples when relevant.';
    let tips = ['Be specific with examples', 'Keep it concise'];
    let followUps = [];

    // Use ideal_points for tips
    if (selectedQuestion.ideal_points && selectedQuestion.ideal_points.length > 0) {
      tips = selectedQuestion.ideal_points;
    }

    // Build direction from evaluation_rubric
    if (selectedQuestion.evaluation_rubric) {
      const rubricKeys = Object.keys(selectedQuestion.evaluation_rubric);
      const rubricPoints = rubricKeys.map(k => {
        const val = selectedQuestion.evaluation_rubric[k];
        return typeof val === 'object' ? val.description : val;
      }).filter(Boolean);
      if (rubricPoints.length > 0) {
        direction = `Focus on: ${rubricPoints.slice(0, 3).join('; ')}.`;
      }
    }

    // Build sample answer from ideal_points
    if (tips.length > 1) {
      answer = `A strong answer should cover: ${tips.slice(0, 4).join(', ')}.`;
    }

    // Include follow-ups for bonus practice
    if (selectedQuestion.follow_ups && selectedQuestion.follow_ups.length > 0) {
      followUps = selectedQuestion.follow_ups;
    }

    // Stage-specific direction adjustments
    const stageDirections = {
      introduction: 'Keep your answer warm and conversational. Show personality while staying professional.',
      warmup: 'This is a warm-up question. Be relaxed but thoughtful in your response.',
      resume_based: 'Connect your answer to specific experiences from your resume.',
      technical: 'Demonstrate technical depth. Use precise terminology and explain your reasoning.',
      behavioral: 'Use the STAR method (Situation, Task, Action, Result) to structure your answer.',
      real_world: 'Think practically. Show how you handle real-world challenges and ambiguity.',
      hr_closing: 'Be honest and professional. Show genuine interest and thoughtful career planning.'
    };

    if (stageDirections[currentStage] && !selectedQuestion.evaluation_rubric) {
      direction = stageDirections[currentStage];
    }

    // ===== Build and send response instantly =====
    const responsePayload = {
      success: true,
      stage: currentStage,
      stageProgress: {
        current: questionIndex,
        total: TOTAL_INTERVIEW_QUESTIONS,
        stageQuestionsRemaining: QUESTIONS_PER_STAGE[currentStage] - (questionIndex - getQuestionIndexForStage(currentStage))
      },
      question: {
        id: selectedQuestion.id || `q_${questionIndex}`,
        text: questionText,
        index: questionIndex,
        stage: currentStage
      },
      guidance: {
        direction: String(direction),
        answer: String(answer),
        tips: Array.isArray(tips) ? tips.map(t => String(t)) : [String(tips)],
        followUps: followUps.map(f => String(f)),
        source: 'static-fast-load'
      },
      nextAction: questionIndex < TOTAL_INTERVIEW_QUESTIONS - 1 
        ? `Next question will be in "${STAGE_ORDER[getStageIndexFromStage(currentStage) + 1] || 'final'}" stage`
        : 'This is the final question of your interview',
      sessionState: {
        askedQuestions: [...askedQuestions, selectedQuestion.id || questionText],
        currentStage,
        questionIndex
      }
    };

    console.log(`✅ Q${questionIndex + 1} ready [${currentStage}]`);
    res.json(responsePayload);

  } catch (error) {
    console.error('\n❌ ERROR in /api/generate-qa:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate question',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper function to get starting question index for a stage
 */
function getQuestionIndexForStage(stage) {
  let index = 0;
  for (let s of STAGE_ORDER) {
    if (s === stage) return index;
    index += QUESTIONS_PER_STAGE[s];
  }
  return index;
}

/**
 * Helper function to get stage position in order
 */
function getStageIndexFromStage(stage) {
  return STAGE_ORDER.indexOf(stage);
}

/* ---------------- EVALUATION ENDPOINT ---------------- */

app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const {
      question,
      userAnswer,
      idealAnswer,
      stage,
      experienceLevel = 'mid-level'
    } = req.body;

    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'Question and answer required' });
    }

    console.log('📊 Evaluating answer for:', question.slice(0, 50) + '...');

    // ===== FAST LOCAL EVALUATION (no AI needed) =====
    // Keyword-match scoring against ideal points for instant feedback
    const answerLower = userAnswer.toLowerCase();
    const questionLower = question.toLowerCase();
    const words = answerLower.split(/\s+/);
    const wordCount = words.length;

    // Scoring dimensions (each 0-20, total 0-100)
    let relevance = 10, clarity = 10, structure = 10, technical_depth = 10, impact = 10;

    // 1. Relevance: Does the answer relate to the question?
    const questionKeywords = questionLower.split(/\s+/).filter(w => w.length > 3);
    const matchedKeywords = questionKeywords.filter(kw => answerLower.includes(kw));
    relevance = Math.min(20, Math.round((matchedKeywords.length / Math.max(questionKeywords.length, 1)) * 20) + 5);

    // 2. Clarity: Is the answer well-structured and readable?
    if (wordCount > 20) clarity += 3;
    if (wordCount > 50) clarity += 3;
    if (userAnswer.includes('.')) clarity += 2;
    if (userAnswer.includes(',')) clarity += 1;
    clarity = Math.min(20, clarity);

    // 3. Structure: Does the answer have organization?
    if (wordCount > 30) structure += 3;
    if (userAnswer.match(/first|second|third|finally|also|moreover|however/i)) structure += 3;
    if (userAnswer.includes('\n') || userAnswer.includes('. ')) structure += 2;
    structure = Math.min(20, structure);

    // 4. Technical depth: technical terms, specifics
    const techTerms = ['api', 'database', 'server', 'client', 'function', 'class', 'component',
      'algorithm', 'data structure', 'framework', 'library', 'react', 'node', 'python',
      'javascript', 'sql', 'html', 'css', 'git', 'docker', 'aws', 'rest', 'http',
      'testing', 'deployment', 'architecture', 'scalable', 'performance', 'security',
      'agile', 'scrum', 'ci/cd', 'microservice', 'cache', 'async', 'promise'];
    const foundTech = techTerms.filter(t => answerLower.includes(t));
    technical_depth = Math.min(20, 8 + foundTech.length * 2);

    // 5. Impact: Does the answer show results/examples?
    if (answerLower.match(/example|instance|project|built|created|developed|implemented|achieved|improved|reduced|increased/)) impact += 4;
    if (answerLower.match(/\d+%|\d+ percent|team|collaboration|lead/)) impact += 3;
    if (wordCount > 40) impact += 2;
    impact = Math.min(20, impact);

    // Stage-aware scoring adjustment:
    // Behavioral questions shouldn't penalize for lack of tech terms
    const isBehavioral = questionLower.match(/tell me about a time|describe a situation|how do you handle|give an example|what would you do/);
    if (isBehavioral) {
      // Boost impact/clarity for behavioral, reduce tech_depth penalty
      technical_depth = Math.max(technical_depth, 12);
      if (answerLower.match(/situation|task|action|result|outcome|learned|team|challenge/)) {
        impact = Math.min(20, impact + 3);
        structure = Math.min(20, structure + 2);
      }
    }

    const score = relevance + clarity + structure + technical_depth + impact;
    const scoreBand = getScoreBand(score);

    // Generate feedback
    const strengths = [];
    const improvements = [];

    if (relevance >= 14) strengths.push('Answer directly addresses the question');
    if (clarity >= 14) strengths.push('Clear and well-articulated response');
    if (technical_depth >= 14) strengths.push('Good technical vocabulary and depth');
    if (impact >= 14) strengths.push('Demonstrates real-world impact with examples');
    if (wordCount > 50) strengths.push('Comprehensive coverage of the topic');

    if (strengths.length === 0) strengths.push('Attempted to answer the question');

    if (relevance < 12) improvements.push('Focus more directly on what the question is asking');
    if (clarity < 12) improvements.push('Use complete sentences and clearer language');
    if (technical_depth < 12) improvements.push('Include more specific technical details');
    if (impact < 12) improvements.push('Add concrete examples or measurable outcomes');
    if (wordCount < 20) improvements.push('Elaborate more — aim for at least 3-4 sentences');

    if (improvements.length === 0) improvements.push('Continue practicing for even more polish');

    const feedback = score >= 70 
      ? 'Strong answer with good depth and relevance.' 
      : score >= 50 
        ? 'Decent attempt. Add more specifics and examples to strengthen it.'
        : 'Needs more depth. Try to directly address the question with concrete examples.';

    console.log(`✅ Evaluation: ${score}/100 (${scoreBand.label})`);

    res.json({
      score,
      feedback,
      strengths,
      improvements,
      band: scoreBand.label,
      bandColor: scoreBand.color,
      advice: scoreBand.advice,
      breakdown: { relevance, clarity, structure, technical_depth, impact },
      aiData: { strengths, improvements }
    });

  } catch (e) {
    console.error('❌ Evaluation Error:', e.message);
    res.status(500).json({ 
      error: 'Evaluation failed',
      score: 50,
      feedback: 'Unable to evaluate at this time',
      band: 'Basic'
    });
  }
});

/* ============= NEW INTERVIEW FLOW API ============= */

// Initialize questions from dataset on first request
app.get('/api/questions/load', (req, res) => {
  try {
    if (allQuestions.length === 0) {
      // Updated: questionLoader now exports object with methods
      allQuestions = questionLoader.getAllQuestions();
    }
    
    res.json({
      success: true,
      message: 'Questions loaded from dataset',
      totalQuestions: allQuestions.length,
      usageStats: questionLoader.getAllUsageStats ? questionLoader.getAllUsageStats() : {}
    });
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load questions'
    });
  }
});

// Get all questions
app.get('/api/questions', (req, res) => {
  try {
    if (allQuestions.length === 0) {
      // Updated: questionLoader now exports object with methods
      allQuestions = questionLoader.getAllQuestions();
    }
    
    res.json({
      success: true,
      totalQuestions: allQuestions.length,
      questions: allQuestions
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions'
    });
  }
});

// Mount interview routes
app.use('/api/interview', interviewRoutes);

// Mount enhanced interview routes v2
app.use('/api/interview', interviewRoutesV2);

/* ============= END NEW INTERVIEW FLOW API ============= */

/* ---------------- START ---------------- */

app.listen(PORT, () => {
  console.log(`✅ MockMate running on http://localhost:${PORT}`);
  
  // Print platform metrics dashboard on startup (non-blocking)
  const { getPlatformMetrics, printMetricsDashboard } = require('./services/PlatformMetrics');
  getPlatformMetrics()
    .then(metrics => {
      printMetricsDashboard(metrics);
    })
    .catch(error => {
      console.warn('⚠️  Could not load platform metrics:', error.message);
    });
});
