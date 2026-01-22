# 🚀 Quick Start Guide - AI Service

## ⚡ TL;DR

```bash
cd ai_service
.\start.ps1
```

That's it! Service runs on `http://localhost:8000`

---

## 📋 Prerequisites Checklist

- [ ] Python 3.10+ installed
- [ ] Ollama installed and running
- [ ] Phi-3 model downloaded (`ollama pull phi3`)

### Verify Prerequisites

```powershell
# Check Python
python --version
# Should show: Python 3.10.x or higher

# Check Ollama
ollama --version
ollama list
# Should show: phi3:latest

# Check Ollama is running
curl http://localhost:11434/api/tags
# Should return JSON with models
```

---

## 🎯 Setup (First Time Only)

### Step 1: Create Virtual Environment
```bash
cd ai_service
python -m venv venv
```

### Step 2: Activate venv
```powershell
.\venv\Scripts\activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 🏃 Running the Service

### Method 1: Startup Script (Recommended)
```powershell
.\start.ps1
```

### Method 2: Manual
```powershell
.\venv\Scripts\activate
uvicorn app:app --reload --port 8000
```

### Method 3: Windows Batch
```cmd
start.bat
```

---

## ✅ Verify It Works

### Option 1: Browser
Open: `http://localhost:8000/docs`

Interactive API playground!

### Option 2: Test Script
```bash
python test_service.py
```

### Option 3: Manual cURL
```powershell
# Health check
curl http://localhost:8000/health

# Evaluation
curl -X POST http://localhost:8000/evaluate `
  -H "Content-Type: application/json" `
  -d '{
    "question": "What is React?",
    "user_answer": "React is a JS library for UIs",
    "ideal_points": ["Component-based", "Virtual DOM"]
  }'
```

---

## 📊 Expected Output

### Health Check (`/health`)
```json
{
  "status": "healthy",
  "ollama": "connected",
  "available_models": ["phi3:latest"],
  "active_model": "phi3"
}
```

### Evaluation (`/evaluate`)
```json
{
  "strengths": [
    "Mentioned component-based architecture",
    "Clear and concise answer"
  ],
  "improvements": [
    "Could explain Virtual DOM in more detail"
  ],
  "score": 7,
  "feedback": "Strengths:\n- Mentioned component-based...\n\nScore: 7"
}
```

---

## 🐛 Troubleshooting

### "Ollama not available"
**Fix:**
```bash
# Start Ollama
ollama serve

# In another terminal, verify
ollama list
```

### "Model not found"
**Fix:**
```bash
ollama pull phi3
```

### "Port 8000 already in use"
**Fix:**
```bash
# Change port in start script or:
uvicorn app:app --reload --port 8001
```

### "Virtual environment not found"
**Fix:**
```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

---

## 🔗 Integration with Server

### From Node.js (server/index.js)

```javascript
// Replace Gemini evaluation with AI service
async function evaluateAnswer(question, userAnswer, idealPoints) {
  try {
    const response = await fetch('http://localhost:8000/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        user_answer: userAnswer,
        ideal_points: idealPoints
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }
    
    return await response.json();
    // { strengths, improvements, score, feedback }
    
  } catch (error) {
    console.error('AI service call failed:', error);
    // Fallback to Gemini if needed
    return fallbackToGemini(question, userAnswer);
  }
}
```

---

## 📁 File Structure

```
ai_service/
├── app.py                 # FastAPI application ⭐
├── requirements.txt       # Dependencies
├── test_service.py        # Test suite
├── start.ps1              # PowerShell startup
├── start.bat              # Batch startup
├── .env.example           # Config template
├── .gitignore             # Python ignores
├── README.md              # Full documentation
├── IMPROVEMENTS.md        # What was fixed
├── QUICKSTART.md          # This file
└── venv/                  # Virtual environment (created by you)
```

---

## 🎓 Learning Resources

### FastAPI Docs
`http://localhost:8000/docs` - Interactive API docs

### Ollama API
https://github.com/ollama/ollama/blob/main/docs/api.md

### Architecture
See [README.md](README.md) for detailed architecture explanation

---

## 🚦 Status Indicators

### ✅ Service is Ready When You See:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [67890]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### ❌ Common Error Patterns:
```
ERROR:    Error loading ASGI app. Could not import module "app".
→ Wrong directory. cd to ai_service/

ERROR:    [Errno 10048] Address already in use
→ Port 8000 busy. Kill process or use different port.

ConnectionError: Could not connect to Ollama
→ Start Ollama with: ollama serve
```

---

## 🔄 Development Workflow

1. **Start Ollama** (if not running)
   ```bash
   ollama serve
   ```

2. **Start AI Service**
   ```bash
   cd ai_service
   .\start.ps1
   ```

3. **Test Changes**
   ```bash
   python test_service.py
   ```

4. **Check Interactive Docs**
   `http://localhost:8000/docs`

5. **Make changes to app.py**
   - Server auto-reloads (uvicorn --reload)
   - Test endpoint immediately

---

## 🎯 What's Next?

After AI service is running:

1. **Test thoroughly**
   ```bash
   python test_service.py
   ```

2. **Integrate with server**
   - Modify `server/index.js`
   - Replace Gemini `/evaluate` calls
   - Add fallback logic

3. **Build question dataset**
   - Create structured question bank
   - Add embeddings service
   - Implement RAG retrieval

4. **Deploy**
   - Containerize with Docker
   - Add authentication
   - Set up monitoring

---

## 💡 Pro Tips

1. **Use Interactive Docs**
   - Visit `/docs` for API playground
   - Test endpoints without writing code

2. **Monitor Logs**
   - Watch terminal for request logs
   - Check Ollama performance

3. **Tune Parameters**
   - Adjust temperature in app.py
   - Try different models (mistral, llama3)

4. **Cache Responses**
   - Add Redis for repeat questions
   - Speeds up common queries

---

## 📞 Getting Help

**Issue:** Service not starting
**Check:** [Troubleshooting](#-troubleshooting) section above

**Issue:** Unexpected responses
**Check:** Ollama logs and LLM output parsing

**Issue:** Slow performance
**Check:** Model size, CPU vs GPU, timeout settings

**Need more help?**
- Read [README.md](README.md) for deep dive
- Check [IMPROVEMENTS.md](IMPROVEMENTS.md) for what changed
- Review FastAPI docs: https://fastapi.tiangolo.com

---

**Status:** ✅ Ready to run  
**Last Updated:** January 21, 2026  
**Author:** Vansh Tambi
