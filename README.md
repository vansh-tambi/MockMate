# 🎯 MockMate

> **Interview evaluation grounded in real standards, not hallucinations**

Traditional AI interview tools give you arbitrary scores and generic feedback. MockMate evaluates your answers against a curated question bank using RAG (Retrieval-Augmented Generation), providing explainable scores and specific, actionable feedback.

![Local AI](https://img.shields.io/badge/Local_AI-Phi--3-blue?style=flat)
![RAG](https://img.shields.io/badge/RAG-FAISS-green?style=flat)
![Built with React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat&logo=fastapi)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC?style=flat&logo=tailwind-css)
![Portfolio](https://img.shields.io/badge/Portfolio-v1.0-gold?style=flat)

📺 **[Demo Video Coming Soon]** | 📖 **[Read Case Study](CASE_STUDY.md)** | 📝 **[View Portfolio Descriptions](PORTFOLIO_DESCRIPTIONS.md)**

---

## 🎯 The Problem We Solve

**Most AI interview prep tools:**
- Give you a 67/100 with no context (is that good? bad? what does it mean?)
- Provide generic feedback ("be clearer", "add more detail")
- Inconsistent scoring (same answer, different scores each time)
- Hallucinate strengths that don't exist in your answer

**You never know if you're actually improving or if the AI is just being nice.**

---

## ✨ The MockMate Difference

### Grounded Evaluation Using RAG

When you answer a question, MockMate:
1. **Retrieves 3 similar questions** from a curated bank of 52 questions
2. **Extracts their ideal talking points** as reference standards
3. **Judges your answer** against these known good answers
4. **Assigns you to a locked score band** with clear meaning

**Result**: Scores are explainable. Feedback is specific. Progress is measurable.

### Locked Score Bands (Not Arbitrary Numbers)

```
0–30    = ❌ INCORRECT      (fundamentally wrong)
31–50   = ⚠️ SURFACE LEVEL  (vague, major gaps)
51–70   = ✓ ACCEPTABLE      (meets interview bar)
71–85   = ✓✓ STRONG         (better than most)
86–100  = ✓✓✓ EXCEPTIONAL   (rare mastery)
```

You know exactly what your score means and how to improve.

### Local-First Architecture

- **Runs on your machine** with Phi-3 via Ollama (fast, free, no API limits)
- **No vendor lock-in** - not dependent on GPT/Claude/Gemini pricing
- **Consistent evaluation** - RAG grounds the AI in reference standards

---

## 🏗️ Architecture

```
User Answer → Server → Local AI (Phi-3) → RAG Retrieval → Evaluation
                                              ↓
                                     3 similar questions
                                     with ideal_points
                                              ↓
                                     Grounded score + feedback
```

**Key decisions**:
- **Local AI first** (Phi-3 via Ollama) - Cloud fallback to Gemini only if needed
- **RAG-grounded** - Judge against curated standards, not vibes
- **52 curated questions** - Quality over quantity (Frontend, Backend, DSA, System Design, Behavioral, Product, Marketing, Data)
- **Locked semantics** - Score bands have documented, consistent meanings

---

## ✨ Features

### 🎯 **RAG-Grounded Evaluation**
- Answer evaluation against real question bank standards
- Specific, actionable feedback (not "add more detail")
- Explainable scores with clear band meanings
- Consistent scoring across sessions

### 🎓 **Guided Study Mode**
- AI-generated interview questions tailored to your resume
- Expandable Q&A cards with ideal talking points
- Regenerate questions for varied practice
- Cross-role support (Frontend, Backend, DSA, Behavioral, Product, etc.)

### 🎙️ **Mock Interview Mode**
- Real-time speech-to-text simulation
- Live video feed for presentation practice
- Detailed strength & improvement analysis
- Question navigation and randomization

### 📄 **Smart Resume Integration**
- PDF upload and text extraction
- Manual resume input option
- Context-aware question generation
- Job description integration

---

## 🚀 Quick Start

### Prerequisites

- **Ollama** with `phi3` model ([Install Ollama](https://ollama.ai))
- **Node.js** (v16+)
- **Python 3.8+**
- **Optional**: Google Gemini API Key for cloud fallback ([Get one](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/vansh-tambi/MockMate.git
   cd MockMate
   
   # Server
   cd server && npm install && cd ..
   
   # Client  
   cd client && npm install && cd ..
   
   # AI Service
   cd ai_service
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   ```

2. **Set up Ollama**
   ```bash
   # Install Ollama: https://ollama.ai
   ollama pull phi3
   ollama serve
   ```

3. **Configure environment** (Create `.env` files)
   
   `server/.env`:
   ```env
   GEMINI_API_KEY=your_key_here  # Fallback only
   USE_LOCAL_AI=true
   AI_SERVICE_URL=http://localhost:8000
   PORT=5000
   ```
   
   `ai_service/.env`:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   MODEL_NAME=phi3
   ```

### Running MockMate

Open 3 terminals:

```bash
# Terminal 1: AI Service
cd ai_service
venv\Scripts\activate
python app.py
# → http://localhost:8000

# Terminal 2: Server
cd server
npm run dev
# → http://localhost:5000

# Terminal 3: Client
cd client
npm run dev
# → http://localhost:5173
```

Then open `http://localhost:5173` in your browser.

---

## 📊 What Makes This Different

### Before MockMate
```
Q: "Explain React hooks"
A: "Hooks are functions for state"
Score: 67/100
Feedback: "Good job! Try to add more detail."
```
→ What does 67 mean? What detail? How do I improve?

### With MockMate
```
Q: "Explain React hooks"
A: "Hooks are functions for state"
Score: 42/100 | ⚠️ SURFACE LEVEL
Feedback: "Mentioned useState but missed: useEffect for side effects, 
custom hooks for reusability, composition pattern. Add concrete examples 
like custom useLocalStorage hook."
```
→ Clear band. Specific gaps. Actionable next steps.

**Why?** RAG retrieved similar React hooks questions and compared your answer to known ideal points.

---

## 🛠️ Tech Stack

### AI & RAG
- **Ollama + Phi-3** - Local LLM for evaluation
- **FAISS** - Vector similarity search
- **Sentence Transformers** - Semantic embeddings
- **FastAPI** - AI service backend

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Web Speech API** - Voice recognition

### Backend
- **Node.js + Express** - API server
- **Google Gemini** - Cloud fallback (optional)
- **Multer** - File uploads
- **pdf-parse** - Resume parsing

---

## 📂 Project Structure

```
MockMate/
├── ai_service/          # FastAPI + RAG + Local LLM
│   ├── app.py           # Main evaluation endpoint
│   ├── rag/             # Retrieval-Augmented Generation
│   │   ├── embeddings.py    # FAISS indexing
│   │   └── retrieve.py      # Question retrieval
│   └── data/
│       ├── questions.json       # 52 curated questions
│       └── embeddings.index     # FAISS vector index
│
├── server/              # Express API server
│   └── index.js         # Question generation + routing
│
├── client/              # React frontend
│   └── src/components/
│       ├── TestMode.jsx       # Mock interview UI
│       ├── GuidedMode.jsx     # Study mode
│       └── SetupScreen.jsx    # Resume input
│
└── docs/                # Documentation
    ├── PRODUCT_NARRATIVE.md    # Why this matters
    ├── SCORING_SEMANTICS.md    # Score band definitions
    └── EVAL_NOTES.md           # Validation template
```

---

## 📖 Documentation

- **[PRODUCT_NARRATIVE.md](PRODUCT_NARRATIVE.md)** - Why RAG-grounded evaluation matters
- **[SCORING_SEMANTICS.md](SCORING_SEMANTICS.md)** - Locked score band definitions
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Technical implementation details
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - How to validate the system
- **[Client README](./client/README.md)** - Frontend documentation
- **[Server README](./server/README.md)** - Backend API documentation
- **[AI Service README](./ai_service/README.md)** - RAG system documentation

---

## 🎯 Design Decisions

### Why Local AI (Phi-3)?
- ✅ **Zero API costs** - Run unlimited evaluations
- ✅ **Fast** - No network latency
- ✅ **Consistent** - Same model, same results
- ✅ **No vendor lock-in** - Not tied to GPT/Claude pricing
- ⚠️ **Tradeoff**: Requires Ollama setup (cloud fallback available)

### Why RAG?
- ✅ **Grounded in reality** - Compares to known good answers
- ✅ **Explainable scores** - Can show which ideal points were missed
- ✅ **Consistent** - Same answer quality → same score
- ⚠️ **Tradeoff**: Limited to question bank size (52 curated questions)

### Why Locked Score Bands?
- ✅ **Meaningful** - Users know what 67 means
- ✅ **Consistent** - Not arbitrary numbers
- ✅ **Educational** - Teaches what "good" looks like
- ⚠️ **Tradeoff**: Less granular than 0-100 scale

### Why 52 Questions, Not 500?
- ✅ **Quality over quantity** - Every question curated with good ideal_points
- ✅ **Maintainable** - Can iterate on quality
- ✅ **Testable** - Small enough to validate manually
- ⚠️ **Tradeoff**: Limited domain coverage (focused on key roles)

---

## 🎬 Demo Script (2 minutes)

**The Problem** (30s)  
"Traditional AI interview tools give arbitrary scores. You get 67/100 but don't know if that's good, or what to improve."

**The Solution** (60s)  
"MockMate uses RAG - Retrieval-Augmented Generation. When you answer, it retrieves similar questions from a curated bank, compares to their ideal points, and assigns you to a locked score band.

[Show evaluation]

See? 42/100 = ⚠️ SURFACE LEVEL. It tells you you mentioned useState but missed useEffect, custom hooks, and composition. That's specific feedback grounded in reference standards."

**The Tech** (30s)  
"It runs locally with Phi-3 + FAISS for vector search. No API costs, no vendor lock-in. The question bank has 52 curated questions - quality over quantity.

This is the difference between 'I asked GPT' and 'I built a grounded evaluation system.'"

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional curated questions with quality ideal_points
- Refinement of existing ideal_points based on validation
- UI/UX polish for score band display
- Documentation improvements

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Vansh Tambi**
- GitHub: [@vansh-tambi](https://github.com/vansh-tambi)
- Project: [MockMate](https://github.com/vansh-tambi/MockMate)

---

## 🙏 Acknowledgments

- **Ollama** - Local LLM infrastructure
- **Sentence Transformers** - Semantic embedding models
- **React & FastAPI communities** - Excellent developer experience

---

**Built with judgment, not just code.** 🚀

---

## 📂 Project Structure

```
MockMate/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── GuidedMode.jsx      # Study mode with Q&A cards
│   │   │   ├── TestMode.jsx        # Mock interview simulator
│   │   │   ├── SetupScreen.jsx     # Resume/job input
│   │   │   └── Navbar.jsx          # Navigation bar
│   │   ├── App.jsx         # Main application component
│   │   ├── main.jsx        # Application entry point
│   │   └── index.css       # Global styles
│   ├── public/             # Static assets
│   ├── package.json        # Frontend dependencies
│   └── README.md           # Client documentation
│
├── server/                 # Backend Express server
│   ├── index.js            # Server entry point & API routes
│   ├── CLEANED_QUESTIONS.txt  # Question bank
│   ├── package.json        # Backend dependencies
│   └── README.md           # Server documentation
│
├── test_randomization.py   # Testing utilities
└── README.md               # This file
```

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS 4.1** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Web Speech API** - Voice recognition

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **Google Generative AI (Gemini)** - AI question generation and evaluation
- **Multer** - File upload handling
- **pdf-parse** - PDF text extraction
- **CORS** - Cross-origin resource sharing

---

## 📖 Documentation

For detailed documentation, please refer to:
- [Client Documentation](./client/README.md) - Frontend setup and components
- [Server Documentation](./server/README.md) - Backend API and endpoints

---

## 🔧 API Overview

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parse-resume` | POST | Parse PDF resume and extract text |
| `/api/generate-qa` | POST | Generate personalized interview questions |
| `/api/evaluate` | POST | Evaluate user's answer and provide feedback |

For detailed API documentation, see [Server README](./server/README.md).

---

## 🎨 Key Features Breakdown

### Guided Mode
- Browse AI-curated questions specific to your role
- View expected answer directions and talking points
- Toggle between questions with smooth animations
- Regenerate entire question set for fresh practice

### Test Mode
- Record video and audio for realistic interview practice
- Real-time speech transcription
- Submit answers for AI evaluation
- Receive detailed feedback with strengths and areas for improvement
- Navigate through questions or shuffle them randomly
- Track completion status

### Setup Screen
- Upload resume as PDF or enter manually
- Specify target job role/description
- Beautiful gradient animations and modern UI
- Data validation and error handling

---

## 🌟 Technologies Used

- **Gemini AI Models:** Intelligent question generation and answer evaluation using Google's latest language models (Gemini 1.5 Flash, Pro, 2.0 Flash)
- **Framer Motion:** Smooth, professional animations throughout the interface
- **Web Speech API:** Browser-native speech recognition for voice input
- **LocalStorage:** Client-side session persistence
- **Responsive Design:** Mobile-friendly interface with TailwindCSS

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Vansh Tambi**

- GitHub: [@vansh-tambi](https://github.com/vansh-tambi)
- Repository: [MockMate](https://github.com/vansh-tambi/MockMate)

---

## 🙏 Acknowledgments

- Google Gemini AI for powerful language model capabilities
- React and Vite teams for excellent developer experience
- TailwindCSS for utility-first styling
- Framer Motion for animation framework

---

## 🐛 Known Issues & Roadmap

- [ ] Add support for multiple resume formats (DOCX, TXT)
- [ ] Implement interview history tracking
- [ ] Add export functionality for practice sessions
- [ ] Support multiple languages
- [ ] Enhanced analytics and progress tracking
- [ ] Integration with calendar for scheduled practice
- [ ] Dark/Light theme toggle
- [ ] Mobile app version

---

## 📧 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

**Made with ❤️ by Vansh Tambi**
