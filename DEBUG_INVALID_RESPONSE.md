# 🔧 Debugging: "Invalid response format" Error

## Problem
Frontend shows error: `Invalid response format` when trying to fetch the first question.

```
GuidedMode.jsx:99 ❌ Fetch error: Error: Invalid response format
```

---

## Root Causes

### 1. **Questions Not Loaded (Most Likely)**
- Data files not found in correct location
- JSON parsing errors in question files
- STAGE_FILES pointing to non-existent files

### 2. **Gemini API Failing Silently**
- GEMINI_API_KEY missing or invalid
- API quota exceeded
- Network timeout

### 3. **Response Validation Failed**
- Backend throwing unhandled error
- Response structure doesn't match expected format

---

## Diagnostic Steps

### Step 1: Check Server Health
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "environment": {
    "hasGeminiKey": true,
    "dataDir": ".../ai_service/data",
    "dataLoaded": {
      "stages": 5,
      "totalQuestions": 22
    }
  }
}
```

**If fails:**
- ❌ Server not running → `npm start` in server directory
- ❌ Wrong port → Check VITE_API_BASE in frontend

---

### Step 2: Check Stage Data Loading
```bash
curl http://localhost:5000/api/debug/stages
```

**Expected Response:**
```json
{
  "stageInfo": {
    "introduction": {
      "fileCount": 3,
      "questionCount": 25,
      "expectedCount": 3
    },
    ...
  }
}
```

**If `questionCount: 0`:**
- ❌ Question files not found
- ❌ JSON parsing error in files
- ❌ Wrong DATA_DIR path

**Fix:**
```javascript
// In server/index.js line 299
const DATA_DIR = path.join(__dirname, '..', 'ai_service', 'data');
console.log('DATA_DIR:', DATA_DIR); // Add this to verify path
```

---

### Step 3: Test Question Generation
```bash
curl -X POST http://localhost:5000/api/debug/test-question \
  -H "Content-Type: application/json" \
  -d '{"questionIndex": 0}'
```

**Expected Response:**
```json
{
  "questionIndex": 0,
  "stage": "introduction",
  "questionsInStage": 25,
  "selectedQuestion": "Tell me about yourself...",
  "responseWillHave": {
    "success": true,
    "question": {
      "text": "...",
      "index": 0,
      "stage": "introduction"
    }
  }
}
```

**If error:**
- ❌ Stage loading failed
- ❌ Question selection failed
- ❌ Check server logs for exact error

---

### Step 4: Test Full Endpoint
```bash
curl -X POST http://localhost:5000/api/generate-qa \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "I am a software engineer with 3 years of experience",
    "jobDescription": "SDE Intern",
    "questionIndex": 0,
    "askedQuestions": []
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "stage": "introduction",
  "question": {
    "text": "Tell me about yourself...",
    "index": 0,
    "stage": "introduction"
  },
  "guidance": {
    "direction": "Focus on your professional journey...",
    "answer": "I am a software engineer...",
    "tips": [...]
  }
}
```

**If error:**
- Check server console for detailed error logs
- May include: stage loading error, Gemini API error, JSON parsing error

---

## Server Logs to Check

When you see "Invalid response format" error, check server console for:

### ✅ Good Logs (Question loaded successfully)
```
📤 Fetching question 0 of 22
📍 Current Stage: INTRODUCTION
📚 Stage questions loaded: 25 available
❓ Selected Question: Tell me about yourself...
👤 Resume Analysis:
   Skills: 5
🤖 Generating contextual answer...
✅ Contextual answer generated successfully
✅ Response ready to send to frontend
```

### ❌ Bad Logs (Something failed)
```
❌ Error determining stage: [error message]
❌ No questions found for stage: introduction
❌ Error loading stage questions: [error message]
❌ Could not select a question: [error message]
❌ Gemini API error: [error message]
```

---

## Common Fixes

### Fix 1: Wrong Data Directory
**Problem:** Data files not found
**Solution:**
```bash
# Verify files exist
ls -la server/../ai_service/data/
ls -la ai_service/data/

# If files are in different location, update line 299 of server/index.js
const DATA_DIR = path.join(__dirname, '..', 'ai_service', 'data');
```

### Fix 2: Missing Gemini API Key
**Problem:** `⚠️ Could not generate contextual answer`
**Solution:**
```bash
# Create .env file in server directory
echo "GEMINI_API_KEY=your_actual_api_key_here" > server/.env

# Restart server
npm start
```

### Fix 3: Question Files Have Wrong Format
**Problem:** `questionCount: 0` in debug/stages
**Solution:**
Check one question file:
```bash
cat ai_service/data/introductory_icebreaker.json | head -20
```

File should be either:
- Array of strings: `["Question 1", "Question 2", ...]`
- Array of objects: `[{"question": "Q1", ...}, ...]`
- Object with questions key: `{"questions": ["Q1", ...]}`

---

## Frontend Debugging

Add this to GuidedMode.jsx to see exact response:
```javascript
const data = await res.json();
console.log('Raw response:', JSON.stringify(data, null, 2)); // Log full response

if (!data.success || !data.question) {
  console.error('Response validation failed:', {
    hasSuccess: !!data.success,
    hasQuestion: !!data.question,
    hasText: !!data.question?.text,
    fullData: data
  });
  throw new Error('Invalid response format');
}
```

---

## Checklist

- [ ] `npm install` completed in both client and server directories
- [ ] `GEMINI_API_KEY=...` set in server/.env
- [ ] Question files exist: `ai_service/data/*.json`
- [ ] Server running: `npm start` in server directory
- [ ] `/api/health` returns 200 OK
- [ ] `/api/debug/stages` shows all stages with question counts > 0
- [ ] `/api/debug/test-question` returns valid response
- [ ] Full `/api/generate-qa` returns `success: true` and `question` object
- [ ] Frontend shows progress bar and question text

---

## Support Information

**If error persists after all checks:**

1. Check server logs for exact error message
2. Run: `curl http://localhost:5000/api/debug/stages` and share output
3. Check `.env` file has `GEMINI_API_KEY`
4. Verify `ai_service/data/` has question JSON files
5. Check browser console for full error details

Contact with:
- Server error message
- Debug endpoint responses
- .env file exists status
- Question file quantity and location
