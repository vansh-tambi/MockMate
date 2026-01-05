# 🖥️ MockMate Server

> Backend API for AI-Powered Interview Preparation

This is the Express.js backend server for MockMate, handling resume parsing, AI-powered question generation, and answer evaluation using Google's Gemini AI.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file**
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=5000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

The server will start on `http://localhost:5000`

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",  // Google Gemini AI SDK
    "cors": "^2.8.5",                     // Cross-origin resource sharing
    "dotenv": "^17.2.3",                  // Environment variables
    "express": "^5.1.0",                  // Web framework
    "multer": "^2.0.2",                   // File upload handling
    "pdf-parse": "^2.4.5"                 // PDF text extraction
  },
  "devDependencies": {
    "nodemon": "^3.1.11"                  // Auto-restart on changes
  }
}
```

---

## 🔧 API Endpoints

### 1. Parse Resume

**Endpoint:** `POST /api/parse-resume`

**Description:** Parses uploaded PDF resume and extracts text content.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: File field named `resume` (PDF format)

**Response:**
```json
{
  "text": "Extracted resume text content..."
}
```

**Example using cURL:**
```bash
curl -X POST http://localhost:5000/api/parse-resume \
  -F "resume=@/path/to/resume.pdf"
```

**Error Responses:**
- `400 Bad Request` - No file uploaded
- `500 Internal Server Error` - PDF parsing failed

---

### 2. Generate Q&A

**Endpoint:** `POST /api/generate-qa`

**Description:** Generates personalized interview questions based on resume and job description using Google Gemini AI.

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body:
```json
{
  "resumeText": "string (user's resume content)",
  "jobDescription": "string (target job role/description)",
  "questionCount": "number (current number of questions, optional)"
}
```

**Response:**
```json
{
  "qaPairs": [
    {
      "question": "Tell me about your experience with React?",
      "direction": "Expected answer direction and key points to cover",
      "answer": "Comprehensive sample answer with best practices"
    },
    // ... more question objects (typically 10 questions)
  ]
}
```

**Example using cURL:**
```bash
curl -X POST http://localhost:5000/api/generate-qa \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "Software Engineer with 3 years of experience...",
    "jobDescription": "Senior Frontend Developer",
    "questionCount": 0
  }'
```

**Processing Details:**
- Timeout: 60 seconds
- Fallback models: Gemini 1.5 Flash → Gemini 1.5 Pro → Gemini 2.0 Flash
- Returns 10 personalized questions
- Includes randomization from question bank for variety

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - AI generation failed
- `504 Gateway Timeout` - Request took longer than 60 seconds

---

### 3. Evaluate Answer

**Endpoint:** `POST /api/evaluate`

**Description:** Evaluates user's answer against the interview question using AI and provides detailed feedback.

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body:
```json
{
  "question": "string (the interview question)",
  "userAnswer": "string (user's spoken/written answer)"
}
```

**Response:**
```json
{
  "strengths": [
    "Strong technical explanation",
    "Good use of real-world examples",
    "Clear communication"
  ],
  "improvements": [
    "Could elaborate more on implementation details",
    "Consider discussing trade-offs"
  ],
  "score": 8.5,
  "feedback": "Overall strong answer demonstrating solid understanding..."
}
```

**Example using cURL:**
```bash
curl -X POST http://localhost:5000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain React hooks and their benefits",
    "userAnswer": "React hooks allow functional components to use state..."
  }'
