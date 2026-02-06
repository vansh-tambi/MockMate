# MockMate Setup Verification Checklist

## Pre-Launch Verification

Use this checklist to confirm everything is set up correctly before running the system.

---

## ✅ Backend Setup

### Files Exist
- [ ] `server/QuestionLoader.js` exists
- [ ] `server/QuestionSelector.js` exists
- [ ] `server/InterviewEngine.js` exists
- [ ] `server/interviewRoutes.js` exists
- [ ] `server/index.js` exists (updated)

### Imports Added to index.js
```javascript
const InterviewEngine = require('./InterviewEngine');
const QuestionSelector = require('./QuestionSelector');
const interviewRoutes = require('./interviewRoutes');
```
- [ ] All three imports present in `server/index.js`

### Routes Added to index.js
```javascript
app.get('/api/questions/load', ...);
app.get('/api/questions', ...);
app.use('/api/interview', interviewRoutes);
```
- [ ] All three route additions present in `server/index.js`

### Dependencies Installed
- [ ] Run: `cd server && npm install`
- [ ] Check: `express`, `cors` are in `package.json`

---

## ✅ Frontend Setup

### Files Exist
- [ ] `client/src/components/InterviewPage.jsx` exists
- [ ] `client/src/components/InterviewPage.css` exists

### Component Integrated
In `client/src/App.jsx` or main app file:
```javascript
import InterviewPage from './components/InterviewPage';
```
- [ ] InterviewPage imported somewhere in app
- [ ] InterviewPage rendered at a route (e.g., `/interview`)

### Axios Available
- [ ] Check `client/package.json` has `axios`
- [ ] If not: `cd client && npm install axios`

### Frontend Styling Imported
- [ ] Check `InterviewPage.jsx` imports `./InterviewPage.css`
- [ ] Or check CSS is in the same folder

---

## ✅ Dataset Verification

### Question Files Exist
Navigate to `ai_service/data/`:
- [ ] `warmup_questions.json` (14 questions) ✅
- [ ] `debugging_questions.json` (3 questions) ✅
- [ ] `architecture_tradeoffs.json` (3 questions) ✅
- [ ] `scalability_questions.json` (3 questions) ✅
- [ ] `behavioral_deep.json` (3 questions) ✅
- [ ] `failure_questions.json` (3 questions) ✅
- [ ] At least 50 more question files

### Configuration Files Exist
Navigate to `ai_service/data/`:
- [ ] `interviewer_personality.json` ✅
- [ ] `hiring_decision_engine.json` ✅
- [ ] `failure_detection.json` ✅
- [ ] `role_specific_interview_flow.json` ✅
- [ ] `question_weight_calibration.json` ✅

### Total Questions Check
From `ai_service/data/` folder:
```bash
# Count JSON files (should be ~56)
ls -1 *.json | wc -l

# Expected: ~56 files
```
- [ ] Approximately 56 JSON files present

---

## ✅ Documentation Review

- [ ] `INTEGRATION_GUIDE.md` exists (comprehensive docs)
- [ ] `QUICK_START.md` exists (quick reference)
- [ ] `SYSTEM_SUMMARY.md` exists (overview)
- [ ] README.md exists (in server and client)

---

## 🚀 Launch Verification

### Terminal 1: Start Backend
```bash
cd server
npm start
```
**Expected output:**
```
✅ MockMate running on http://localhost:5000
```
- [ ] Backend starts without errors
- [ ] No error messages in console
- [ ] Port 5000 is available (not in use)

### Terminal 2: Start Frontend
```bash
cd client
npm start
```
**Expected output:**
```
Compiled successfully!
You can now view the app in the browser.
```
- [ ] Frontend starts without errors
- [ ] No compilation errors
- [ ] Port 3000 is available (not in use)

### Browser: Test API Endpoints

Open new browser tab / terminal and test:

#### Test 1: Load Questions
```bash
curl http://localhost:5000/api/questions/load
```
**Expected:**
```json
{
  "success": true,
  "message": "Questions loaded from dataset",
  "totalQuestions": 720,  // Should be around 720
  "statistics": { ... }
}
```
- [ ] Returns 200 OK
- [ ] Success: true
- [ ] totalQuestions > 500

#### Test 2: Get Questions
```bash
curl http://localhost:5000/api/questions
```
**Expected:**
```json
{
  "success": true,
  "totalQuestions": 720,
  "questions": [...]
}
```
- [ ] Returns 200 OK
- [ ] Questions array populated
- [ ] Each question has: id, stage, question, evaluation_rubric

