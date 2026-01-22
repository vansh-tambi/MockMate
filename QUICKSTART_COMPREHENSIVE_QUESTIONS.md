# Quick Start: Using the Comprehensive Question Bank

## ✅ What Was Added

MockMate now has **158 total questions** (up from 52):

- **10 Warmup Questions** - Introduction, background, company knowledge
- **6 HR Basic Questions** - Resume walkthrough, career path, motivations
- **10 Behavioral Questions** - STAR-method scenarios (challenges, failures, teamwork)
- **10 Situational Questions** - Hypothetical scenarios (conflicts, deadlines, ethics)
- **10 Personality Questions** - Culture fit, work style preferences
- **10 Career Questions** - Goals, growth, company interest
- **10 Programming Fundamentals** - Compiler, memory, algorithms, OOP
- **10 DSA Questions** - Arrays, trees, graphs, Big-O, sorting
- **10 Database Questions** - SQL/NoSQL, ACID, normalization, REST APIs
- **10 Web/Frontend Questions** - DOM, CORS, responsive design, SSR/CSR
- **10 Problem-Solving Questions** - Debugging, optimization, scalability
- **52 Original Technical Questions** - React, Node.js, MongoDB, system design

---

## 🚀 How It Works

### Automatic Phase Progression

The system automatically progresses through interview phases:

```
Interview Flow:
┌─────────────────────────────────────────────────────────┐
│ WARMUP PHASE (5-10 questions)                           │
│ • Introduce yourself                                     │
│ • Educational background                                 │
│ • Why this company/role                                  │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ BEHAVIORAL PHASE (10-20 questions)                       │
│ • HR basics (resume, career path)                        │
│ • STAR behavioral (challenges, teamwork)                 │
│ • Situational (conflicts, deadlines)                     │
│ • Personality (culture fit)                              │
│ • Career goals                                           │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ TECHNICAL PHASE (15-30 questions)                        │
│ • Programming fundamentals                               │
│ • Data structures & algorithms                           │
│ • Database & backend                                     │
│ • Web/frontend                                           │
│ • Context-aware technical questions                      │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ ADVANCED PHASE (5-15 questions)                          │
│ • Problem-solving scenarios                              │
│ • System design                                          │
│ • High-difficulty technical                              │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 No Code Changes Required

The enhanced question bank works **automatically** with your existing code:

```python
# Your existing code works as-is!
from rag.retrieve import QuestionRetriever
from session_context import InterviewSession

retriever = QuestionRetriever()
session = InterviewSession()

# First call: Gets warmup questions
questions = retriever.retrieve_phased(
    session=session,
    resume_text="Software engineer with React experience",
    job_description="Full-stack developer",
    top_k=10
)
# Returns: warmup_001, warmup_002, warmup_003...

# After 5 warmup questions, automatically moves to behavioral
# Next call: Gets behavioral questions
questions = retriever.retrieve_phased(
    session=session,
    resume_text="Software engineer with React experience",
    job_description="Full-stack developer",
    top_k=10
)
# Returns: hr_basic_001, behavioral_001, situational_001...

# Continues automatically through technical → advanced phases
```

---

## 🔍 What Questions Are Available

### Example Warmup Questions
- "Please introduce yourself."
- "Tell me about your educational background."
- "What are your strengths and weaknesses?"
- "Why should we hire you?"

### Example Behavioral Questions (STAR Method)
- "Tell me about a challenge you faced at work or college."
- "Describe a failure and what you learned from it."
- "How do you handle conflicts?"
- "Tell me about taking initiative on a project."

### Example Situational Questions
- "What would you do if a team member isn't contributing?"
- "How would you handle an angry client?"
- "What if you disagree with your manager's decision?"

### Example Technical Questions
- "What is a compiler vs interpreter?"
- "Explain Big-O notation."
- "What's the difference between SQL and NoSQL?"
- "What happens when you type a URL in a browser?"
- "How do you optimize slow code?"

---

## 📊 Verification

To verify everything is loaded:

```python
from rag.retrieve import QuestionRetriever

r = QuestionRetriever()

# Output:
# ✓ Loaded 10 questions from data/warmup_questions.json
# ✓ Loaded 6 questions from data/hr_basic_questions.json
# ✓ Loaded 10 questions from data/behavioral_questions.json
# ✓ Loaded 10 questions from data/situational_questions.json
# ✓ Loaded 10 questions from data/personality_questions.json
# ✓ Loaded 10 questions from data/career_questions.json
# ✓ Loaded 10 questions from data/programming_fundamentals.json
# ✓ Loaded 10 questions from data/dsa_questions.json
# ✓ Loaded 10 questions from data/database_backend.json
# ✓ Loaded 10 questions from data/web_frontend.json
# ✓ Loaded 10 questions from data/problem_solving.json
# ✓ Total questions loaded: 158

