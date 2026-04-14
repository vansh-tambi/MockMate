# ⚡ Phi-3 Quick Setup (15 Minutes)

**Get Phi-3 AI evaluation working in 15 minutes**

---

## Prerequisites Check (2 min)

```powershell
# Check Node.js installed
node --version
npm --version
# Should see v18+ and 9+

# Check Python installed
python --version
# Should see 3.9+

# Check disk space
# Need ~4GB free for Phi-3 model
```

If any missing → Install from official website first

---

## Step 1: Install Ollama (3 min)

### Windows & Mac
1. Go to https://ollama.ai/download
2. Download and run installer
3. Restart terminal

### Linux
```bash
curl https://ollama.ai/install.sh | sh
```

### Verify
```powershell
ollama --version
# Output: ollama version X.X.X
```

---

## Step 2: Download Phi-3 Model (5 min)

⏱️ *This downloads the 3.8GB model - might take 2-5 min on good internet*

```powershell
ollama pull phi3
```

### Verify
```powershell
ollama list
# Should show: phi3:latest
```

---

## Step 3: Start Ollama Service (1 min)

Keep this running in background:

```powershell
ollama serve
# Output should say: "Ollama is running on http://localhost:11434"
```

Leave this terminal open. 

**Tip:** On Windows, Ollama also runs in system tray after first install. You can close the terminal - it stays running.

---

## Step 4: Set Up AI Service (3 min)

Open NEW terminal (keep Ollama terminal open):

```powershell
cd MockMate/ai_service

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate
# (Mac/Linux: source venv/bin/activate)

# Install dependencies
pip install -r requirements.txt
# Takes 1-2 minutes
```

---

## Step 5: Start AI Service (1 min)

Still in same terminal:

```powershell
python -m uvicorn app:app --host 0.0.0.0 --port 8000

# Should print:
# Uvicorn running on http://0.0.0.0:8000
# ✅ RAG retriever loaded...
# ✅ Gemini API configured...
```

Leave this running.

---

## Step 6: Start Server (1 min)

Open THIRD terminal:

```powershell
cd MockMate/server
npm start

# Should print:
# ✅ AI Service (Phi-3) is healthy and ready
# Server listening on port 5000
```

---

## Done! ✅

You now have:
- ✅ Phi-3 AI running on port 11434 (Ollama)
- ✅ AI Service on port 8000 (Python)
- ✅ Server on port 5000 (Node.js)

---

## Test It Works (1 min)

### Option A: Browser
```
http://localhost:5000/api/interview/v2/ai-status
```

Should return:
```json
{
  "success": true,
  "aiService": {
    "healthy": true,
    "status": "Ollama connected"
  }
}
```

### Option B: PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/health" | Select-Object -ExpandProperty Content
```

---

## How to Use

### Submit an Answer
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/interview/v2/submit" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"sessionId":"test","questionId":"q1","answer":{"text":"My answer here"}}'
```

You should see:
```json
{
  "evaluation": {
    "aiPowered": true,
    "score": 0.7,
    "rawScore": 7,
    "feedback": "Good answer..."
  }
}
```

**The `"aiPowered": true` means Phi-3 evaluated it!**

---

## Common Issues

### "Connection refused" on port 11434
```powershell
# Ollama not running
# In separate terminal, run:
ollama serve
```

### "Port 8000 already in use"
```powershell
# Kill process on 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "Phi-3 model not found"
```powershell
ollama pull phi3
ollama list  # Verify it's there
```

### "Python: command not found"
```powershell
# Python not installed or not in PATH
# Install from python.org
```

---

## Terminal Layout (What You Should See)

```
Terminal 1: Ollama                Terminal 2: AI Service            Terminal 3: Server
┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│ ollama serve             │    │ (venv) python -m uvicorn │    │ npm start                │
│                          │    │                          │    │                          │
│ Ollama is running on     │    │ Uvicorn running on       │    │ ✅ AI Service healthy    │
│ http://localhost:11434   │    │ http://0.0.0.0:8000      │    │ Server on port 5000      │
│                          │    │ ✅ RAG loaded            │    │ Ready for requests!      │
│ [leave open]             │    │ [leave open]             │    │ [leave open]             │
└──────────────────────────┘    └──────────────────────────┘    └──────────────────────────┘
         🤖                               🐍                               📱
       AI Engine                    Request Handler                   Main Server
```

Keep all 3 running while developing.

---

## For Production

See [DEPLOYMENT_GUIDE_PHI3.md](DEPLOYMENT_GUIDE_PHI3.md) for:
- Cloud deployment (Heroku + AWS)
- Docker setup
- SSL/HTTPS configuration
- Load balancing

---

## What's Different From Before?

### Without Phi-3
```
Answer Submitted
    ↓
Local regex evaluation
    ↓
Score: 0.5 (hardcoded)
```

### With Phi-3
```
Answer Submitted
    ↓
Sent to Phi-3 AI
    ↓
AI understands context
    ↓
Score: 0.7 + detailed feedback
```

---

## Next: Use in Interview

Open your client application:
```
http://localhost:5173  (or wherever React runs)
```

Take an interview:
1. Upload resume (optional - enables smart filtering)
2. Answer questions
3. See **AI-Powered Score** instead of "pending"
4. See **Strengths & Improvements** from Phi-3
5. Answer next question (difficulty auto-adjusted)

---

## Keyboard Shortcuts

```powershell
# Ollama terminal: Ctrl+C to stop
# AI Service terminal: Ctrl+C to stop  
# Server terminal: Ctrl+C to stop
```

To restart: Just run the command again

---

## Want to Stop?

```powershell
# Terminal 1 (Ollama)
Ctrl+C

# Terminal 2 (AI Service)
Ctrl+C

# Terminal 3 (Server)
Ctrl+C

# Or just close the terminals
# To restart: Run all 3 commands again
```

---

## Architecture You Just Built

```
                    React Client
                         ↓
                   Node.js Server
                    (Port 5000)
                         ↓
                  Python AI Service
                    (Port 8000)
                         ↓
                    Ollama Runtime
                  (Port 11434)
                         ↓
                   Phi-3 LLM Model
                   (3.8B params)
                         ↓
                  Intelligent
                   Evaluation
```

---

## Success Indicators

- ✅ All 3 terminals running without errors
- ✅ AI Status endpoint returns `"healthy": true`
- ✅ `/submit` endpoint returns `"aiPowered": true`  
- ✅ Score is 0-10 (not 0-1)
- ✅ Feedback includes strengths & improvements

---

## Pro Tips

1. **First evaluation is slow:** Phi-3 loads model (~3-5 sec). Subsequent evaluations are 1-3 sec.

2. **Keep Ollama open in system tray:** After first install, it auto-starts. Don't kill it.

3. **Monitor memory:** 7GB+ if Phi-3 is active. Add more if needed.

4. **Logs are your friend:** All errors printed to terminal. Check for specific error messages.

5. **Lost internet?** That's fine - Phi-3 runs locally. No cloud dependency.

---

## What You Can Now Do

✅ Evaluate answers intelligently  
✅ Get detailed feedback  
✅ Adjust difficulty in real-time  
✅ Track weakness areas  
✅ Generate smart analytics  
✅ Deploy to production  

---

**Finished? Go take an interview and test it out!** 🎯

Having issues? Check:
1. All 3 services running (check terminals)
2. Port 11434 (Ollama) active
3. Port 8000 (AI Service) responding
4. Port 5000 (Server) accessible

Still stuck? → See DEPLOYMENT_GUIDE_PHI3.md for detailed troubleshooting
