require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
// pdf-parse v2+ no longer exports a callable function (v1 style).
// It exports the PDFParse class.
// Ref: node_modules/pdf-parse/README.md ("Getting Started with v2")
const { PDFParse } = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- CONFIGURATION CHECK ---
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY is missing in .env file!");
  process.exit(1);
}

// Initialize Upload & AI
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Model name must exist for your API key/project. You can see available models via:
// https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY
// Defaulting to a current stable model.
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Use different generation configs for different tasks.
// - QA generation: higher temperature for variety across "Generate New Set"
// - Evaluation: low temperature for consistency
const qaModel = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.9,
    topP: 0.95,
    // Keep outputs reasonably sized to reduce JSON truncation
    maxOutputTokens: 4096,
  },
});

const evalModel = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.2,
    topP: 0.9,
    maxOutputTokens: 1024,
  },
});

console.log(`🤖 Using Gemini model: ${MODEL_NAME}`);


// --- ROUTES ---

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function pickKeywords({ resumeText, jobDescription, max = 6 }) {
  const text = `${resumeText || ''}\n${jobDescription || ''}`.toLowerCase();
  const KEYWORDS = [
    'javascript', 'typescript', 'react', 'next.js', 'node', 'express', 'mongodb', 'sql', 'postgres',
    'python', 'java', 'c++', 'html', 'css', 'tailwind', 'redux', 'api', 'rest', 'graphql',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'git', 'ci/cd', 'jest', 'testing',
    'data structures', 'algorithms', 'system design', 'microservices', 'redis', 'linux'
  ];

  const scored = KEYWORDS
    .map((k) => ({ k, score: text.includes(k) ? (text.split(k).length - 1) : 0 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.k);

  // Light normalization
  return uniq(scored).slice(0, max);
}

function extractResumeHighlights(resumeText, max = 6) {
  const lines = (resumeText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates = [];
  for (const l of lines) {
    if (
      l.length < 18 ||
      l.length > 140
    ) continue;
    if (/^(•|-|\*|\u2022)\s+/.test(l) || /(project|intern|experience|achievement|built|developed|designed|implemented)/i.test(l)) {
      candidates.push(l.replace(/^(•|-|\*|\u2022)\s+/, ''));
    }
  }
  return uniq(candidates).slice(0, max);
}

function generateFallbackQAPairs({ resumeText, jobDescription, excludeQuestions, count }) {
  const avoid = new Set((excludeQuestions || []).map((q) => (q || '').toLowerCase()));
  const keywords = pickKeywords({ resumeText, jobDescription, max: 6 });
  const highlights = extractResumeHighlights(resumeText, 6);

  const kw1 = keywords[0] || 'your core stack';
  const kw2 = keywords[1] || 'APIs';
  const kw3 = keywords[2] || 'databases';
  const roleHint = (jobDescription || '').trim().slice(0, 120);

  const templates = [
    {
      q: `Pick one project from your resume and walk me through the architecture end-to-end. Where did you use ${kw1}, and what were the main tradeoffs you made?`,
      a: `I would give a 60-second overview (problem, users, outcome), then break it down into: frontend, backend/API, data layer, and deployment. I'd explain why ${kw1} was chosen, key tradeoffs (speed vs. maintainability, build vs. buy), and one measurable result (latency, adoption, reliability).`,
    },
    {
      q: `Describe a difficult bug you faced while working with ${kw2}. How did you reproduce it, isolate the root cause, and prevent regressions?`,
      a: `I would describe the symptom, how I reproduced it with logs/requests, how I narrowed it down (network tab, server logs, tracing), and the final fix. To prevent regressions, I'd add a test, monitoring/alerts, and a short postmortem note about the contributing factors.`,
    },
    {
      q: `Based on the role requirements (${roleHint || 'the job description'}), which 2-3 skills from your resume are the strongest match, and what evidence supports that?`,
      a: `I would map the role requirements to specific resume evidence: project/internship work, tools used, and outcomes. I'd keep it concrete (what I built, what I shipped, what improved) and close with how I'd apply the same skills in this role.`,
    },
    {
      q: `Tell me about a time you had to deliver under tight constraints (time, ambiguous requirements, missing data). What did you do and what was the outcome?`,
      a: `I'd answer using STAR: Situation/Task, then Actions (prioritization, small milestones, communication), and Results (what shipped, what changed, what I learned). I'd include one example of risk management and how I aligned with stakeholders.`,
    },
    {
      q: `If you were asked to improve performance or reliability in a system using ${kw3}, what would you measure first and what changes would you consider?`,
      a: `I'd start with baselines: latency percentiles, error rates, throughput, and DB query time. Then I'd consider indexing/query optimization, caching, batching, pagination, and reducing payload sizes. I'd validate each change with measurements and roll out safely with monitoring.`,
    },
  ];

  // Try to sprinkle in actual resume highlights if available.
  if (highlights[0]) {
    templates[0].q = `In your resume you mention: '${highlights[0]}'. Can you explain the technical decisions behind it and what you'd improve if you rebuilt it today?`;
  }
  if (highlights[1]) {
    templates[1].q = `In your resume you mention: '${highlights[1]}'. What was the hardest technical challenge there, and how did you validate your solution?`;
  }

  const out = [];
  for (const t of templates) {
    if (out.length >= count) break;
    if (avoid.has(t.q.toLowerCase())) continue;
    out.push({ question: t.q, answer: t.a });
  }

  // If count > templates length, pad with safe variations.
  while (out.length < count) {
    const idx = out.length + 1;
    const q = `From your resume, what is one technical decision you are most proud of, and what tradeoffs did you accept? (Follow-up ${idx})`;
    if (!avoid.has(q.toLowerCase())) out.push({ question: q, answer: `I'd pick a real example, explain options, constraints, and why I chose the final approach. I'd quantify the impact and mention what I'd do differently now.` });
  }

  return out.slice(0, count);
}

async function extractTextFromPdfBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    return await parser.getText();
  } finally {
    // Always free resources (important for memory usage)
    await parser.destroy();
  }
}

// 1. Parse Resume (Debug Version)
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  console.log("📂 Request received at /api/parse-resume");
  
  try {
    if (!req.file) {
      console.error("❌ No file attached");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📄 PDF Buffer Size:", req.file.size);

    // Attempt parsing
    const pdfData = await extractTextFromPdfBuffer(req.file.buffer);
    
    if (!pdfData || !pdfData.text) {
        throw new Error("PDF parsed but returned no text.");
    }

    // Keep more resume context so the generator can pull from more bullet points.
    // (Still bounded to avoid huge prompts.)
    const cleanText = pdfData.text.trim().slice(0, 15000);
    console.log("✅ Parsing complete. Text length:", cleanText.length);
    
    res.json({ text: cleanText });

  } catch (error) {
    console.error("🔥 PDF ERROR:", error.message);
    res.status(500).json({ error: "Server failed to read PDF. Try a simpler PDF file." });
  }
});


