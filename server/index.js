require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const pdf = pdfParse.default || pdfParse;

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

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY missing');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
const QuestionSelector = require('./QuestionSelector');
const interviewRoutes = require('./interviewRoutes');

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

// Parse resume endpoint
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    console.log('📄 ===== RESUME PARSING REQUEST RECEIVED =====');
    console.log('Request headers:', req.headers);
    console.log('Request file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'NO FILE');
    console.log('Request body:', req.body);
    
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
          // Try PDF parsing with options
          const pdfData = await pdf(fileBuffer, {
            max: 0, // Parse all pages
            version: 'default'
          });
          resumeText = pdfData.text;
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

    console.log('🤖 Using AI to parse resume...');
    
    // Use Gemini AI for intelligent resume parsing
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const parsePrompt = `
You are a professional resume parser. Analyze this resume and extract structured information.

RESUME TEXT:
${resumeText}

Extract and return ONLY a JSON object with this exact structure:
{
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Time period",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "School/University",
      "year": "Year or period"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["certification1", "certification2"],
  "summary": "Brief professional summary",
  "experienceLevel": "fresher|mid-level|senior"
}

Be thorough in extracting ALL technical skills mentioned (programming languages, frameworks, tools, databases, cloud services, etc.).
If a field is not found in the resume, use an empty array [] or empty string "".
Return ONLY the JSON object, no additional text or markdown.
`;

    let result;
    let responseText;
    
    // Retry logic for rate limiting (429 errors) - 5 attempts with exponential backoff
    let retries = 5;
    let lastError = null;
    
    while (retries > 0) {
      try {
        console.log(`🔄 Calling Gemini API (attempt ${4 - retries}/3)...`);
        result = await model.generateContent(parsePrompt);
        console.log('✅ Gemini response received');
        responseText = result.response.text();
        console.log('📝 Response length:', responseText.length);
        break; // Success, exit retry loop
        
      } catch (aiError) {
        lastError = aiError;
        console.error(`❌ Gemini API error (attempt ${4 - retries}/3):`, {
          message: aiError.message,
          status: aiError.status,
          code: aiError.code
        });
        
        // Check if it's a rate limit error (429, quota exceeded, rate limited)
        const isRateLimitError = aiError.message?.toLowerCase().includes('429') ||
          aiError.message?.toLowerCase().includes('rate limit') ||
          aiError.message?.toLowerCase().includes('quota') ||
          aiError.message?.toLowerCase().includes('resource exhausted') ||
          aiError.code === 429 ||
          aiError.status === 429;
        
        if (isRateLimitError) {
          retries--;
          if (retries > 0) {
            // Exponential backoff: 2s, 4s, 8s, 16s
            const delayMs = Math.pow(2, 5 - retries) * 1000;
            console.log(`⏳ Rate limited. Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        } else if (aiError.message?.includes('API key')) {
          return res.status(500).json({
            error: 'AI service not configured',
            details: 'GEMINI_API_KEY is missing or invalid',
            suggestion: 'Contact administrator to configure API key'
          });
        } else {
          throw aiError; // Non-retryable error
        }
      }
    }
    
    // If we exhausted retries, throw the last error
    if (lastError && retries === 0) {
      console.error('❌ Failed after 3 retry attempts');
      return res.status(503).json({
        error: 'AI service temporarily unavailable (rate limited)',
        details: 'The AI service is experiencing high load. Please try again in a moment.',
        suggestion: 'Please wait 30-60 seconds and try again.'
      });
    }
    
    // Clean and parse JSON
    let parsedData;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      console.log('🔍 Attempting to parse JSON (first 200 chars):', cleanedResponse.slice(0, 200));
      parsedData = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful');
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', {
        error: parseError.message,
        responseLength: responseText.length,
        firstChars: responseText.slice(0, 300)
      });
      
      // Fallback to basic extraction
      const basicSkills = extractSkills(resumeText);
      parsedData = {
        skills: basicSkills.skills.all,
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        summary: resumeText.slice(0, 200),
        experienceLevel: basicSkills.experienceLevel
      };
      console.log('⚠️ Using fallback data due to JSON parse error');
    }

    // Enhance with pattern-based extraction
    const enhancedSkills = extractSkills(resumeText);
    
    // Merge AI-extracted skills with pattern-based skills
    const allSkills = new Set([
      ...(parsedData.skills || []),
      ...enhancedSkills.skills.all
    ]);
    
    parsedData.skills = Array.from(allSkills);
    parsedData.skillsByCategory = enhancedSkills.skills;
    parsedData.totalSkills = parsedData.skills.length;
    
    // Use pattern-based experience level if AI didn't provide one
    if (!parsedData.experienceLevel || parsedData.experienceLevel === '') {
      parsedData.experienceLevel = enhancedSkills.experienceLevel;
    }

    console.log('✅ Resume parsed successfully:', {
      skills: parsedData.totalSkills,
      experience: parsedData.experience?.length || 0,
      education: parsedData.education?.length || 0,
      projects: parsedData.projects?.length || 0,
      level: parsedData.experienceLevel
    });

    // Return clean text (first 2000 chars) instead of raw PDF to reduce payload
    const cleanText = resumeText.slice(0, 2000);
    
    res.json({
      success: true,
      data: parsedData,
      text: cleanText,
      textLength: resumeText.length
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

    console.log('\n🚀 ===== GENERATE Q&A REQUEST (STAGED) =====');
    console.log('📊 Current question index:', questionIndex);
    console.log('📝 Already asked questions:', askedQuestions.length);
    if (askedQuestions.length > 0) {
      console.log('   Sample:', askedQuestions.slice(0, 2).map(q => (typeof q === 'string' && q.length > 50) ? q.substring(0, 50) + '...' : q));
    }
    console.log('🎭 Role:', role);
    console.log('📊 Level:', level);

    // ===== STEP 1: Determine current stage based on question index =====
    let currentStage;
    let stageProgress;
    try {
      currentStage = getStageFromIndex(questionIndex);
      stageProgress = getStageProgress(questionIndex);
      console.log(`\n📍 Current Stage: ${currentStage.toUpperCase()}`);
      console.log(`   Description: ${stageProgress.description}`);
      console.log(`   Stage progress: ${stageProgress.stageProgress}`);
      console.log(`   Overall progress: ${stageProgress.overallProgress} (${stageProgress.percentComplete}%)`);
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
        askedQuestions
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

    console.log(`\n❓ Selected Question: ${questionText.slice(0, 80)}...`);

    // ===== STEP 4: Extract resume analysis for context =====
    let resumeAnalysis;
    try {
      resumeAnalysis = extractSkills(resumeText);
      console.log(`\n👤 Resume Analysis:
   Skills: ${resumeAnalysis.totalSkills}
   Level: ${resumeAnalysis.experienceLevel}
   Frontend: ${resumeAnalysis.skills.frontend.length}
   Backend: ${resumeAnalysis.skills.backend.length}`);
    } catch (analysisError) {
      console.error('⚠️ Error analyzing resume:', analysisError.message);
      resumeAnalysis = { skills: { all: [], frontend: [], backend: [] }, experienceLevel: 'mid-level', totalSkills: 0 };
    }

    // ===== STEP 5: Contextualize question using Gemini =====
    console.log('\n🤖 Generating contextual answer...');
    
    const prompt = `You are an interview coach preparing a candidate.

Stage: ${currentStage.replace('_', ' ').toUpperCase()}

Candidate Profile:
- Skills: ${resumeAnalysis.totalSkills > 0 ? resumeAnalysis.skills.all.slice(0, 5).join(', ') : 'Not specified'}
- Experience Level: ${resumeAnalysis.experienceLevel}
- Target Role: ${jobDescription || 'Not specified'}

Resume Summary:
${resumeText.slice(0, 500)}

Job Requirements:
${jobDescription.slice(0, 300)}

Interview Question:
"${questionText}"

Provide a JSON response with:
1. "direction": One-line coaching tip for answering this question
2. "answer": Brief, professional sample answer (3-4 sentences max)
3. "tips": Array of 2-3 tips to improve the answer

Respond ONLY with valid JSON (no markdown, no extra text):`;

    let direction = 'Answer clearly and concisely, relating to your experience.';
    let answer = 'Provide a brief, structured response with specific examples when relevant.';
    let tips = ['Be specific with examples', 'Keep it concise'];

  // Retry logic for rate limiting (429 errors) - 5 attempts with exponential backoff
  let retries = 5;
    let lastError = null;
    
    while (retries > 0) {
      try {
        console.log(`🔐 Checking Gemini API key...`);
        if (!process.env.GEMINI_API_KEY) {
          console.error('❌ GEMINI_API_KEY not set in environment');
          throw new Error('Gemini API key not configured');
        }
        console.log('✓ API key found');

  console.log(`⏳ Calling Gemini API (attempt ${6 - retries}/5)...`);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const response = await model.generateContent(prompt);
        
        if (!response || !response.response || !response.response.text) {
          console.warn('⚠️ Empty response from Gemini, using defaults');
        } else {
          const responseText = response.response.text();
          console.log('✓ Gemini returned text response');
          
          const cleaned = responseText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

          console.log('📝 Gemini response (first 100 chars):', cleaned.slice(0, 100));

          try {
            const parsed = JSON.parse(cleaned);
            direction = parsed.direction || direction;
            answer = parsed.answer || answer;
            tips = parsed.tips || tips;
            console.log('✅ Contextual answer generated successfully');
          } catch (parseError) {
            console.warn('⚠️ Could not parse Gemini JSON, using defaults:', parseError.message);
            console.warn('   Output was:', cleaned.slice(0, 200));
          }
        }
        break; // Success, exit retry loop
        
      } catch (aiError) {
        lastError = aiError;
        console.error(`❌ Gemini API error (attempt ${6 - retries}/5):`, aiError.message);
        
        // Check if it's a rate limit error (429, quota exceeded, rate limited)
        const isRateLimitError = aiError.message?.toLowerCase().includes('429') ||
          aiError.message?.toLowerCase().includes('rate limit') ||
          aiError.message?.toLowerCase().includes('quota') ||
          aiError.message?.toLowerCase().includes('resource exhausted') ||
          aiError.code === 429 ||
          aiError.status === 429;
        
        if (isRateLimitError) {
          retries--;
          if (retries > 0) {
            // Exponential backoff: 2s, 4s, 8s, 16s
            const delayMs = Math.pow(2, 5 - retries) * 1000;
            console.log(`⏳ Rate limited. Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        } else {
          console.warn('⚠️ Gemini API error (non-retryable), using defaults:', aiError.message);
          break; // Non-retryable error, use defaults and continue
        }
      }
    }
    
    if (lastError && retries === 0 && lastError.message?.includes('429')) {
      console.warn('❌ Rate limited after 3 attempts, using default answers');
    }

    // ===== STEP 6: Validate response structure before sending =====
    console.log('\n🔍 Building response payload...');
    
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
        tips: Array.isArray(tips) ? tips.map(t => String(t)) : [String(tips)]
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

    // Validate response payload
    console.log('✓ Checking success flag:', !!responsePayload.success);
    console.log('✓ Checking question object:', !!responsePayload.question);
    console.log('✓ Checking question.text length:', responsePayload.question.text?.length || 0);
    console.log('✓ Checking question.index:', responsePayload.question.index);
    console.log('✓ Checking stage:', responsePayload.question.stage);
    console.log('✓ Checking guidance.direction length:', responsePayload.guidance.direction?.length || 0);
    console.log('✓ Checking guidance.answer length:', responsePayload.guidance.answer?.length || 0);
    console.log('✓ Checking guidance.tips length:', responsePayload.guidance.tips?.length || 0);

    if (!responsePayload.success || !responsePayload.question || !responsePayload.question.text) {
      console.error('❌ Invalid response payload structure');
      console.error('   success:', responsePayload.success);
      console.error('   question:', responsePayload.question);
      console.error('   question.text:', responsePayload.question?.text);
      return res.status(500).json({ 
        error: 'Response payload validation failed',
        debug: { 
          hasSuccess: !!responsePayload.success,
          hasQuestion: !!responsePayload.question,
          hasText: !!responsePayload.question?.text,
          questiony: responsePayload.question
        }
      });
    }

    console.log('\n✅ Response ready to send to frontend');
    console.log('   Question text preview:', questionText.slice(0, 60) + '...');
    console.log('   Guidance direction:', direction.slice(0, 60) + '...');
    
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

    // Use Gemini for evaluation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const evaluationPrompt = `
You are an expert technical interviewer evaluating a candidate's answer.

Experience Level: ${experienceLevel}
Interview Stage: ${stage}

QUESTION: "${question}"

CANDIDATE'S ANSWER: "${userAnswer}"

${idealAnswer ? `IDEAL ANSWER FOR REFERENCE: "${idealAnswer}"` : ''}

Evaluate the answer and provide:
1. Score (0-100)
2. Brief feedback (2-3 sentences)
3. Strengths (array of 1-2 items)
4. Improvements (array of 1-2 items)
5. Band (Poor/Basic/Good/Strong/Hire-Ready)

Respond ONLY in JSON:
{
  "score": 75,
  "feedback": "Clear explanation with good examples...",
  "strengths": ["Clear communication", "Relevant examples"],
  "improvements": ["Add more technical depth", "Mention edge cases"],
  "band": "Good"
}
`;

    const result = await model.generateContent(evaluationPrompt);
    const responseText = result.response.text();
    const cleaned = cleanJson(responseText);
    const evaluation = JSON.parse(cleaned);

    // Get scoring band details
    const scoreBand = getScoreBand(evaluation.score || 50);

    console.log(`✅ Evaluation complete: ${evaluation.score}/100 (${scoreBand.label})`);

    res.json({
      score: evaluation.score || 50,
      feedback: evaluation.feedback || 'Good attempt',
      strengths: evaluation.strengths || [],
      improvements: evaluation.improvements || [],
      band: scoreBand.label,
      bandColor: scoreBand.color,
      advice: scoreBand.advice
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

/* ============= END NEW INTERVIEW FLOW API ============= */

/* ---------------- START ---------------- */

app.listen(PORT, () => {
  console.log(`✅ MockMate running on http://localhost:${PORT}`);
});
