# Quick Start: Realistic Interview Flow

## What Changed?

MockMate now simulates **real interview flow** instead of random questions. Interviews start with warmup, prevent repetition, and adapt based on your resume.

## For Developers

### 1. Install Dependencies

No new dependencies needed! The system uses existing packages.

### 2. Data Files

New warmup questions file created automatically:
- `ai_service/data/warmup_questions.json` ✅ 

### 3. Start the Service

```bash
cd ai_service
python app.py
```

The system will load:
```
✅ Loaded 45 technical questions
✅ Loaded 10 warmup questions
✅ RAG retriever loaded successfully
```

## For Frontend Integration

### Update Question Generation

**Before:**
```javascript
fetch('/api/generate-qa', {
  body: JSON.stringify({
    resume: resume,
    jobDescription: jd
  })
});
```

**After:**
```javascript
fetch('/api/generate-qa', {
  body: JSON.stringify({
    resume: resume,
    jobDescription: jd,
    skills: ["React", "Node.js"],  // Add this
    education: "B.Tech CSE",        // Add this
    projects: ["MockMate"],         // Add this
    interview_mode: "general",      // Add this (or "hr", "technical", etc.)
    session_id: localStorage.getItem('session_id')  // Add this
  })
});

// Save session ID
localStorage.setItem('session_id', response.session_id);
```

### Update Evaluation

**Before:**
```javascript
fetch('/evaluate', {
  body: JSON.stringify({
    question: q,
    user_answer: answer,
    ideal_points: points
  })
});
```

**After:**
```javascript
fetch('/evaluate', {
  body: JSON.stringify({
    question: q,
    user_answer: answer,
    ideal_points: points,
    question_id: currentQ.id,                        // Add this
    session_id: localStorage.getItem('session_id'), // Add this
    resume_context: {                                // Add this
      skills: ["React", "Node.js"],
      projects: ["MockMate"],
      education: "B.Tech CSE"
    }
  })
});

// Use follow-ups
if (response.follow_ups && response.follow_ups.length > 0) {
  console.log("Follow-up questions:", response.follow_ups);
  // Display follow-up questions to user
}

// Show missed opportunities
if (response.missed_opportunities) {
  console.log("Missed opportunities:", response.missed_opportunities);
  // Show what user should have mentioned
}
```

## Interview Flow

### What Users Will Experience

1. **Always starts with warmup** (5 questions):
   - "Introduce yourself"
   - "Tell me about your education"
   - "Why this field?"
   - "What do you know about our company?"
   - "Why this role?"

2. **Then adaptive questioning**:
   - Questions based on resume skills
   - No repetition (same question never asked twice)
   - Progressive difficulty

3. **Follow-up questions**:
   - "Tell me more about [project they mentioned]"
   - "What challenges did you face with [technology]?"

4. **Context-aware feedback**:
   - "You mentioned React but didn't explain Virtual DOM"
   - "Missed opportunity: You have MongoDB on your resume but didn't mention it"

## Interview Modes

### HR Round
Focus on behavioral and culture fit:
```javascript
interview_mode: "hr"
```

### Technical Round
Deep technical dive:
```javascript
interview_mode: "technical"
```

### Behavioral Round
STAR method, past experiences:
```javascript
interview_mode: "behavioral"
```

### Managerial Round
Leadership and strategy:
```javascript
interview_mode: "managerial"
```

## Testing

### Test Warmup Priority

Start an interview - first 5 questions should be warmup:

```bash
curl -X POST http://localhost:8000/api/generate-qa \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["React"],
    "education": "B.Tech",
    "interview_mode": "general",
    "questionCount": 10
  }'
```

Check response - first questions should have `"phase": "warmup"`.

### Test No Repetition

Request questions twice with same session_id:

```bash
# Request 1
curl -X POST http://localhost:8000/api/generate-qa \
  -d '{"session_id": "test_123", "questionCount": 5}'

# Request 2 - should give DIFFERENT questions
curl -X POST http://localhost:8000/api/generate-qa \
  -d '{"session_id": "test_123", "questionCount": 5}'
```

### Test Context-Aware Eval

Evaluate with resume context:

```bash
curl -X POST http://localhost:8000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Please introduce yourself",
    "user_answer": "I am a student",
    "ideal_points": ["Name", "Education", "Projects"],
    "question_id": "warmup_001",
    "resume_context": {
      "projects": ["MockMate"],
      "skills": ["React"]
    }
  }'
```

Should return `missed_opportunities` listing projects/skills not mentioned.

## Backward Compatibility

### Existing Calls Work

Old API calls without new fields still work:

```javascript
// This still works (creates new session automatically)
fetch('/api/generate-qa', {
  body: JSON.stringify({
    resume: resume,
    jobDescription: jd
  })
});
```

But you get:
- ❌ Questions may repeat
- ❌ No warmup priority
- ❌ No context-aware feedback
- ❌ No follow-ups

### Gradual Migration

You can migrate one feature at a time:

1. First: Add `session_id` → prevents repetition
2. Then: Add `skills`, `projects` → enables context-aware eval
3. Then: Add `interview_mode` → enables mode-specific flow
4. Finally: Use `follow_ups` and `missed_opportunities` in UI

## Common Issues

### "RAG retriever not available"

Make sure you've built the embeddings:

```bash
cd ai_service/rag
python embeddings.py
```

### "Warmup questions not found"

The file is created automatically, but check:

```bash
ls ai_service/data/warmup_questions.json
```

Should exist with 10 warmup questions.

### Session not persisting

Sessions are in-memory. If you restart the server, sessions are lost.

For production, implement persistent session storage (Redis/DB).

## Next Steps

1. **Update frontend components** to use new fields
2. **Add interview mode selector** in UI (HR/Technical/Behavioral)
3. **Display follow-up questions** after evaluation
4. **Show missed opportunities** as hints
5. **Add session statistics** dashboard

## Need Help?

- Read [REALISTIC_INTERVIEW_FLOW.md](REALISTIC_INTERVIEW_FLOW.md) for full docs
- Check `session_context.py` for session management
- Check `rag/retrieve.py` for retrieval logic
- Check `app.py` for API implementation

Everything is backward compatible. New features are opt-in via additional fields.
