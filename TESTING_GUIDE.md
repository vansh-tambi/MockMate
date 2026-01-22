# 🚀 Quick Start - Testing Guide

**Purpose**: Start all services and run validation interviews  
**Time needed**: ~30 minutes  

---

## Pre-flight Check

✅ Ollama installed and running with `phi3` model  
✅ Node.js and Python installed  
✅ Dependencies installed in all three folders  

---

## Step 1: Start AI Service (Terminal 1)

```powershell
cd C:\Users\hp\OneDrive\Desktop\WebDev\Projects\MockMate\ai_service
.\venv\Scripts\Activate.ps1
python app.py
```

**Expected output**:
```
✅ RAG retriever loaded successfully
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Health check**: http://localhost:8000/health

---

## Step 2: Start Server (Terminal 2)

```powershell
cd C:\Users\hp\OneDrive\Desktop\WebDev\Projects\MockMate\server
npm run dev
```

**Expected output**:
```
🚀 Initializing MockMate Server...
🤖 AI Mode: Local AI Service (phi3)
✅ Server running on http://localhost:5000
```

**Health check**: http://localhost:5000/health

---

## Step 3: Start Client (Terminal 3)

```powershell
cd C:\Users\hp\OneDrive\Desktop\WebDev\Projects\MockMate\client
npm run dev
```

**Expected output**:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Open browser**: http://localhost:5173

---

## Step 4: Run Validation Interviews

Open [EVAL_NOTES.md](EVAL_NOTES.md) side-by-side with the app.

### Interview 1: Frontend Intern (Good Answer)
1. Select role: **Frontend Developer (Intern)**
2. Get a React question (e.g., "What is React?")
3. Give a **good answer** covering 4-5 ideal points
4. Submit and document in EVAL_NOTES.md:
   - Score received
   - Is it believable?
   - Are strengths specific?
   - Are improvements actionable?

### Interview 2: Backend Intern (Average Answer)
1. Select role: **Backend Developer (Intern)**
2. Get a Node.js or SQL question
3. Give an **average answer** - cover 2-3 points, be vague on details
4. Document observations

### Interview 3: Frontend Junior (Terrible Answer)
1. Select role: **Frontend Developer (Junior)**
2. Get a React hooks question
3. Give a **terrible answer** - wrong concepts, confused
4. Document observations

### Interview 4: DSA (Good Answer)
1. Select role: **Software Engineer (Fresher)**
2. Get an algorithms question
3. Give a **good answer** with time complexity and examples
4. Document observations

### Interview 5: Behavioral (Average Answer)
1. Select any role
2. Get a behavioral question
3. Give an **average answer** - some STAR, light on details
4. Document observations

---

## Step 5: Review Findings

After all 5 interviews, in EVAL_NOTES.md fill out:

### Cross-Cutting Patterns
- Do similar answers get similar scores?
- Are score bands aligned (bad = 0-30, good = 71-85)?
- Is feedback repetitive or fresh?
- Does RAG context show up in feedback?

### Key Insights
- What's working well?
- What feels off?
- Any red flags?

---

## Troubleshooting

### AI Service won't start
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Check Ollama is running
ollama list
ollama run phi3 "test"
```

### Server won't start
```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Verify .env has GEMINI_API_KEY
cat server\.env
```

### Evaluation takes too long
- Normal: 5-15 seconds with phi3
- If >30s, check Ollama performance
- Fallback to Gemini if needed (will be slower but works)

### Scores seem inflated/deflated
- **Document in EVAL_NOTES.md** - don't fix yet
- Pattern: too high? Adjust prompt later
- Pattern: too low? Adjust prompt later

---

## What Success Looks Like

After validation, you should be able to answer:

✅ "A score of 65 means..." (you can explain it)  
✅ "Strengths are specific, not generic" (90% of the time)  
✅ "Improvements are actionable" (user knows what to study)  
✅ "Feedback varies by answer quality" (not repetitive)  
✅ "Score bands align with reality" (bad = low, good = high)  

If you can say YES to 4/5 of these, **you're ready to iterate**.

---

## After Validation

1. Review [EVAL_NOTES.md](EVAL_NOTES.md) for patterns
2. Read [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for what's next
3. Make small, targeted adjustments
4. Re-test with 2-3 more interviews
5. Repeat until satisfied

**Remember**: You're optimizing for taste and judgment now, not more features.

---

## Quick Reference

| Service | Port | Health Check | Logs |
|---------|------|-------------|------|
| AI Service | 8000 | /health | Terminal 1 |
| Server | 5000 | /health | Terminal 2 |
| Client | 5173 | / | Terminal 3 |

**Stop all services**: Ctrl+C in each terminal

Good luck! 🎯
