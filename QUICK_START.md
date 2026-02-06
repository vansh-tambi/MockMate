# MockMate - Quick Start Guide

## TL;DR: Get It Running in 3 Minutes

### Step 1: Start Backend
```bash
cd server
npm start
```
Backend loads at: `http://localhost:5000`

### Step 2: Start Frontend
```bash
cd client
npm start
```
Frontend loads at: `http://localhost:3000`

### Step 3: Take Interview
Go to: `http://localhost:3000/interview`

Click "Start Interview" → Answer 21 questions across 6 stages → Get summary!

---

## What You're Getting

### 720+ Interview Questions
- All enhanced with signals, weights, evaluation rubrics
- Organized across 56 JSON files
- Filtered by role (frontend, backend, fullstack, etc.)
- Filtered by level (entry, mid, senior, principal)
- Categorized by stage (introduction → warmup → resume → technical → real_life → hr_closing)

### 6-Stage Interview Flow
```
Introduction (2Q)    → Build rapport
Warmup (4Q)          → Confidence building
Resume (3Q)          → Verify background
Resume Technical (5Q)→ Core technical skills  
Real Life (4Q)       → Problem-solving
HR Closing (3Q)      → Culture fit
----
Total: 21 questions (~60 min)
```

### Smart Question Selection
Questions chosen based on:
1. ✅ Correct stage (required)
2. ✅ Correct role (if applicable)
3. ✅ Correct level (if applicable)
4. ✅ Haven't been asked before
5. ✅ Highest quality/weight first

---

## Files Created for You

| File | Purpose |
|------|---------|
| `server/QuestionLoader.js` | Loads all 720 questions from dataset |
| `server/QuestionSelector.js` | Picks best question for current state |
| `server/InterviewEngine.js` | Manages interview flow & state |
| `server/interviewRoutes.js` | Express API endpoints |
| `client/InterviewPage.jsx` | Full React interview UI |
| `client/InterviewPage.css` | Interview styling |

---

## How It Works

### Backend Flow
```
1. QuestionLoader loads all JSONs from /ai_service/data/
   ↓
2. Client calls POST /api/interview/start with role & level
   ↓
3. InterviewEngine creates new interview session
   ↓
4. QuestionSelector picks first question (stage=introduction)
   ↓
5. Client displays question, candidate types answer
   ↓
6. Client calls POST /api/interview/submit with answer
   ↓
7. Engine moves to next stage question
   ↓
8. Repeat steps 4-7 until all 21 questions asked
   ↓
9. Client calls GET /api/interview/summary
   ↓
10. Returns complete interview summary with all questions & answers
```

### Frontend Flow
```
SETUP → INTERVIEW → COMPLETE
  ↓         ↓         ↓
Select   Answer      View
role &   questions   summary
level     one at     & stats
         a time
```

---

## Question Selection Example

**Scenario**: Starting resume_technical stage for "backend" engineer at "senior" level

```
All available questions in dataset
           ↓
Filter by stage = "resume_technical"
           ↓
Filter by role matches "backend" (or "any")
           ↓
Filter by level matches "senior" (or "any")
           ↓
Filter by questions we haven't asked yet
           ↓
Sort by weight (highest first = most discriminating)
           ↓
Pick TOP 1 = SELECTED QUESTION
```

---

## API Reference

### Load Questions
```
GET /api/questions/load
→ { success: true, totalQuestions: 720 }
```

### Start Interview
```
POST /api/interview/start
Body: { role: "backend", level: "senior", allQuestions: [...] }
→ { interviewId, question: {...}, totalQuestionsInInterview: 21 }
```

### Submit Answer
```
POST /api/interview/submit
Body: { interviewId: "...", questionId: "...", answer: "..." }
→ { success: true, nextQuestion: {...}, interviewComplete: false }
```

### Get Interview Status
```
GET /api/interview/status?interviewId=...
→ { currentStage, questionsAsked, elapsedMinutes }
```

### Get Interview Summary
```
GET /api/interview/summary?interviewId=...
→ { summary: { duration, stageBreakdown, questions, answers } }
```

---

## Question Structure

