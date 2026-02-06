# 🚀 Gemini API Backup Setup Guide

## Overview
MockMate AI Service now has **automatic fallback to Google Gemini API** if the local Ollama model becomes unavailable. This ensures your interview evaluation system stays online even during local server issues.

---

## ✅ What Was Implemented

### Code Changes
- ✅ Added Google Generative AI library to `requirements.txt`
- ✅ Integrated Gemini API initialization in `app.py`
- ✅ Implemented automatic fallback logic in `/evaluate` endpoint
- ✅ Updated health check endpoint to report Gemini status
- ✅ Added comprehensive error handling and logging

### Documentation Updates
- ✅ Updated README with Gemini configuration instructions
- ✅ Added performance comparison (Ollama vs Gemini)
- ✅ Added troubleshooting guide for Gemini issues
- ✅ Added testing instructions for backup verification

### Testing Tools
- ✅ Created `test_gemini_backup.py` - Automated test script

---

## 🔧 Quick Setup (3 Steps)

### Step 1: Install Dependencies
```bash
cd ai_service
pip install -r requirements.txt
```

**Note:** The requirements.txt now includes `google-generativeai==0.3.0`

### Step 2: Get Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key in new project"
3. Copy the API key

### Step 3: Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY = "paste-your-key-here"
```

**Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=paste-your-key-here
```

**Mac/Linux:**
```bash
export GEMINI_API_KEY="paste-your-key-here"
```

**Verify it's set:**
```bash
# PowerShell
echo $env:GEMINI_API_KEY

# Bash
echo $GEMINI_API_KEY
```

---

## ✅ Testing the Setup

### Test 1: Verify Configuration
```bash
python test_gemini_backup.py
```

Expected output:
```
✅ GEMINI_API_KEY is set
✅ Ollama is running
✅ AI Service is running
  Ollama: connected
  Gemini Backup: available
```

### Test 2: Health Check
```bash
curl http://localhost:8000/health | jq
```

Expected output shows both backends available:
```json
{
  "status": "healthy",
  "ollama": "connected",
  "gemini_backup": "available",
  "rag_enabled": true,
  "active_sessions": 0
}
```

### Test 3: Test Fallback (Optional)
To test the fallback mechanism, stop Ollama:

```bash
# Then make an evaluation request
curl -X POST http://localhost:8000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is Docker?",
    "user_answer": "Docker is a containerization platform",
    "ideal_points": ["Containers", "Isolation", "Deployment"]
  }'
```

You should see in logs:
```
❌ Ollama failed: Connection refused
⚠️ Falling back to Gemini API...
✅ Evaluation using Gemini API (backup)
```

---

## 📊 How It Works

### Priority Flow
```
┌─────────────────────────┐
│  Evaluation Request     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Try Ollama (Primary)   │ ← Fast, free, local
└────────────┬────────────┘
             │
      ❌ If fails
             │
             ▼
┌─────────────────────────┐
│ Try Gemini API (Backup) │ ← Reliable, cloud-based
└────────────┬────────────┘
             │
      ❌ If fails
             │
             ▼
┌─────────────────────────┐
│  Return Error (503)     │ ← No backends available
└─────────────────────────┘
```

### Performance Comparison

| Aspect | Ollama | Gemini |
|--------|--------|--------|
| Speed | 2-5s | 5-10s |
| Cost | Free | Free (60 req/min) |
| Location | Your machine | Google servers |
| Reliability | Depends on hardware | 99.9% SLA |
| Privacy | Data stays local | Sent to Google |

---

## ⚙️ Configuration Options

### Option A: Ollama Only (Default)
Simply don't set `GEMINI_API_KEY`. Service works when Ollama is running, fails when it's down.

```bash
# Service will show:
"gemini_backup": "not available"
```

### Option B: Ollama + Gemini Backup (Recommended)
Set `GEMINI_API_KEY` for automatic failover.

```bash
$env:GEMINI_API_KEY = "your-api-key"

# Service will show:
"gemini_backup": "available"
```

When Ollama is down, requests automatically use Gemini with no error thrown.

---

## 🐛 Troubleshooting

### Q: "Gemini API key not provided"
**A:** Set the `GEMINI_API_KEY` environment variable:
```powershell
$env:GEMINI_API_KEY = "your-key"
```

### Q: Health check shows "gemini_backup: not available"
**A:** 
1. Check if package is installed: `pip list | findstr google-generativeai`
2. If not: `pip install google-generativeai==0.3.0`
3. Restart the service

### Q: Gemini evaluation returns error
**A:**
1. Verify API key is valid: Visit https://aistudio.google.com/app/apikey
2. Check rate limit: Free tier has 60 requests/minute
3. Verify internet connection for cloud fallback

### Q: Why is fallback not working?
**A:** Check startup logs. Service prints messages like:
```
✅ Gemini API configured successfully (backup available)
```
or
```
⚠️ Gemini API key not provided (set GEMINI_API_KEY env var)
```

---

## 📋 Files Changed

### Modified Files
- `requirements.txt` - Added google-generativeai
- `app.py` - Added Gemini integration and fallback logic
- `README.md` - Comprehensive documentation

### New Files
- `test_gemini_backup.py` - Automated testing script
- `GEMINI_SETUP.md` - This guide

---

## 🎯 What's Next

1. **Set your API key** (3 min)
2. **Run test script** (1 min)
3. **Verify health endpoint** (1 min)
4. **Optionally test fallback** (2 min)

**Total setup time: ~7 minutes**

---

## 📚 Additional Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [MockMate AI Service README](README.md)
- [Google AI Studio](https://aistudio.google.com)

---

## ✨ Summary

Your MockMate AI Service now has:
- ✅ **Primary backend**: Local Ollama (fast, free)
- ✅ **Backup backend**: Google Gemini (reliable, cloud)
- ✅ **Automatic failover**: No manual intervention needed
- ✅ **Transparent status**: Health endpoint shows which is active
- ✅ **Comprehensive logging**: Detailed messages for debugging

**Result**: Production-grade reliability for interview evaluations! 🚀
