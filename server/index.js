require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.post('/api/generate-questions', upload.single('resume'), async (req, res) => {
  try {
    const { jobDescription, difficulty } = req.body;
    const resumeFile = req.file;

    if (!resumeFile || !jobDescription) {
      return res.status(400).json({ error: "Resume and Job Description are required." });
    }

    console.log("1. Processing PDF...");
    const pdfData = await pdf(resumeFile.buffer);
    const resumeText = pdfData.text;

    console.log("2. Sending to Gemini...");
    const prompt = `
      Act as a strict technical interviewer. 
      RESUME: ${resumeText.slice(0, 3000)}
      JOB DESC: ${jobDescription}
      
      Generate 5 ${difficulty} interview questions.
      RETURN JSON ARRAY OF STRINGS ONLY.
      Example: ["Question 1", "Question 2"]
      Do NOT use Markdown. Do NOT add "json" or backticks.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    console.log("3. Raw AI Response:", rawText); // Log this to see what Gemini sent!

    // CLEANING FUNCTION: Removes markdown ```json and ``` and extra whitespace
    let cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Find the start of the array '[' and end of the array ']'
    const startIndex = cleanText.indexOf('[');
    const endIndex = cleanText.lastIndexOf(']');
    
    if (startIndex !== -1 && endIndex !== -1) {
      cleanText = cleanText.substring(startIndex, endIndex + 1);
    }

    const questions = JSON.parse(cleanText);
    console.log("4. Questions Parsed Successfully");

    res.json({ questions });

  } catch (error) {
    console.error("SERVER ERROR:", error); // This will show in your terminal
    res.status(500).json({ error: "Server Error: " + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});