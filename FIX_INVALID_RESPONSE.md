# 🚀 Fix: "Invalid response format" Error - Complete Guide

## Quick Diagnosis

The error "Invalid response format" means the `/api/generate-qa` endpoint is not returning data in the expected format. **9 times out of 10**, it's one of these:

1. **Gemini API key missing** → API fails silently
2. **Question files not loaded** → Response structure breaks
3. **Server error before response sent** → Unhandled exception

---

## Immediate Fix (Try This First)

### On Windows:
```bash
cd C:\Users\hp\OneDrive\Desktop\WebDev\Projects\MockMate
.\diagnose.bat
```

### On Mac/Linux:
```bash
cd ~/MockMate
bash diagnose.sh
```

This will:
- ✅ Check if server is running
- ✅ Verify Gemini API key is set
- ✅ Confirm question files are loaded
- ✅ Test question generation
- ✅ Show exact error messages

---

## If Diagnostic Shows Error

### 🔴 "Server is NOT running"
```bash
# Terminal 1: Start server
cd server
npm start

# You should see:
# 🚀 Initializing Staged Progression System:
#    ✅ introduction      → 3 questions from 3 files
#    ✅ warmup           → 3 questions from 2 files
#    ✅ resume_technical → 8 questions from 5 files
#    ✅ real_life        → 5 questions from 5 files
#    ✅ hr_closing       → 3 questions from 3 files
```

If you see this, rerun diagnose script.

---

### 🔴 "GEMINI_API_KEY is missing"
```bash
# Create server/.env file
cd server
echo GEMINI_API_KEY=your_actual_key_here > .env

# Or manually create server/.env with this content:
# GEMINI_API_KEY=your_actual_key_here
# (Replace with real key from Google AI Studio)

# Restart server
npm start
```

**Get Your Gemini API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Create new API key
3. Copy it to server/.env

---

### 🔴 "Question files not loading"
```bash
# Check if files exist:
ls -la ai_service/data/

# Should see (on Windows, use: dir ai_service\data\):
# introductory_icebreaker.json
# personality_questions.json
# self_awareness.json
# warmup_questions.json
# hr_basic_questions.json
# ... etc (many more files)

# If files are missing:
# - Restore them from git
# - Verify ai_service/data/ is not in .gitignore
```

---

### 🔴 "question generation failed"
Check server console for the actual error:
```bash
# Watch server console while making request
npm start | grep -E "❌|Error"

# Common errors:
# ❌ Failed to load [filename].json: No such file
#    → Question file missing (see above)
#
# ❌ Gemini API error
#    → API key invalid or quota exceeded
#
# ❌ JSON parsing failed
#    → Question file has syntax error
```

---

## Manual Testing

If diagnostic doesn't work, test manually:

### Test 1: Server Health
```bash
curl http://localhost:5000/api/health
```
Should return JSON with `status: ok`

### Test 2: Load Stages
```bash
curl http://localhost:5000/api/debug/stages
```
Should show all 5 stages with question counts

### Test 3: Generate First Question
```bash
curl -X POST http://localhost:5000/api/generate-qa \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "I am a software engineer",
    "jobDescription": "SDE Intern",
    "questionIndex": 0,
    "askedQuestions": []
  }'
```

Should return:
```json
{
  "success": true,
  "question": {
    "text": "...",
    "index": 0,
    "stage": "introduction"
  },
  "guidance": {...},
  ...
}
```

---

## Check Logs During Test

While running the application:

### Frontend Console (Browser F12 → Console tab)
Should show:
```
📤 Fetching question 0 of 22
✅ Question received: introduction - Q0
```

### Server Console
Should show:
```
🚀 ===== GENERATE Q&A REQUEST (STAGED) =====
📊 Current question index: 0
📍 Current Stage: INTRODUCTION
📚 Stage questions loaded: 25 available
❓ Selected Question: Tell me about yourself...
🤖 Generating contextual answer...
✅ Contextual answer generated successfully
✅ Response ready to send to frontend
```

---

## If Still Not Working

### Check 1: .env File
```bash
# Should exist: server/.env
cat server/.env

# Should show:
# GEMINI_API_KEY=sk-...
```

### Check 2: Data Directory
```bash
# Verify path exists
ls -la ai_service/data/introductory_icebreaker.json

# If path wrong, check server/index.js line 299:
const DATA_DIR = path.join(__dirname, '..', 'ai_service', 'data');
```

### Check 3: File Permissions
```bash
# On Windows, question files should be readable
# On Mac/Linux:
chmod 644 ai_service/data/*.json
chmod 755 ai_service/data/
```

---

## Final Verification

Once you fix the issue:

1. ✅ Diagnose script passes all 4 checks
2. ✅ Server console shows stage initialization
3. ✅ Frontend console shows "Question received"
4. ✅ Progress bar displays with question text
5. ✅ Click "Next Question" → New question loads
6. ✅ After 22 questions → Completion screen

---

## Emergency Reset

If everything is broken:

```bash
# 1. Stop all processes (Ctrl+C on terminals)

# 2. Reinstall dependencies
cd server && npm install
cd ../client && npm install

# 3. Recreate .env
cd server
echo GEMINI_API_KEY=your_actual_key_here > .env

# 4. Start fresh
npm start (in server terminal)
npm run dev (in client terminal - different terminal)

# 5. Test: http://localhost:5000/api/health
```

---

## Support Checklist

If nothing works, provide:
- [ ] Output of `diagnose.bat` or `diagnose.sh`
- [ ] First 50 lines of server console output on startup
- [ ] Browser console error message
- [ ] Confirmation that `.env` file exists in server directory
- [ ] Result of: `curl http://localhost:5000/api/health`
- [ ] Question files count: `ls ai_service/data/*.json | wc -l` (should be 40+)

---

## Success Criteria

You'll know it's working when:

✅ Server startup shows:
```
🚀 Initializing Staged Progression System:
   ✅ introduction → 3 questions
   ✅ warmup → 3 questions
   ...
```

✅ First interview loads with:
- Progress bar showing 4% (Q1/22)
- Stage header: "👋 Introduction"  
- Question text displayed
- Coaching tip visible
- Sample answer visible
- "Next Question" button works

✅ After clicking next → Second question loads (8% progress)

✅ After 22 total questions → Completion screen with 🎉

---

**If you follow these steps, the error will be fixed.** Most likely it's either:
1. Server not running
2. GEMINI_API_KEY not set
3. Question files in wrong location

Let me know which one it was! 🚀