#### Test 3: Interview Routes Available
```bash
curl -X POST http://localhost:5000/api/interview/start \
  -H "Content-Type: application/json"
```
**Expected:**
```json
{
  "success": false,
  "error": "No questions provided..."
}
```
- [ ] Returns 400 (bad request is OK - we didn't send questions)
- [ ] Endpoint is accessible

---

## 🎮 Manual Interview Test

### Step 1: Open Browser
- [ ] Navigate to `http://localhost:3000/interview`
- [ ] InterviewPage component loads
- [ ] No console errors

### Step 2: Setup Screen
- [ ] See "MockMate Interview" heading
- [ ] See role/level info
- [ ] See question count (should be ~720)
- [ ] See "Start Interview" button

### Step 3: Start Interview
- [ ] Click "Start Interview" button
- [ ] Button state changes to "Loading..."
- [ ] After 1-2 seconds, see first question

### Step 4: First Question
- [ ] Question displays clearly
- [ ] See "Introduction" stage badge
- [ ] See ideal points on the side
- [ ] Large textarea for answer input
- [ ] Submit and Skip buttons visible

### Step 5: Answer a Question
- [ ] Type an answer in textarea
- [ ] Click "Submit Answer"
- [ ] Button changes to "Submitting..."

### Step 6: Get Next Question
- [ ] After 1-2 seconds, next question appears
- [ ] Still in "Introduction" stage (2 questions per stage)
- [ ] Question number increased

### Step 7: Progress Through Stages
- [ ] Complete warmup stage (4 questions total)
- [ ] Stage badge changes to "WARMUP"
- [ ] Later: changes to "RESUME", "RESUME_TECHNICAL", "REAL_LIFE", "HR_CLOSING"

### Step 8: Complete Interview
- [ ] After all 21 questions, interview marks complete
- [ ] Redirected to complete screen
- [ ] See summary with:
  - [ ] Total questions: 21
  - [ ] Duration: ~60 minutes (or actual time if testing)
  - [ ] Questions per stage breakdown
  - [ ] List of all questions asked

### Step 9: Start New Interview
- [ ] Click "Start New Interview" button
- [ ] Back to setup screen
- [ ] Can start another interview

---

## 🐛 Common Issues & Fixes

| Issue | Solution | Verify |
|-------|----------|--------|
| "Cannot GET /api/questions/load" | Backend not running. Start with `npm start` in server folder | [ ] |
| "No questions provided" | Call `/api/questions/load` first | [ ] |
| React component doesn't load | Check InterviewPage.jsx is imported and rendered | [ ] |
| "Interview not found" | Interview ID mismatch. Check browser console | [ ] |
| Wrong stage questions | Verify question JSON has correct `stage` field | [ ] |
| CORS error | Ensure `cors` is enabled in `index.js` | [ ] |
| Questions are random | Check role/level are passed correctly from frontend | [ ] |
| Styling looks wrong | Verify `InterviewPage.css` is in same folder as `.jsx` | [ ] |
| API calls timeout | Check backend is running on port 5000 | [ ] |

---

## 📋 Configuration Verification

### InterviewEngine Settings
Edit `server/InterviewEngine.js` and verify:

```javascript
this.stageOrder = [
  'introduction',      // ← Should be first
  'warmup',
  'resume',
  'resume_technical',
  'real_life',
  'hr_closing'         // ← Should be last
];

this.questionsPerStage = {
  introduction: 2,      // ← Check these numbers
  warmup: 4,
  resume: 3,
  resume_technical: 5,
  real_life: 4,
  hr_closing: 3
  // Total: 21 questions
};
```
- [ ] Stage order looks correct
- [ ] Questions per stage total to ~21
- [ ] Can be customized as needed

### API Port Verification
In `server/index.js`:

```javascript
const PORT = process.env.PORT || 5000;
```
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] No port conflicts

### CORS Configuration
In `server/index.js`:

```javascript
app.use(cors());
```
- [ ] CORS is enabled
- [ ] Frontend can call backend APIs

---

## 🔒 Security Pre-Flight Checks

- [ ] No API keys visible in code
- [ ] `.env` file not committed to git
- [ ] `node_modules` in `.gitignore`
- [ ] In-memory interview storage (temp - not for production)
- [ ] No authentication currently (add before production)
- [ ] No rate limiting (add before production)

