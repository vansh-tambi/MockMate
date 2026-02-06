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
app.use(cors());
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

/* ---------------- UNIVERSAL INTERVIEW STAGES ---------------- */

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
    
    try {
      console.log('🔄 Calling Gemini API...');
      result = await model.generateContent(parsePrompt);
      console.log('✅ Gemini response received');
      responseText = result.response.text();
      console.log('📝 Response length:', responseText.length);
    } catch (aiError) {
      console.error('❌ Gemini API error:', {
        message: aiError.message,
        status: aiError.status,
        code: aiError.code
      });
      
      // Provide helpful error message
      if (aiError.message?.includes('API key')) {
        return res.status(500).json({
          error: 'AI service not configured',
          details: 'GEMINI_API_KEY is missing or invalid',
          suggestion: 'Contact administrator to configure API key'
        });
      }
      
      throw aiError; // Re-throw to be caught by outer catch block
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

app.post('/api/generate-qa', async (req, res) => {
  try {
    const {
      resumeText = '',
      jobDescription = '',
      questionIndex = 0,
      questionCount = 10,
      sessionMemory = { askedQuestions: [], weakTopics: [], strongTopics: [] }
    } = req.body;

    console.log('📥 Received request:', { 
      resumeText: resumeText.length, 
      jobDescription: jobDescription.length, 
      questionIndex, 
      questionCount 
    });

    // Extract skills from resume
    const resumeAnalysis = extractSkills(resumeText);
    console.log('🔍 Resume Analysis:', {
      skills: resumeAnalysis.totalSkills,
      level: resumeAnalysis.experienceLevel,
      frontend: resumeAnalysis.skills.frontend.length,
      backend: resumeAnalysis.skills.backend.length
    });

    // Detect role from BOTH resume and job description
    const detectedRole = detectRole(resumeText, jobDescription);
    console.log(`🎯 Detected role: ${detectedRole}`);

    // Validate datasets loaded
    const totalQuestions = Object.values(STAGE_QUESTIONS).reduce((sum, arr) => sum + arr.length, 0);
    if (totalQuestions === 0) {
      console.error('❌ Data loading failed - no questions loaded');
      return res.status(500).json({ error: 'Data loading failed. Please check data files.' });
    }

    const qaPairs = [];
    const numQuestions = Math.min(Math.max(questionCount, 1), 20); // Between 1 and 20 questions

    console.log(`🔄 Generating ${numQuestions} questions for ${detectedRole} role...`);

    for (let i = 0; i < numQuestions; i++) {
      const currentIndex = questionIndex + i;
      
      // Determine stage based on role and question index
      const stage = getStageForQuestion(detectedRole, currentIndex);
      console.log(`   Q${currentIndex}: ${stage}`);
      
      // Get question pool for this stage
      let pool = STAGE_QUESTIONS[stage] || [];

      // Safety check
      if (!pool || pool.length === 0) {
        console.warn(`⚠️ No questions in pool for stage ${stage}, using warmup instead`);
        pool = STAGE_QUESTIONS[STAGES.WARMUP] || [];
        if (pool.length === 0) {
          console.error('❌ Even warmup questions are missing!');
          continue;
        }
      }

      // Filter out already asked questions (interview memory)
      const availablePool = pool.filter(q => {
        const qText = typeof q === 'string' ? q : q.question;
        return !sessionMemory.askedQuestions.includes(qText);
      });

      const finalPool = availablePool.length > 0 ? availablePool : pool;

      // Use adaptive difficulty selection
      const rawQuestion = selectQuestionByDifficulty(finalPool, 2, resumeAnalysis.experienceLevel);
      if (!rawQuestion) {
        console.warn(`⚠️ No question available for ${stage}`);
        continue;
      }

      const question = shorten(rawQuestion.question || rawQuestion);

      // Use context for all questions except warmup
      const useContext = stage !== STAGES.WARMUP;

      const prompt = `
You are an interview coach preparing a candidate.

${resumeAnalysis.totalSkills > 0 ? `Candidate has ${resumeAnalysis.totalSkills} skills including: ${resumeAnalysis.skills.all.slice(0, 5).join(', ')}` : ''}
${resumeAnalysis.experienceLevel ? `Experience Level: ${resumeAnalysis.experienceLevel}` : ''}

Give:
1. One-line direction (coaching tip)
2. A short, professional sample answer (3–4 sentences max)

${useContext ? `Resume: ${resumeText.slice(0,500)}` : ''}
${useContext ? `Job: ${jobDescription.slice(0,300)}` : ''}
${useContext ? `Interview Stage: ${stage}` : ''}

QUESTION: "${question}"

Respond ONLY in JSON:
{"direction":"","answer":""}
`;

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const out = await model.generateContent(prompt);
        
        if (!out || !out.response) {
          console.warn(`⚠️ Empty response for question ${i + 1}, using defaults`);
          qaPairs.push({
            question,
            direction: 'Answer clearly and concisely',
            answer: 'Provide a brief, structured response.',
            stage
          });
          continue;
        }

        const responseText = out.response.text();
        const cleaned = cleanJson(responseText);
        const parsed = JSON.parse(cleaned);

        qaPairs.push({
          question,
          direction: parsed.direction || 'Answer clearly and concisely',
          answer: parsed.answer || 'Provide a brief, structured response.',
          stage
        });

      } catch (err) {
        console.warn(`⚠️ Error generating answer for question ${i + 1}:`, err.message);
        qaPairs.push({
          question,
          direction: 'Answer clearly and concisely',
          answer: 'Provide a brief, structured response.',
          stage
        });
      }
    }

    console.log(`✅ Successfully generated ${qaPairs.length} questions`);

    // Update session memory with newly asked questions
    const updatedMemory = {
      askedQuestions: [...sessionMemory.askedQuestions, ...qaPairs.map(q => q.question)],
      weakTopics: sessionMemory.weakTopics || [],
      strongTopics: sessionMemory.strongTopics || []
    };

    res.json({
      qaPairs,
      sessionId: crypto.randomUUID(),
      totalQuestions: qaPairs.length,
      detectedRole,
      sequence: ROLE_SEQUENCES[detectedRole] || ROLE_SEQUENCES.default,
      resumeAnalysis: {
        skills: resumeAnalysis.skills.all,
        experienceLevel: resumeAnalysis.experienceLevel,
        totalSkills: resumeAnalysis.totalSkills
      },
      sessionMemory: updatedMemory
    });

  } catch (e) {
    console.error('❌ API Error:', {
      message: e.message,
      stack: e.stack,
      name: e.name
    });
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

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

/* ---------------- START ---------------- */

app.listen(PORT, () => {
  console.log(`✅ MockMate running on http://localhost:${PORT}`);
});
