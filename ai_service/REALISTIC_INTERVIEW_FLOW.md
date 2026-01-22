# Realistic Interview Flow System

## Overview

MockMate now simulates how **real interviews** work, not random technical quizzing. The system implements phased questioning, context-aware evaluation, and intelligent follow-ups to create an authentic interview experience.

## Key Problems Fixed

### 1. ❌ Before: Random Questions
- Questions appeared in no particular order
- Technical questions before basic intro
- Same questions could repeat
- No connection between questions

### 2. ✅ Now: Human Interview Flow
- **Warmup phase** (always first)
- **Progressive difficulty**
- **Context-aware questioning**
- **No repetition**
- **Follow-up questions** based on answers

---

## How Real Interviews Work (Now Implemented)

### Phase A: Warmup (Non-negotiable, Always First)

Every real interview starts with these questions:

1. **Introduce yourself**
2. **Tell me about your educational background**
3. **Where are you from?**
4. **Why did you choose this field?**
5. **What do you know about our company?**
6. **Why are you interested in this role?**

**Purpose:**
- Reduce nervousness
- Calibrate communication skills
- Give context for everything else

### Phase B: Behavioral/Technical (Adaptive)

After warmup, questions adapt based on:
- Resume skills
- Job description
- Mentioned topics
- Phase progress

### Phase C: Advanced (If Applicable)

System design, architecture, optimization questions for senior roles.

---

## System Architecture

### 1. Session Context Manager (`session_context.py`)

Tracks interview state throughout the session:

```python
from session_context import InterviewSession

session = InterviewSession()

# Set user context
session.set_user_context(
    skills=["React", "Node.js", "MongoDB"],
    education="B.Tech CSE",
    projects=["MockMate", "ChatApp"],
    experience_level="intern",
    target_role="Frontend Intern"
)

# Track questions
session.mark_question_asked("warmup_001")
session.mark_question_answered("warmup_001", answer, score=7)

# Track skills
session.mark_skill_covered("React")
print(session.get_uncovered_skills())  # ["Node.js", "MongoDB"]

# Track mentioned topics (for follow-ups)
session.add_mentioned_topic("projects", "MockMate")
```

**Session State:**
- `asked_questions`: Set of question IDs already used
- `answered_questions`: Dict with answers and scores
- `covered_skills`: Skills that have been evaluated
- `mentioned_topics`: Topics from answers (for follow-ups)
- `current_phase`: warmup → behavioral → technical → advanced

### 2. Phased Question Retrieval (`rag/retrieve.py`)

New `retrieve_phased()` method enforces interview flow:

```python
from rag.retrieve import QuestionRetriever

retriever = QuestionRetriever()

questions = retriever.retrieve_phased(
    session=session,
    resume_text=resume,
    job_description=jd,
    top_k=10
)
```

**Logic:**
1. Check current phase
2. If warmup not complete → return warmup questions
3. Prioritize uncovered skills
4. Filter out already-asked questions
5. Match difficulty to phase

### 3. Context-Aware Evaluation (`app.py`)

Evaluation now considers:
- **Resume context** (did they mention their projects?)
- **Evaluation rubrics** (specific criteria per question)
- **Missed opportunities** (what should they have said?)

Example for "Introduce yourself":

```json
{
  "evaluation_rubric": {
    "resume_mention": "Did they mention key items from their resume?",
    "role_relevance": "Did they frame intro towards the target role?",
    "confidence": "Was delivery clear and confident?",
    "missed_opportunities": [
      "Projects not mentioned",
      "Skills not highlighted",
      "Education details skipped"
    ]
  }
}
```

### 4. Follow-Up Questions

System generates contextual follow-ups based on answers:

```python
# After answering "Introduce yourself" and mentioning MockMate:
follow_ups = retriever.get_follow_up_questions(
    answered_question=question_obj,
    user_answer=answer,
    session=session
)

# Returns: "Tell me more about MockMate"
```

**Personalization:**
- `[mentioned project]` → "MockMate"
- `[mentioned field]` → "Frontend Development"
- `[mentioned degree]` → "B.Tech CSE"

---

## Interview Modes

### General Interview (Default)
- 5 warmup
- 7 behavioral
- 8 technical
- 5 advanced

### HR Round
- 6 warmup (extended intro phase)
- 12 behavioral
- 2 basic technical awareness

### Technical Round
- 2 warmup (brief intro)
- 15 technical (deep dive)
- 5 advanced (system design)

### Behavioral Round
- 3 warmup
- 15 behavioral (STAR method focus)