print(f"Total questions: {len(r.all_questions)}")  # 158
```

---

## 🧪 Testing

Run the comprehensive test suite:

```bash
cd ai_service
python test_comprehensive_questions.py
```

Expected output:
```
✅ ALL TESTS PASSED!

The comprehensive question bank is working correctly:
  ✓ 158 total questions loaded
  ✓ All question categories present
  ✓ Phase-based retrieval working
  ✓ No question repetition
  ✓ All questions properly structured

🎉 MockMate is ready with comprehensive interview questions!
```

---

## 📂 File Structure

New question files in `ai_service/data/`:
```
ai_service/data/
├── warmup_questions.json          (10 questions)
├── hr_basic_questions.json        (6 questions)
├── behavioral_questions.json      (10 questions)
├── situational_questions.json     (10 questions)
├── personality_questions.json     (10 questions)
├── career_questions.json          (10 questions)
├── programming_fundamentals.json  (10 questions)
├── dsa_questions.json             (10 questions)
├── database_backend.json          (10 questions)
├── web_frontend.json              (10 questions)
└── problem_solving.json           (10 questions)
```

---

## 🎯 Key Features

### 1. **No Repetition**
Session tracking prevents asking the same question twice:
```python
session.mark_question_asked(question_id)
# Question will never appear again in this session
```

### 2. **Context-Aware**
Questions adapt to resume and job description:
```python
questions = retriever.retrieve_phased(
    session=session,
    resume_text="React developer with MongoDB experience",
    job_description="Full-stack role requiring Node.js"
)
# Prioritizes React, MongoDB, Node.js questions
```

### 3. **Evaluation Rubrics**
Every question has scoring criteria:
```json
{
  "evaluation_rubric": {
    "situation": "Clear context provided?",
    "task": "Defined responsibility?",
    "action": "Specific actions taken?",
    "result": "Measurable outcome?"
  }
}
```

### 4. **Follow-Up Questions**
Each question has contextual follow-ups:
```json
{
  "follow_ups": [
    "What would you do differently next time?",
    "How did this experience shape your approach?"
  ]
}
```

---

## 🛠️ Customization

Want to add more questions? Just create a new JSON file:

1. **Create file** in `ai_service/data/` (e.g., `cloud_questions.json`)

2. **Use the schema:**
```json
[
  {
    "id": "cloud_001",
    "phase": "technical",
    "role": "backend",
    "level": "junior",
    "skill": "cloud",
    "difficulty": 2,
    "question": "What is AWS Lambda?",
    "ideal_points": [
      "Serverless compute service",
      "Pay only for compute time",
      "Scales automatically"
    ],
    "follow_ups": [
      "When would you use Lambda vs EC2?",
      "What are cold starts?"
    ]
  }
]
```

3. **Update `retrieve.py`:**
```python
# In __init__ method, add to question_files list:
('data/cloud_questions.json', 'cloud_questions')

# In _retrieve_technical_filtered, add to technical phase:
if phase == "technical":
    phase_questions = (
        self.programming_questions +
        self.cloud_questions +  # Add here
        # ... other questions
    )
```

---

## 📈 Statistics

| Phase | Questions | Coverage |
|-------|-----------|----------|
| Warmup | 10 | General intro |
| Behavioral | 46 | HR, STAR, situational, personality, career |
| Technical | 92 | Programming, DSA, databases, web + indexed |
| Advanced | ~60 | Problem-solving + high-difficulty indexed |
| **Total** | **158** | **All interview domains** |

---

## 🚨 Troubleshooting

### Questions not loading?
Check console output:
```bash
python -c "from rag.retrieve import QuestionRetriever; QuestionRetriever()"
```

You should see:
```
✓ Loaded 10 questions from data/warmup_questions.json
✓ Loaded 6 questions from data/hr_basic_questions.json
# ... etc
```

### Only getting old questions?
Make sure you're using the latest `retrieve.py`:
```bash
cd ai_service
git diff rag/retrieve.py
```

### File encoding errors?
All JSON files must be UTF-8 encoded. Check your editor settings.

---

## ✅ Ready to Use!

The comprehensive question bank is now active. No additional setup required - just run your existing code and the enhanced questions will be used automatically!

```bash
# Start the service
cd ai_service
python app.py

# The API now uses all 158 questions automatically!
```

---

## 📚 Documentation

For more details, see:
- [COMPREHENSIVE_QUESTION_BANK.md](COMPREHENSIVE_QUESTION_BANK.md) - Full documentation
- [REALISTIC_INTERVIEW_FLOW.md](REALISTIC_INTERVIEW_FLOW.md) - Interview system design
- [test_comprehensive_questions.py](test_comprehensive_questions.py) - Test suite

🎉 **Congratulations! MockMate now has a production-ready interview question bank!**
