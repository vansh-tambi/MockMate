require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const upload = multer({ storage: multer.memoryStorage() });

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY missing');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ---------------- CONSTANTS ---------------- */

const BASIC_LIMIT = 9;

const STAGE = {
  WARMUP: 0,
  EXPERIENCE: 1,
  ROLE: 2,
  DEEP: 3
};

/* ---------------- DATA LOADING ---------------- */

const DATA_DIR = path.join(__dirname, '..', 'ai_service', 'data');
const load = (f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
  } catch {
    return [];
  }
};

const DATASETS = {
  warmup: [
    ...load('warmup_questions.json'),
    ...load('introductory_icebreaker.json'),
    ...load('hr_basic_questions.json')
  ],
  experience: [
    ...load('behavioral_questions.json')
  ],
  role: [
    ...load('career_questions.json'),
    ...load('company_role_fit.json')
  ],
  deep: [
    ...load('problem_solving.json'),
    ...load('situational_questions.json')
  ]
};

/* ---------------- HELPERS ---------------- */

const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const shorten = (q) => {
  // Absolute safety net for runaway questions
  if (q.length > 140) {
    return `${q.split('?')[0]}?`;
  }
  return q;
};

const getStageByIndex = (i) => {
  if (i <= BASIC_LIMIT) return STAGE.WARMUP;
  if (i <= 15) return STAGE.EXPERIENCE;
  if (i <= 20) return STAGE.ROLE;
  return STAGE.DEEP;
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

/* ---------------- ROUTES ---------------- */

app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  res.json({ text: 'Resume parsed' });
});

app.post('/api/generate-qa', async (req, res) => {
  try {
    const {
      resumeText = '',
      jobDescription = '',
      questionIndex = 1
    } = req.body;

    const stage = getStageByIndex(questionIndex);
    let pool;

    if (stage === STAGE.WARMUP) pool = DATASETS.warmup;
    else if (stage === STAGE.EXPERIENCE) pool = DATASETS.experience;
    else if (stage === STAGE.ROLE) pool = DATASETS.role;
    else pool = DATASETS.deep;

    const rawQuestion = randomPick(pool);
    const question = shorten(rawQuestion.question || rawQuestion);

    const useContext = questionIndex > BASIC_LIMIT;

    const prompt = `
You are an interview coach.

Give:
1. One-line direction
2. A short, professional sample answer (3–4 sentences max)

${useContext ? `Resume: ${resumeText.slice(0,500)}` : ''}
${useContext ? `Job: ${jobDescription.slice(0,300)}` : ''}

QUESTION: "${question}"

Respond ONLY in JSON:
{"direction":"","answer":""}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const out = await model.generateContent(prompt);
    const parsed = JSON.parse(cleanJson(out.response.text()));

    res.json({
      qaPairs: [{
        question,
        direction: parsed.direction || 'Answer clearly and concisely',
        answer: parsed.answer || 'Provide a brief, structured response.'
      }],
      sessionId: crypto.randomUUID(),
      totalQuestions: 1
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- START ---------------- */

app.listen(PORT, () => {
  console.log(`✅ MockMate running on http://localhost:${PORT}`);
});