### Managerial Round
- 4 warmup
- 10 behavioral (leadership)
- 6 technical (strategic depth)

---

## API Endpoints

### Generate Questions with Phased Flow

```http
POST /api/generate-qa
{
  "resume": "...",
  "jobDescription": "...",
  "skills": ["React", "Node.js"],
  "education": "B.Tech CSE",
  "projects": ["MockMate"],
  "experience_level": "intern",
  "target_role": "Frontend Intern",
  "interview_mode": "hr",  // or "technical", "behavioral", etc.
  "session_id": "optional",
  "questionCount": 10
}
```

**Response:**
```json
{
  "qaPairs": [
    {
      "id": "warmup_001",
      "question": "Please introduce yourself.",
      "phase": "warmup",
      "ideal_points": [...],
      "follow_ups": [...]
    }
  ],
  "session_id": "session_0",
  "current_phase": "warmup",
  "statistics": {
    "total_asked": 5,
    "covered_skills": ["React"],
    "uncovered_skills": ["Node.js"]
  }
}
```

### Evaluate with Context

```http
POST /evaluate
{
  "question": "Please introduce yourself.",
  "user_answer": "I'm a CS student...",
  "ideal_points": [...],
  "question_id": "warmup_001",
  "session_id": "session_0",
  "resume_context": {
    "skills": ["React"],
    "projects": ["MockMate"],
    "education": "B.Tech CSE"
  }
}
```

**Response:**
```json
{
  "strengths": [...],
  "improvements": [...],
  "score": 7,
  "feedback": "...",
  "follow_ups": [
    {
      "id": "warmup_001_followup_0",
      "question": "Tell me more about MockMate",
      "is_follow_up": true
    }
  ],
  "missed_opportunities": [
    "Didn't mention React experience despite having it on resume"
  ]
}
```

### Session Management

```http
POST /api/session
{
  "action": "create"  // or "get", "delete"
}
```

### Get Interview Modes

```http
GET /api/interview-modes
```

---

## Question Schema

### Warmup Questions (`data/warmup_questions.json`)

```json
{
  "id": "warmup_001",
  "phase": "warmup",
  "question": "Please introduce yourself.",
  "ideal_points": [
    "Name and current status",
    "Educational background mentioned",
    "Relevant experience or projects"
  ],
  "evaluation_rubric": {
    "resume_mention": "Did they mention key items from their resume?",
    "role_relevance": "Did they frame intro towards the target role?",
    "missed_opportunities": [
      "Projects not mentioned",
      "Skills not highlighted"
    ]
  },
  "follow_ups": [
    "Tell me more about [mentioned project]",
    "What was your favorite course in [mentioned degree]?"
  ]
}
```

### Technical Questions (existing `questions.json`)

Already have `follow_ups` field:

```json
{
  "id": "fe_react_001",
  "skill": "react",
  "question": "What is React?",
  "ideal_points": [...],
  "follow_ups": [
    "Can you explain the Virtual DOM?",
    "What are React hooks?"
  ]
}
```

---

## Usage Examples

### Example 1: Start an HR Round

```python
# Backend automatically handles phasing

POST /api/generate-qa
{
  "interview_mode": "hr",
  "skills": ["React", "Communication"],
  "education": "B.Tech CSE",
  "target_role": "Frontend Intern"
}

# Returns:
# - 6 warmup questions first
# - Then behavioral questions
# - Minimal technical
```

### Example 2: Prevent Question Repetition

```python
# Session tracks asked questions automatically

# Request 1: Returns warmup_001, warmup_002, ...
# Request 2: Returns NEW questions, never repeats warmup_001

session.is_question_used("warmup_001")  # True
```

### Example 3: Skill-Aware Questioning

```python
# User has: React, Node, MongoDB

# System asks:
# 1. One React question → marks React as covered
# 2. One Node question → marks Node as covered
# 3. One MongoDB question → marks MongoDB as covered

# NOT: "What is React?" 3 times in different wording
```

### Example 4: Follow-Up Flow

```python
# Q1: "Introduce yourself"
# A1: "I built MockMate, a React project..."

# System detects:
session.add_mentioned_topic("projects", "MockMate")
session.add_mentioned_topic("technologies", "React")

# Next question (personalized):
# "Tell me more about MockMate"
# or
# "What challenges did you face with React?"
```

---

## Design Principles

### 1. Interviews are Progressive, Not Random
Real interviewers build on your answers. MockMate now does too.

### 2. Every Question Has Purpose
- Warmup: Build rapport, reduce nerves
- Behavioral: Judge soft skills, STAR method
- Technical: Assess depth, problem-solving
- Advanced: System thinking, trade-offs

