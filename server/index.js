require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 1. ROBUST PDF LIBRARY SETUP ---
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.warn("⚠️ Warning: 'pdf-parse' library not found or failed to load.");
}

const app = express();
const PORT = process.env.PORT || 5000;

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 3. CONFIGURATION CHECK ---
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY is missing in .env file!");
  process.exit(1);
}

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Initialize model with working model name ---
// Try multiple models in order of preference
let model = null;
const availableModels = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b'
];

// Set initial model (will be validated on first request if needed)
model = genAI.getGenerativeModel({ model: availableModels[0] });

// --- 4. HELPER: Try multiple models with fallback ---
const tryGenerateContent = async (prompt) => {
  for (const modelName of availableModels) {
    try {
      const testModel = genAI.getGenerativeModel({ model: modelName });
      const result = await testModel.generateContent(prompt);
      const text = result.response.text();
      if (text) {
        console.log(`✅ Success with model: ${modelName}`);
        model = testModel; // Update for future use
        return result;
      }
    } catch (err) {
      console.log(`⚠️ Model ${modelName} failed: ${err.message.split('\n')[0]}`);
      continue;
    }
  }
  throw new Error('All model attempts failed');
};

// --- 5. HELPER: CLEAN JSON ---
const cleanJson = (text) => {
  if (!text) return "";
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const arrayStart = clean.indexOf('[');
  const arrayEnd = clean.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1) {
    return clean.substring(arrayStart, arrayEnd + 1);
  }
  const objStart = clean.indexOf('{');
  const objEnd = clean.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1) {
    return clean.substring(objStart, objEnd + 1);
  }
  return clean;
};

// --- 6. HELPER: Shuffle for variety ---
const shuffleArray = (arr = []) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// --- ROUTES ---

// ROUTE 1: Parse Resume
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  console.log("📂 Request received at /api/parse-resume");
  
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let extractedText = "";
    if (pdfParse) {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text;
        console.log("✅ PDF Parsed Successfully.");
      } catch (err) {
        console.error("⚠️ Library Parse Failed:", err.message);
      }
    }

    if (!extractedText || extractedText.length < 50) {
      console.log("⚠️ Using Fallback Resume Text");
      extractedText = `
        [RESUME EXTRACT FAILED]
        Candidate Name: User
        Skills: React, Node.js, JavaScript.
      `;
    }

    const finalCleanText = extractedText.trim().slice(0, 6000);
    res.json({ text: finalCleanText });

  } catch (error) {
    console.error("🔥 CRITICAL ERROR:", error.message);
    res.status(500).json({ error: "Server failed to process resume." });
  }
});

// ROUTE 2: Generate Questions
app.post('/api/generate-qa', async (req, res) => {
  try {
    const resumeText = req.body.resumeText || "";
    const jobDescription = req.body.jobDescription || "";

    console.log("🧠 Generating Questions...");

    if (!resumeText && !jobDescription) {
      return res.json({ qaPairs: [] });
    }

    // Pick varied themes to avoid repetitive patterns
    const themes = shuffleArray([
      'algorithms & data structures',
      'system design / architecture',
      'debugging & troubleshooting',
      'testing & quality',
      'performance & optimization',
      'security & reliability',
      'communication & collaboration',
      'product/feature thinking',
      'tooling & productivity',
      'role-specific domain knowledge'
    ]);

    const focusAreas = themes.slice(0, 5);
    const nonce = Date.now(); // ensure responses differ even for same input

    const prompt = `
      Act as a technical interview coach.
      RESUME: ${resumeText.slice(0, 2000)}
      JOB: ${jobDescription.slice(0, 500)}

      Generate 5 DISTINCT interview questions (no overlapping themes) with concise answers (max 2 sentences).
      Cover these focus areas (one per question, any order): ${focusAreas.join(', ')}.
      Vary phrasing and difficulty. Avoid reusing wording from earlier questions.
      Add subtle randomness keyed by ${nonce} to avoid deterministic outputs.

      RETURN RAW JSON ARRAY ONLY. NO MARKDOWN.
      Example: [{"question":"...","answer":"..."}]
    `;

    const result = await tryGenerateContent(prompt);
    const rawText = result.response.text();
    const jsonString = cleanJson(rawText);
    
    let qaPairs = [];
    try {
      qaPairs = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("❌ JSON Parse Failed. Raw:", rawText);
      qaPairs = [{ question: "Could not generate questions.", answer: "Try again." }];
    }

    // Shuffle final output to further reduce repeated ordering patterns
    qaPairs = shuffleArray(qaPairs);

    console.log(`✅ Returned ${qaPairs.length} questions.`);
    res.json({ qaPairs });

  } catch (err) {
    console.error("❌ API Error:", err.message);
    res.status(500).json({ error: "Generation failed. Check API key and quota." });
  }
});

// ROUTE 3: Evaluate Answer
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { question, userAnswer, jobDescription } = req.body;
    console.log("🧠 Evaluating Answer...");

    const prompt = `
      Evaluate interview answer.
      Role: ${jobDescription ? jobDescription.slice(0, 300) : "Engineer"}
      Question: "${question}"
      Answer: "${userAnswer}"

      OUTPUT RAW JSON ONLY. NO MARKDOWN.
      {
        "rating": "Green" | "Yellow" | "Red",
        "score": 0-100,
        "feedback": "Max 2 sentences",
        "improvement_tip": "One tip"
      }
    `;

    const result = await tryGenerateContent(prompt);
    const rawText = result.response.text();
    const jsonString = cleanJson(rawText);
    
    let evaluation = {};
    try {
      evaluation = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("❌ JSON Parse Failed for Evaluation");
      evaluation = { rating: "Yellow", score: 50, feedback: "Error analyzing.", improvement_tip: "Try again." };
    }

    console.log(`✅ Evaluation: ${evaluation.score}/100`);
    res.json(evaluation);

  } catch (err) {
    console.error("❌ API Error:", err.message);
    res.status(500).json({ error: "Evaluation failed. Check API key." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});