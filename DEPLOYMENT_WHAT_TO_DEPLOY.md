# 📦 What To Deploy - Final Checklist

**Complete file structure and deployment instructions**

---

## Quick Answer: What To Deploy?

### Minimal (Works Without AI)
```
✅ Deploy these folders:
  server/
  ai_service/data/

❌ Don't deploy these:
  ai_service/app.py (optional)
  venv/ folders
  node_modules/
```

### Full Production (With Phi-3)
```
✅ Deploy these folders:
  server/
  ai_service/
  client/

❌ Don't deploy:
  venv/
  __pycache__/
  node_modules/
```

---

## Complete File Structure To Deploy

### Server Folder
```
server/
├─ index.js                              ← Main entry point
├─ package.json                          ← Dependencies
├─ .env                                  ← Config (GEMINI_API_KEY)
│
├─ data/
│  └─ user_profiles/                    ← User session data (created at runtime)
│
├─ services/
│  ├─ ResumeAnalyzer.js                 ← Resume analysis
│  ├─ DifficultyProgression.js           ← Difficulty control
│  ├─ FollowUpEngine.js                  ← Follow-ups
│  ├─ AnalyticsTracker.js                ← Performance tracking
│  ├─ WeaknessAdapter.js                 ← Weakness detection
│  ├─ AIServiceIntegration.js            ← AI bridge ← NEW
│  ├─ PlatformMetrics.js                 ← (existing)
│  └─ (other services)                   ← (existing)
│
├─ config/
│  └─ skills_map.json                   ← 60+ skill definitions
│
├─ interview-routes-v2.js                ← API endpoints (MODIFIED)
├─ interview-routes.js                   ← Original routes
├─ EnhancedInterviewEngine.js            ← Question orchestrator
├─ QuestionSelector.js                   ← Question selection logic
├─ InterviewEngine.js                    ← (existing)
├─ questionLoader.js                     ← Question loading
├─ stageManager.js                       ← Stage logic
└─ (other helper files)                  ← (existing)
```

### AI Service Folder (Optional)
```
ai_service/
├─ app.py                                ← FastAPI application ← REQUIRED FOR AI
├─ requirements.txt                      ← Python dependencies
├─ .env                                  ← Config
│
├─ data/
│  ├─ warmup_questions.json              ← Question data
│  ├─ technical_questions.json           ├─ Used by server
│  ├─ behavioral_questions.json          │
│  ├─ system_design_questions.json       │
│  ├─ advanced_questions.json            └─ (local file reading)
│  └─ (other question files)
│
├─ rag/                                  ← RAG module (if available)
├─ session_context.py                    ← Session management
└─ (test files - NOT for production)
```

### Client Folder
```
client/
├─ src/
│  ├─ components/                        ← React components
│  ├─ pages/                             ├─ UI code
│  ├─ utils/                             │
│  └─ App.jsx                            └─ Entry point
│
├─ public/
├─ package.json                          ← Dependencies
├─ vite.config.js                        ← Build config
└─ (build config files)
```

---

## Deployment by Option

### 🟢 Option A: Server Only (MVP)

**What to deploy:**
```
server/             (entire folder)
ai_service/data/    (ONLY data subfolder)
client/             (entire folder)
```

**What to SKIP:**
```
ai_service/app.py
ai_service/rag/
ai_service/venv/
ai_service/__pycache__/
```

**Setup:**
```powershell
# Server
cd server
npm install --production
npm start

# Client (separate)
cd client
npm install --production
npm build
# Deploy build/ folder to Vercel/Netlify
```

**Cost:** ~$7-10/month

---

### 🟡 Option B: Server + AI Service (Recommended)

**What to deploy:**
```
server/             (entire folder)
ai_service/         (entire folder - EXCEPT venv/ and __pycache__/)
client/             (entire folder)
```

**What to SKIP:**
```
ai_service/venv/
ai_service/__pycache__/
node_modules/       (regenerate on server)
client/node_modules/
```

**Setup:**

