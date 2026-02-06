# 🎯 MockMate

> **AI-Powered Interview Preparation Platform**

Production-grade interview simulator with intelligent question progression, auto skill extraction, and adaptive difficulty. Simulates real technical interviews used by top companies.

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![Node.js Express](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)](https://expressjs.com)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.0--Flash-4285F4?style=flat&logo=google)](https://ai.google.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Production Ready](https://img.shields.io/badge/Status-Production--Ready-brightgreen?style=flat)](https://mock-mate-ai-interview.vercel.app)

**[🚀 Live Demo](https://mock-mate-ai-interview.vercel.app)** | **[📖 Case Study](CASE_STUDY.md)** | **[⭐ Features](ELITE_FEATURES_COMPLETE.md)** | **[💼 Portfolio](PORTFOLIO_DESCRIPTIONS.md)**

---

## ✨ What Makes MockMate Different

### The Problem
Traditional interview prep platforms:
- ❌ Random question selection (breaks interview flow)
- ❌ Same questions for all roles
- ❌ Generic scoring without actionable feedback
- ❌ No progression tracking
- ❌ Can't detect your actual skills

### The Solution
MockMate provides enterprise-grade interview simulation:
- ✅ **7-Stage Progressive Flow** - Introduction → Warmup → Resume → Technical → Behavioral → Real-World → Closing
- ✅ **Auto Resume Parsing** - Detects React, Node.js, AWS, etc. automatically
- ✅ **Role-Specific Sequences** - Frontend, Backend, SDE, Product roles
- ✅ **No Duplicate Questions** - Smart session tracking prevents repeats
- ✅ **Adaptive Difficulty** - Fresher, Mid-level, Senior progression
- ✅ **AI-Powered Scoring** - Gemini-based evaluation with detailed feedback
- ✅ **672+ Interview Questions** - Technical, behavioral, system design

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Modern web browser

### Local Development (3 minutes)

```bash
# 1. Clone repository
git clone https://github.com/vansh-tambi/MockMate.git
cd MockMate

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Setup environment variables
# server/.env
GEMINI_API_KEY=your_api_key_here
PORT=5000

# client/.env.production
VITE_API_BASE=http://localhost:5000

# 4. Start servers
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev

# 5. Open browser
# http://localhost:5173
```

---

## 🏗️ System Architecture

### Interview Flow (7 Stages - 25 Questions)

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: INTRODUCTION (2 Qs)                               │
│ "Tell me about yourself", "Why this role?"                 │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: WARMUP (2 Qs)                                     │
│ Easy warm-up questions to build confidence                 │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: RESUME BASED (3 Qs)                               │
│ Deep-dive into your experience and projects                │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: TECHNICAL (10 Qs)                                 │
│ DSA, system design, role-specific technical questions      │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 5: BEHAVIORAL (5 Qs)                                 │
│ Teamwork, conflict resolution, motivation                  │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 6: REAL-WORLD (2 Qs)                                 │
│ Edge cases, production scenarios                           │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 7: HR CLOSING (1 Q)                                  │
│ "Why should we hire you?", "Questions for us?"             │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Purpose |
|-----------|---------|
| **Frontend** (React + Vite) | SPA with guided and test modes, AI feedback |
| **Backend** (Node.js + Express) | REST API, question selection, Gemini integration |
| **AI Service** (Gemini 2.0) | Resume parsing, answer evaluation, feedback generation |
| **Question Database** | 672 questions across 58 JSON files |

### Data Flow

```
Resume Upload → Parse + Skill Detection ↓
User Input (Role, Level) → Question Selection Engine ↓
Gemini AI → Generate Context-Aware Questions ↓
User Answer → Evaluation + Scoring Feedback ↓
Session Storage → Track Progress + Prevent Repeats
```

---

## 🔌 API Endpoints

### Resume Parsing
```
POST /api/parse-resume
Content-Type: multipart/form-data
Body: resume (PDF file)

Response: { skills, experience, education, level }
```

### Question Generation
```
POST /api/generate-qa
Body: {
  resumeText: string,
  jobDescription: string,
  questionIndex: number,
  askedQuestions: string[],
  role: string,    // "frontend", "backend", "any"
  level: string    // "fresher", "mid", "senior"
}

Response: {
  success: boolean,
  stage: string,
  question: { id, text, index, stage },
  guidance: { direction, answer, tips },
  stageProgress: { current, total, percent }
}
```

### Question Evaluation
```
POST /api/evaluate-answer
Body: {
  question: string,
  userAnswer: string,
  idealAnswer: string,
  stage: string,
  experienceLevel: string
}

Response: {
  score: 0-100,
  feedback: string,
  improvements: string[],
  keywords: string[],
  band: "Poor" | "Basic" | "Good" | "Strong" | "Hire-Ready"
}
```

---

## 📁 Project Structure

```
MockMate/
├── client/                      # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── GuidedMode.jsx       # Staged interview flow
│   │   │   ├── TestMode.jsx         # Free-form practice
│   │   │   ├── SetupScreen.jsx      # Resume upload & role selection
│   │   │   └── Navbar.jsx           # Navigation
│   │   ├── App.jsx
│   │   └── index.css
│   ├── .env.production          # Prod config (Backend URL)
│   └── vite.config.js
│
├── server/                      # Node.js Backend (Express)
│   ├── index.js                     # Main server + API endpoints
│   ├── stageManager.js              # Stage progression logic
│   ├── stageConfig.js               # Stage definitions (7 stages, 25 Qs)
│   ├── questionLoader.js            # Load & track question usage
│   ├── InterviewEngine.js           # Interview orchestration
│   ├── QuestionSelector.js          # Smart question selection
│   ├── SessionManager.js            # Session persistence
│   ├── .env                         # Gemini API key
│   └── package.json
│
├── ai_service/                  # Python Flask (Optional)
│   ├── app.py                       # RAG service for skill detection
│   ├── data/                        # Question JSON files (58 files)
│   └── requirements.txt
│
└── README.md                    # This file
```

---

## 🔐 Environment Variables

### Server (.env)
```env
# Required in production
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
NODE_ENV=production
```

### Client (.env.production)
```env
VITE_API_BASE=https://mockmate-47x8.onrender.com
```

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
git push origin main
# Auto-deploys from GitHub

# Live: https://mock-mate-ai-interview.vercel.app
```

### Backend (Render)
```
Service: Node.js
Build Command: npm install
Start Command: npm start
Environment Variables:
  - GEMINI_API_KEY: [Your API key]
  - PORT: 5000
  - NODE_ENV: production

Live: https://mockmate-47x8.onrender.com
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TailwindCSS, Framer Motion |
| **Backend** | Node.js 22, Express 5, Multer, pdf-parse |
| **AI** | Google Gemini 2.0 Flash API |
| **Database** | File-based sessions (no DB required) |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 📊 Key Features

### 🎯 Intelligent Question Selection
- **Stage-based progression** - Questions follow realistic interview flow
- **Role awareness** - Different paths for Frontend, Backend, SDE roles
- **Difficulty adaptation** - Fresher → Mid → Senior progression
- **No repeats** - Session tracking prevents duplicate questions
- **Fair distribution** - Least-asked questions prioritized

### 🧠 AI-Powered
- **Resume parsing** - Auto-detect skills (React, Node, AWS, etc.)
- **Question generation** - Context-aware Q&A with Gemini 2.0
- **Answer evaluation** - Scoring with actionable feedback
- **Adaptive coaching** - Tips tailored to your level and role

### 📈 Progress Tracking
- **Session persistence** - Resume where you left off
- **Interview history** - Track all completed interviews
- **Statistics** - Strengths, weaknesses, score trends
- **Performance bands** - Poor → Basic → Good → Strong → Hire-Ready

---

## 🎨 UI/UX Highlights

- **Guided Mode** - Staged interview with coaching tips
- **Test Mode** - Free-form practice with instant feedback
- **Dark Theme** - Eye-friendly interface with smooth animations
- **Mobile Responsive** - Works on desktop and tablets
- **Real-time Feedback** - Immediate evaluation after each answer

---

## 🔗 Links

- **Live Demo**: https://mock-mate-ai-interview.vercel.app
- **GitHub**: https://github.com/vansh-tambi/MockMate
- **Backend API**: https://mockmate-47x8.onrender.com
- **Case Study**: [CASE_STUDY.md](CASE_STUDY.md)
- **Features**: [ELITE_FEATURES_COMPLETE.md](ELITE_FEATURES_COMPLETE.md)

---

## 📝 License

MIT License - Feel free to use for personal and commercial projects

---

## 🤝 Contributing

Pull requests and suggestions are welcome! Please open an issue first to discuss major changes.

---

## 📧 Contact

**Vansh Tambi**
- GitHub: [@vansh-tambi](https://github.com/vansh-tambi)
- LinkedIn: [Profile Coming Soon]

---

**Built with ❤️ for interview preparation. Hope this helps you land your dream job! 🚀**