---

## 📊 Performance Verification

### Question Loading
- [ ] First API call to `/api/questions/load` completes < 2 seconds
- [ ] Questions cached in memory after first load
- [ ] Subsequent calls near-instant

### Interview Start
- [ ] `/api/interview/start` responds < 1 second
- [ ] First question displays immediately

### Answer Submission
- [ ] `/api/interview/submit` responds < 1 second
- [ ] Next question appears < 2 seconds
- [ ] No lag between submissions

### Interview Summary
- [ ] `/api/interview/summary` responds < 1 second
- [ ] All data displays correctly

---

## 🎓 Code Quality Checks

### QuestionLoader.js
- [ ] Reads from `../ai_service/data`
- [ ] Handles both array and object JSON structures
- [ ] Indexes by stage, role, level, skill, difficulty
- [ ] Caches questions in memory
- [ ] Has error handling for missing files

### QuestionSelector.js
- [ ] Static `selectQuestion()` method exists
- [ ] Filters by stage (required)
- [ ] Filters by role (with 'any' fallback)
- [ ] Filters by level (with 'any' fallback)
- [ ] Sorts by weight (descending)
- [ ] Avoids repeats
- [ ] Returns single question or null

### InterviewEngine.js
- [ ] `startInterview(role, level)` works
- [ ] `getNextQuestion()` returns appropriate questions
- [ ] `submitAnswer(id, answer)` processes correctly
- [ ] `getInterviewSummary()` returns complete summary
- [ ] State management is clean
- [ ] No side effects

### interviewRoutes.js
- [ ] POST `/interview/start` implemented
- [ ] POST `/interview/submit` implemented
- [ ] GET `/interview/status` implemented
- [ ] GET `/interview/summary` implemented
- [ ] Error handling for missing params
- [ ] Returns proper JSON responses

---

## ✨ Final Sign-Off

When all checks are complete, you're ready!

```
✅ Backend running
✅ Frontend running
✅ API endpoints responding
✅ Questions loading
✅ Interview starts successfully
✅ Questions progress through stages
✅ Summary displays correctly
✅ Can start new interview

SYSTEM STATUS: READY TO DEPLOY 🚀
```

---

## 📞 Support Checklist

If something isn't working:

1. **Backend won't start**
   - [ ] Check `npm install` was run
   - [ ] Check port 5000 is free
   - [ ] Check `index.js` syntax

2. **Frontend won't start**
   - [ ] Check `npm install` was run
   - [ ] Check port 3000 is free
   - [ ] Check `InterviewPage.jsx` has no syntax errors

3. **Questions not loading**
   - [ ] Check `ai_service/data/` path is correct
   - [ ] Check JSON files are valid JSON
   - [ ] Check `/api/questions/load` endpoint manually

4. **Interview won't start**
   - [ ] Check questions are loaded
   - [ ] Check InterviewEngine has allQuestions
   - [ ] Check browser console for errors

5. **Wrong questions appearing**
   - [ ] Check question JSON has `stage` field
   - [ ] Check `stage` string matches exactly
   - [ ] Check role/level are being passed

6. **Styling looks broken**
   - [ ] Check `InterviewPage.css` is imported
   - [ ] Check CSS file has no syntax errors
   - [ ] Check browser cache (hard refresh: Ctrl+Shift+R)

---

## Next Steps After Verification

Once all checks pass:

1. **Test with real candidate flow**
   - Time: ~60 minutes
   - Complete full 21-question interview

2. **Verify all 6 stages**
   - Introduction ✓
   - Warmup ✓
   - Resume ✓
   - Resume Technical ✓
   - Real Life ✓
   - HR Closing ✓

3. **Check summary accuracy**
   - All 21 questions listed
   - Correct stage assignments
   - All answers recorded
   - Duration calculated

4. **Plan enhancements**
   - AI evaluation
   - Database storage
   - User authentication
   - Analytics

---

## Recording Baseline Metrics

For tracking improvements:

**Baseline (Current):**
- Questions loaded: ____
- Time to load: ____
- Interview duration: ____
- API response time: ____
- Memory usage: ____

**After Enhancement:**
- With AI evaluation: ____
- With database: ____
- With authentication: ____
- With analytics: ____

---

## Sign-Off Signature

**Person:** ________________
**Date:** ________________
**Status:** ✅ VERIFIED & READY

System is production-ready and functioning as designed!