**Server (Node.js):**
```powershell
cd server
npm install --production
npm start
# OR on Linux/cloud:
# node index.js
```

**AI Service (Python):**
```bash
cd ai_service
python -m venv venv
source venv/bin/activate  # .\venv\Scripts\Activate on Windows
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

**Client (React):**
```bash
cd client
npm install --production
npm build
# Deploy build/ folder to Vercel/Netlify
```

**Ollama (Local Runtime):**
```bash
ollama pull phi3
ollama serve
# Runs on port 11434
```

**Cost:** ~$15-20/month

---

### 🔴 Option C: Full Self-Hosted

**Same as Option B + additional setup:**

**Infrastructure:**
```
AWS EC2 / DigitalOcean / Azure VM
├─ Node.js server
├─ Python AI service
├─ Ollama + Phi-3
└─ PostgreSQL (optional)
```

**Deployment structure:**
```
/opt/mockmate/
├─ server/
├─ ai_service/
├─ client/build/
└─ systemd services
```

See DEPLOYMENT_GUIDE_PHI3.md for full instructions

**Cost:** ~$12-30/month depending on cloud provider

---

## Environment Variables

### Server (.env)
```bash
# Required
GEMINI_API_KEY=xxxxxxxxxxxx

# Optional (defaults shown)
PORT=5000
NODE_ENV=production
AI_SERVICE_URL=http://localhost:8000

# For cloud deployment
DATABASE_URL=postgresql://...  (if using DB)
```

### AI Service (.env)
```bash
# Required
OLLAMA_BASE_URL=http://localhost:11434

# Optional
GEMINI_API_KEY=xxxxxxxxxxxx  (fallback if Ollama fails)
PORT=8000
```

---

## Deployment Steps Summary

### Local Development
```powershell
# Terminal 1: Ollama (if using AI)
ollama serve

# Terminal 2: AI Service (if using AI)
cd ai_service
pip install -r requirements.txt
python -m uvicorn app:app --port 8000

# Terminal 3: Server
cd server
npm install
npm start

# Terminal 4: Client (optional)
cd client
npm install
npm run dev
```

### Production Deployment (Heroku Example)

**Server:**
```bash
cd server
heroku create mockmate-server
heroku config:set GEMINI_API_KEY=xxx
git push heroku main
```

**AI Service:**
```bash
cd ai_service
heroku create mockmate-ai
heroku config:set OLLAMA_BASE_URL=http://ollama-server:11434
git push heroku main
```

**Client:**
```bash
cd client
npm build
# Deploy build/ to Vercel or Netlify
```

**Ollama:**
```bash
# On dedicated server or local machine
ollama pull phi3
ollama serve
```

---

## Database Setup (Optional)

For multi-user production, add PostgreSQL:

```bash
# Create database
createdb mockmate

# User profiles stored in:
server/data/user_profiles/{userId}_profile.json
# OR
PostgreSQL (if configured)