```

**Processing Details:**
- Timeout: 60 seconds
- Uses multiple AI models for reliability
- Provides constructive feedback
- Score range: 0-10

**Error Responses:**
- `400 Bad Request` - Missing question or userAnswer
- `500 Internal Server Error` - AI evaluation failed

---

## 🧠 AI Model Configuration

The server uses Google's Gemini AI with intelligent fallback mechanisms:

### Model Priority
1. **Gemini 1.5 Flash** - Fast, efficient responses
2. **Gemini 1.5 Pro** - Enhanced reasoning (fallback)
3. **Gemini 2.0 Flash** - Latest model (secondary fallback)

### Features
- **Automatic Fallback:** If one model fails, automatically tries the next
- **Timeout Protection:** 60-second timeout prevents hanging requests
- **JSON Cleaning:** Robust parsing of AI responses
- **Error Handling:** Comprehensive error messages and logging

---

## 📁 File Structure

```
server/
├── index.js                    # Main server file
│   ├── Express app configuration
│   ├── Multer file upload setup
│   ├── Gemini AI initialization
│   ├── API route handlers
│   └── Error handling
│
├── CLEANED_QUESTIONS.txt       # Question bank for randomization
├── package.json                # Dependencies and scripts
├── .env                        # Environment variables (create this)
└── README.md                   # This file
```

---

## 🔒 Environment Variables

Create a `.env` file in the server directory:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
PORT=5000
NODE_ENV=development
```

### Getting Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

---

## 🛠️ Development

### Start Development Server
```bash
npm start
```

This uses `nodemon` to automatically restart the server when files change.

### Testing Endpoints

Use tools like:
- **Postman** - GUI for API testing
- **cURL** - Command-line HTTP client
- **Thunder Client** - VS Code extension
- **Insomnia** - API testing tool

---

## 📊 Server Logging

The server provides detailed console logging:

```
🚀 Initializing MockMate Server...
📝 Loading dependencies...
✅ Dependencies loaded successfully
🌐 Server running on port 5000

🔍 POST /api/generate-qa
  🤖 Trying model: gemini-1.5-flash
  ✅ Model gemini-1.5-flash succeeded (2456 chars)
  📊 Generated 10 questions

📝 POST /api/evaluate
  🤖 Trying model: gemini-1.5-flash
  ✅ Evaluation completed
```

---

## 🚨 Error Handling

### Common Errors and Solutions

**Error:** `❌ ERROR: GEMINI_API_KEY not found in .env file`
- **Solution:** Create `.env` file with valid API key

**Error:** `All models failed to generate content`
- **Solution:** Check API key validity and internet connection

**Error:** `PDF parsing failed`
- **Solution:** Ensure uploaded file is a valid PDF

**Error:** `Request timed out`
- **Solution:** Check network connection or increase timeout value

---

## 🔐 Security Considerations

- **CORS:** Enabled for all origins (configure for production)
- **File Upload:** Limited to memory storage (no disk persistence)
- **API Key:** Never commit `.env` file to version control
- **Input Validation:** Basic validation implemented
- **Error Messages:** Generic messages to avoid exposing internals

### Production Recommendations
- Set specific CORS origins
- Add rate limiting
- Implement request size limits
- Add authentication/authorization
- Use HTTPS
- Add input sanitization
- Implement logging service

---

## 📈 Performance

- **Concurrent Requests:** Supported via Node.js async/await
- **Response Time:** 
  - Resume parsing: ~1-3 seconds
  - Question generation: ~15-45 seconds (AI processing)
  - Answer evaluation: ~10-30 seconds (AI processing)
- **Memory Usage:** Efficient with in-memory file handling

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Server starts without errors
- [ ] `/api/parse-resume` successfully extracts PDF text
- [ ] `/api/generate-qa` returns 10 questions
- [ ] `/api/evaluate` provides structured feedback
- [ ] Error handling works for invalid inputs
- [ ] CORS allows client connections

### Future: Automated Testing

```bash
# Coming soon
npm test
```

---

## 🤝 Contributing

When contributing to the server:

1. Follow existing code style
2. Add JSDoc comments for new functions
3. Test all endpoints manually
4. Update this README for new endpoints
5. Ensure error handling is comprehensive

---

## 📝 License

This project is open source and available under the [MIT License](../LICENSE).

---

## 🔗 Related Documentation

- [Main Project README](../README.md)
- [Client Documentation](../client/README.md)
- [Google Gemini AI Documentation](https://ai.google.dev/docs)

---

**Part of MockMate - AI-Powered Interview Preparation Platform**

Made with ❤️ by Vansh Tambi