// 2. Guided Mode: Generate Questions & Answers
app.post('/api/generate-qa', async (req, res) => {
  try {
    const { resumeText, jobDescription, excludeQuestions, nonce, count } = req.body;

    console.log("🧠 Generating Study Questions...");

    const safeResume = (resumeText || "").toString();
    const safeJD = (jobDescription || "").toString();
    const avoid = Array.isArray(excludeQuestions) ? excludeQuestions : [];
    const setNonce = (nonce || Date.now()).toString();
    const requestedCount = Number.isFinite(Number(count)) ? Number(count) : 5;
    const outCount = Math.min(30, Math.max(1, requestedCount));

    // Prompt goals:
    // 1) Avoid repeating the same questions across "Generate New Set" clicks
    // 2) Force grounding in resume evidence (projects/skills/metrics)
    // 3) Keep questions valuable and role-relevant
    const prompt = `
You are MockMate, an expert interview coach.

GOAL
- Generate a NEW set of interview questions each time.
- Questions must be grounded in the candidate's resume AND relevant to the job description.

VARIATION SEED
- Use this nonce to vary the selection and wording while staying relevant: ${setNonce}

HARD CONSTRAINTS
1) Output EXACTLY ${outCount} items.
2) Each question must focus on a DIFFERENT resume evidence point (project, internship, achievement, skill, certification). Do not reuse the same resume bullet for two questions.
3) Do NOT repeat or closely paraphrase any question from the AVOID LIST.
4) Avoid generic questions like "Tell me about yourself".
5) Mix of question types (in any order):
   - 2 deep technical questions (implementation details, tradeoffs, debugging)
   - 1 role-specific question derived from the job description requirements
   - 1 behavioral STAR question anchored to a real resume scenario
   - 1 scenario/what-would-you-do question that tests judgement

QUALITY RULES
- Each question should reference a specific detail from the resume (project name, tool/stack, metric, domain) so it's genuinely personalized.
- Answers should be concise but "interview-ready" (bullet-like paragraphs), and should not invent experience not present in the resume. If info is missing, phrase answers as "If asked, I would..." or "I would highlight...".
- IMPORTANT: Do not include any raw double-quote characters (") inside question/answer text. If you need to quote something, use single quotes.

AVOID LIST (do not repeat or paraphrase)
${JSON.stringify(avoid).slice(0, 6000)}

RESUME (source of evidence)
${safeResume.slice(0, 10000)}

JOB DESCRIPTION
${safeJD.slice(0, 2500)}

OUTPUT FORMAT
- Return ONLY a valid JSON array. No Markdown. No extra keys.
- Each array item schema: {"question": "...", "answer": "..."}
`.trim();

    const result = await qaModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Clean JSON bounds
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) text = text.substring(start, end + 1);

    let qaPairs;
    try {
      qaPairs = JSON.parse(text);
    } catch (e) {
      // Provide more actionable server logs while returning a clean error to the client.
      console.error("❌ JSON Parse Error:", e.message);
      console.error("❌ Model raw output (trimmed):", text.slice(0, 1200));
      return res.status(502).json({
        error: "AI returned invalid JSON. Please try again.",
      });
    }
    console.log(`✅ Generated ${qaPairs.length} Q&A pairs.`);
    res.json({ qaPairs });

  } catch (error) {
    const msg = error?.message || "Unknown error";
    console.error("❌ Generation Error:", msg);

    // If Gemini is rate-limited/quota-limited, fall back to a local (non-AI) generator
    // so the app remains usable.
    if (msg.includes("429") || msg.toLowerCase().includes("too many requests") || msg.toLowerCase().includes("quota")) {
      const safeResume = (req.body?.resumeText || "").toString();
      const safeJD = (req.body?.jobDescription || "").toString();
      const avoid = Array.isArray(req.body?.excludeQuestions) ? req.body.excludeQuestions : [];
      const requestedCount = Number.isFinite(Number(req.body?.count)) ? Number(req.body.count) : 5;
      const outCount = Math.min(30, Math.max(1, requestedCount));

      const qaPairs = generateFallbackQAPairs({
        resumeText: safeResume,
        jobDescription: safeJD,
        excludeQuestions: avoid,
        count: outCount,
      });

      return res.status(200).json({
        qaPairs,
        source: "fallback",
        warning: "Gemini quota/rate-limit reached; served locally-generated questions.",
      });
    }

    res.status(500).json({ error: "AI Generation failed" });
  }
});


// 3. Test Mode: Evaluate Answer
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { question, userAnswer, resumeText, jobDescription } = req.body;

    console.log("🧠 Evaluating Answer...");

    const prompt = `
      Act as a strict interviewer.
      CONTEXT:
      - Role: ${jobDescription.slice(0, 200)}...
      - Question: "${question}"
      - Candidate Answer: "${userAnswer}"

      TASK: Evaluate the answer.
      1. Is it relevant to the question?
      2. Does it show confidence?
      3. Is it technically/behaviorally sound?

      OUTPUT JSON ONLY:
      {
        "rating": "Green" | "Yellow" | "Red",
        "score": number (0-100),
        "feedback": "Short feedback summary",
        "improvement_tip": "One actionable tip"
      }
      Do NOT use Markdown.
    `;

    const result = await evalModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) text = text.substring(start, end + 1);

    const evaluation = JSON.parse(text);
    console.log(`✅ Evaluation Complete: ${evaluation.rating} (${evaluation.score}/100)`);
    res.json(evaluation);

  } catch (error) {
    console.error("❌ Evaluation Error:", error.message);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