# Questions loaded from:
ai_service/data/*.json
# Cached in memory during runtime
```

---

## File Size Reference

```
Deployment Package Sizes:

server/                  ~2 MB
  ├─ node_modules/      ~150 MB (not deployed, regenerated)
  └─ data/             ~1 MB (grows with user profiles)

ai_service/            ~1 MB
  ├─ venv/             ~200 MB (not deployed, regenerated)
  ├─ data/             ~5 MB
  └─ __pycache__/      (not deployed, regenerated)

client/                ~3 MB
  ├─ node_modules/     ~400 MB (not deployed, regenerated)
  └─ build/            ~2 MB (deployed to CDN)

ollama/phi3            ~3.8 GB (downloaded separately)

Total Deployment:      ~11 MB (without node_modules/venv)
Total With Dependencies: ~650 MB
```

---

## Deployment Verification

After deploying, verify:

### Server Health
```bash
curl http://your-server/api/interview/v2/ai-status
# Should return: {"success":true,"aiService":{"healthy":true}}
```

### AI Service Health
```bash
curl http://your-ai-service/health
# Should return: {"status":"healthy","ollama":"connected"}
```

### Function Test
```bash
curl -X POST http://your-server/api/interview/v2/start \
  -H "Content-Type: application/json" \
  -d '{"role":"backend","level":"mid"}'
# Should return first question
```

---

## Scaling Considerations

### Small Deployment (MVP)
```
Single server:
├─ Node.js
├─ Python AI
├─ Ollama (Phi-3)
└─ SQLite/JSON storage

Handles: 10-100 concurrent users
```

### Medium Deployment (Growth)
```
Load balancer
├─ Multiple Node.js servers
├─ Shared Python AI service
├─ Shared Ollama + cache
└─ PostgreSQL

Handles: 100-1000 concurrent users
```

### Large Deployment (Scale)
```
CDN for client
├─ Kubernetes cluster (Node.js)
├─ Separate Kubernetes (Python AI)
├─ Redis cache + Ollama farm
├─ PostgreSQL + read replicas
└─ Monitoring + logging stack

Handles: 1000+ concurrent users
```

---

## What NOT to Deploy

### Always Skip
```
❌ venv/                  (regenerate on server)
❌ __pycache__/           (generated at runtime)
❌ node_modules/          (regenerate with npm install)
❌ .git/                  (if using GitHub actions)
❌ test_*.py              (test files)
❌ *.pyc                  (compiled Python)
❌ .DS_Store              (macOS junk)
❌ .env (in git)          (set on server separately)
```

### Usually Skip (unless needed)
```
⚠️ client/src/           (if deploying build only)
⚠️ *.md files           (documentation)
⚠️ EXCEL/CSv files      (data samples)
```

---

## Troubleshooting Deployment

### "Module not found"
```bash
# Run on server:
cd server
npm install --production
# OR
cd ai_service
pip install -r requirements.txt
```

### "Port already in use"
```bash
# Server (5000):
lsof -i :5000
kill -9 <PID>

# AI Service (8000):
lsof -i :8000
kill -9 <PID>

# Ollama (11434):
lsof -i :11434
kill -9 <PID>
```

### "Connection refused"
```bash
# Check if services are running:
netstat -an | grep 5000
netstat -an | grep 8000
netstat -an | grep 11434

# Start them if missing
```

---

## Deployment Checklist

Before going live:

- [ ] All three folders created on server
- [ ] package.json dependencies installed
- [ ] pip requirements installed
- [ ] .env file created with correct keys
- [ ] Phi-3 model downloaded (if using AI)
- [ ] All services start without errors
- [ ] Health endpoints return 200 OK
- [ ] Interview flow works end-to-end
- [ ] User data persists correctly
- [ ] Monitoring/alerts configured
- [ ] Backup strategy in place
- [ ] SSL certificate installed

---

## Quick Decision Tree

```
Do you want intelligent AI evaluation?
│
├─ NO (MVP)
│  └─ Deploy: server + ai_service/data + client
│     Cost: ~$7-10/month
│     Time: 30 minutes
│     
├─ YES, cloud-hosted
│  └─ Deploy: server + ai_service + client
│     Install: Ollama + Phi-3 on separate server
│     Cost: ~$15-20/month
│     Time: 2-3 hours
│     
└─ YES, self-hosted
   └─ Deploy: everything to single/multiple servers
      Install: Ollama locally on each
      Cost: ~$12-30/month
      Time: 3-4 hours
```

---

## Your Deployment Path

1. **Right now:** 
   Pick your option above ↑

2. **Today:** 
   Gather files, prepare deployment

3. **This week:** 
   Deploy to staging, test thoroughly

4. **Next week:**
   Deploy to production, celebrate! 🎉

---

**Need help? Check:**
- DEPLOYMENT_GUIDE_PHI3.md - Detailed instructions
- QUICK_SETUP_PHI3.md - 15-minute setup
- PHI3_HOW_IT_WORKS.md - Architecture details

**Ready? Pick your option and start deploying!** 🚀