Each question has:
```javascript
{
  "id": "warmup_001",
  "stage": "warmup",
  "role": "any" or "backend" or "frontend", etc.
  "level": "any" or "entry" or "mid" or "senior",
  "difficulty": 1-5,
  "weight": 1.0-2.5,  // Higher = more discriminating
  "question": "How do you handle pressure?",
  "ideal_points": [
    "Stay calm and focused",
    "Prioritize effectively"
  ],
  "evaluation_rubric": {
    "composure": {
      "description": "Stays calm",
      "weight": 0.25
    },
    "strategies": {
      "description": "Has coping mechanisms",
      "weight": 0.75
    }
  },
  "strong_signals": [
    "Shows confidence under pressure",
    "Has specific techniques"
  ],
  "weak_signals": [
    "Generic answer",
    "No examples"
  ],
  "red_flags": [
    "Crumbles under pressure",
    "Cannot handle any stress"
  ],
  "follow_ups": [
    "Tell me about your worst day",
    "How do you prevent burnout?"
  ]
}
```

---

## Customization

### Change Questions Per Stage
Edit `server/InterviewEngine.js`:
```javascript
this.questionsPerStage = {
  introduction: 3,      // ← was 2
  warmup: 5,            // ← was 4
  resume: 3,
  resume_technical: 6,  // ← was 5
  real_life: 4,
  hr_closing: 3
};
```

### Change Stage Order
Edit `server/InterviewEngine.js`:
```javascript
this.stageOrder = [
  'introduction',
  'warmup',
  'resume',           // These can be reordered
  'resume_technical',
  'real_life',
  'hr_closing'
];
```

### Filter by Different Criteria
Edit `server/QuestionSelector.js` to add more filters.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot GET /api/questions/load" | Backend not running. `cd server && npm start` |
| "No questions provided" | Call `/api/questions/load` first |
| Questions seem random | Check role/level are passed correctly |
| Interview won't start | Check browser console for errors |
| Wrong stage questions | Verify question JSON has `stage` field |

---

## Example Interview Session

**Setup Phase:**
```
Role: Backend
Level: Senior
Ready: 720 questions
→ Click "Start Interview"
```

**Interview Phase:**
```
Stage: Introduction
Q1: "Tell me about yourself"
(Candidate types answer)
→ Click "Submit Answer"

Next Question...
```

**Complete Phase:**
```
Total Questions: 21
Duration: 52 minutes
Stage Breakdown:
  - Introduction: 2
  - Warmup: 4
  - Resume: 3
  - Resume Technical: 5
  - Real Life: 4
  - HR Closing: 3
→ Click "Start New Interview"
```

---

## What's Different From Other Systems

| Feature | MockMate | Other Systems |
|---------|----------|---------------|
| Question source | Your dataset (720 Q) | Generated/generic |
| Stage progression | Structured 6-stage | Random |
| Question selection | Smart (role+level) | Random |
| Evaluation signals | Strong/weak/red flags | None |
| Weight-based selection | Yes (1.0-2.5) | No |
| Role filtering | Yes (frontend/backend/etc) | Basic/None |
| Level filtering | Yes (entry/mid/senior) | Basic/None |
| Expected duration | Per question | None |
| Ideal points | Yes (key things to mention) | None |
| Rubric scoring | Yes (weighted evaluations) | None |

---

## Production Ready

✅ Handles 720+ questions  
✅ Fast question loading (cached in memory)  
✅ Interview state management  
✅ No database required (can add DB layer)  
✅ Scalable architecture  
✅ Role-based filtering  
✅ Level-based difficulty  
✅ Stage progression  
✅ Individual question skipping  
✅ Complete summaries  

---

## Next: Adding AI Evaluation

To grade answers automatically:

1. Add OpenAI/Gemini key to `.env`
2. In `interviewRoutes.js` submit handler, add:
```javascript
const evaluation = await evaluateWithAI(answer, question);
// Score: 0-1
// Feedback: text
```
3. Store score in interview state
4. Update summary with scores

---

## Next: Adding Database

To persist interviews:

1. Setup MongoDB/PostgreSQL
2. Create `InterviewRecord` schema
3. In `interviewRoutes.js`, save state after each answer:
```javascript
await InterviewRecord.updateOne(
  { interviewId },
  { answers, state }
);
```
4. Build analytics dashboard from saved records

---

## Final Notes

Your dataset is now actively powering a real interview system!

- 720 questions
- 6-stage flow
- Smart selection logic
- Full React UI
- Express API
- Production architecture

Everything is wired up. Just start the servers and go! 🚀