### 3. Context Matters
Same answer scored differently based on:
- Resume skills (did they mention them?)
- Job requirements (is it relevant?)
- Experience level (what's expected?)

### 4. Repetition is Wasteful
Once a skill is covered → move to next skill.
Once a question is asked → never ask again.

### 5. Feedback Should Be Actionable
Not just: "Good answer"
But: "You mentioned React but didn't explain Virtual DOM, which was in your resume and a key concept"

---

## Migration Notes

### For Frontend Integration

Update your question fetch to include session context:

```javascript
const response = await fetch('/api/generate-qa', {
  method: 'POST',
  body: JSON.stringify({
    resume: userData.resume,
    jobDescription: userData.jd,
    skills: userData.skills,
    interview_mode: "general",  // New field
    session_id: sessionStorage.getItem('interview_session')  // New field
  })
});

// Store session ID for subsequent calls
sessionStorage.setItem('interview_session', data.session_id);
```

Update evaluation calls:

```javascript
const evalResponse = await fetch('/evaluate', {
  method: 'POST',
  body: JSON.stringify({
    question: currentQuestion.question,
    user_answer: answer,
    ideal_points: currentQuestion.ideal_points,
    question_id: currentQuestion.id,  // New field
    session_id: sessionStorage.getItem('interview_session'),  // New field
    resume_context: userData  // New field
  })
});

// Show follow-ups
if (evalResponse.follow_ups) {
  setFollowUpQuestions(evalResponse.follow_ups);
}

// Show missed opportunities
if (evalResponse.missed_opportunities) {
  showMissedOpportunities(evalResponse.missed_opportunities);
}
```

### Backward Compatibility

System gracefully handles missing fields:
- No `session_id` → creates new session
- No `question_id` → skips context-aware eval
- No `resume_context` → uses generic eval

---

## Testing

### Test Warmup Priority

```python
from session_context import InterviewSession
from rag.retrieve import QuestionRetriever

session = InterviewSession()
retriever = QuestionRetriever()

questions = retriever.retrieve_phased(session, "", "", top_k=10)

# First 5 should all be warmup
assert all(q["phase"] == "warmup" for q in questions[:5])
```

### Test No Repetition

```python
session = InterviewSession()

# Ask questions
questions1 = retriever.retrieve_phased(session, "", "", top_k=5)
for q in questions1:
    session.mark_question_asked(q["id"])

# Get more questions
questions2 = retriever.retrieve_phased(session, "", "", top_k=5)

# No overlap
ids1 = set(q["id"] for q in questions1)
ids2 = set(q["id"] for q in questions2)
assert ids1.isdisjoint(ids2)
```

### Test Skill Coverage

```python
session = InterviewSession()
session.set_user_context(skills=["React", "Node"])

# Ask questions
questions = retriever.retrieve_phased(session, "", "", top_k=10)

# Should cover both skills
for q in questions:
    if q.get("skill"):
        session.mark_skill_covered(q["skill"])

assert "React" in session.covered_skills or "react" in session.covered_skills
assert "Node" in session.covered_skills or "nodejs" in session.covered_skills
```

---

## What This Achieves

✅ **Realistic Flow**: Interviews feel like talking to a human, not a quiz bot

✅ **No Repetition**: Never asks same question twice

✅ **Context Awareness**: Evaluation considers resume and JD

✅ **Progressive Difficulty**: Warmup → Behavioral → Technical → Advanced

✅ **Follow-Up Questions**: Builds on what you say, like a real interviewer

✅ **Missed Opportunities**: Flags what you should have mentioned

✅ **Interview Modes**: HR/Technical/Behavioral rounds feel different

✅ **Skill Coverage**: Ensures all resume skills get evaluated

---

## Future Enhancements

1. **Persistent Sessions**: Save to database instead of in-memory
2. **Adaptive Difficulty**: Adjust question difficulty based on performance
3. **Multi-Round Interviews**: Series of sessions (HR → Technical → Managerial)
4. **Live Interview Mode**: Real-time voice/video with AI interviewer
5. **Interview Replay**: Review session with timestamped feedback

---

## Questions?

Read more:
- [session_context.py](session_context.py) - Session state management
- [rag/retrieve.py](rag/retrieve.py) - Phased retrieval logic
- [data/warmup_questions.json](data/warmup_questions.json) - Warmup question bank
- [app.py](app.py) - API endpoints and evaluation

The system is production-ready and backward-compatible. All changes are additive.
