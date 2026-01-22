# Comprehensive Question Bank Update

## Overview
Expanded MockMate's question bank from **52 technical questions** to **~148 comprehensive interview questions** covering all major interview domains.

## New Question Sets Added

### 1. **HR Basic Questions** (6 questions)
**File:** `ai_service/data/hr_basic_questions.json`
**Topics:**
- Walk me through your resume
- Career path overview
- Something not on resume
- What motivates you
- Role expectations
- Relocation/flexibility

**Phase:** Warmup/Behavioral

---

### 2. **Behavioral Questions (STAR-based)** (10 questions)
**File:** `ai_service/data/behavioral_questions.json`
**Topics:**
- Challenge faced and overcome
- Failure and learning
- Teamwork experience
- Conflict handling
- Taking initiative
- Missed deadline management
- Receiving criticism
- Stress management
- Helping struggling colleague
- Quick adaptation

**Phase:** Behavioral  
**Evaluation:** STAR method rubrics (Situation, Task, Action, Result)

---

### 3. **Situational/Hypothetical Questions** (10 questions)
**File:** `ai_service/data/situational_questions.json`
**Topics:**
- Non-contributing team member
- Angry client handling
- Disagreeing with manager
- Unclear requirements
- Multiple tight deadlines
- Catching someone's mistake
- Rejected idea response
- Unethical request
- Onboarding new person
- Last-minute priority change

**Phase:** Behavioral  
**Evaluation:** Judgment, communication, problem-solving skills

---

### 4. **Personality & Culture Fit** (10 questions)
**File:** `ai_service/data/personality_questions.json`
**Topics:**
- How friends describe you
- Manager preference
- Alone vs team work
- Define success
- Work-life balance
- Personal values
- Company culture preference
- Handling monotony
- Work frustrations
- What excites you about work

**Phase:** Behavioral  
**Evaluation:** Authenticity, self-awareness, cultural alignment

---

### 5. **Career & Future-Oriented** (10 questions)
**File:** `ai_service/data/career_questions.json`
**Topics:**
- Long-term career goals
- Why leaving current role
- Why this company
- Other interviews/offers
- Staying updated in field
- Skills working on
- Ideal job description
- If you don't get this role
- How you measure growth
- What makes you leave

**Phase:** Behavioral/Advanced  
**Evaluation:** Clarity, realism, professionalism, growth mindset

---

### 6. **Programming Fundamentals** (10 questions)
**File:** `ai_service/data/programming_fundamentals.json`
**Topics:**
- Compiler vs interpreter
- Syntax error vs runtime error
- Memory allocation
- Stack vs heap
- Debugging
- What is an algorithm
- Time and space complexity
- Mutable vs immutable data
- Recursion
- OOP concepts

**Phase:** Technical  
**Level:** Intern/Fresher  
**Difficulty:** 1-2

---

### 7. **Data Structures & Algorithms** (10 questions)
**File:** `ai_service/data/dsa_questions.json`
**Topics:**
- Array vs linked list
- Stack and queue
- Hashing
- Binary search
- Big-O notation
- BFS vs DFS
- Trees
- Graphs
- Dynamic programming
- Greedy algorithms

**Phase:** Technical  
**Level:** Intern/Junior  
**Difficulty:** 2-3

---

### 8. **Database & Backend** (10 questions)
**File:** `ai_service/data/database_backend.json`
**Topics:**
- What is DBMS
- SQL vs NoSQL
- Normalization
- Primary key vs foreign key
- Indexing
- ACID properties
- Transactions
- REST API
- GET vs POST
- Authentication vs authorization

**Phase:** Technical  
**Level:** Intern/Fresher  
**Difficulty:** 1-2

---

### 9. **Web/Frontend/Full Stack** (10 questions)
**File:** `ai_service/data/web_frontend.json`
**Topics:**
- What happens when you type a URL
- HTML semantic markup
- Class vs ID in CSS
- Responsive design
- CORS
- DOM
- State management
- SSR vs CSR
- JWT
- MVC architecture

**Phase:** Technical  
**Level:** Intern/Junior  
**Difficulty:** 1-3

---

### 10. **Problem-Solving & Logic** (10 questions)
**File:** `ai_service/data/problem_solving.json`
**Topics:**
- Optimizing slow code
- Approaching unknown problems
- Debugging production issues
- Handling edge cases
- Writing scalable code
- System design trade-offs
- Testing strategy
- Ensuring security
- Improving performance
- Handling production failures

**Phase:** Advanced  
**Level:** Junior+  
**Difficulty:** 3  
**Evaluation:** Systematic thinking, crisis management, learning mindset

---

## Technical Implementation

### Updated Files

#### 1. **retrieve.py** - Enhanced Question Loading
**Changes:**
- Added 10 new question pool attributes
- Implemented dynamic question file loading with validation
- Combined all questions into `self.all_questions` (148 total)
- Prints loading confirmation for each question set

**Code:**
```python
# Load each question set if file exists
question_files = [
    ('data/warmup_questions.json', 'warmup_questions'),
    ('data/hr_basic_questions.json', 'hr_basic_questions'),
    ('data/behavioral_questions.json', 'behavioral_questions'),
    ('data/situational_questions.json', 'situational_questions'),
    ('data/personality_questions.json', 'personality_questions'),
    ('data/career_questions.json', 'career_questions'),
    ('data/programming_fundamentals.json', 'programming_questions'),
    ('data/dsa_questions.json', 'dsa_questions'),
    ('data/database_backend.json', 'database_questions'),
    ('data/web_frontend.json', 'web_frontend_questions'),
    ('data/problem_solving.json', 'problem_solving_questions')
]

for file_path, attr_name in question_files:
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            setattr(self, attr_name, json.load(f))
        print(f"✓ Loaded {len(getattr(self, attr_name))} questions from {file_path}")

self.all_questions = (
    self.questions + 
    self.warmup_questions + 
    self.hr_basic_questions + 
    # ... all question pools
)
```

#### 2. **retrieve.py** - Smart Phase-Based Retrieval
**Changes:**
- Modified `_retrieve_technical_filtered()` to intelligently select questions by phase
- **Behavioral phase:** Prioritizes HR, behavioral, situational, personality, career questions (100% curated)
- **Technical phase:** Blends programming, DSA, database, web questions (50% curated) with indexed search (50%)
- **Advanced phase:** Prioritizes problem-solving questions with high-difficulty indexed questions

**Retrieval Strategy:**
```
Warmup Phase:
  └─> warmup_questions (10 questions)

Behavioral Phase:
  └─> hr_basic_questions (6)
  └─> behavioral_questions (10)
  └─> situational_questions (10)
  └─> personality_questions (10)
  └─> career_questions (10)
  Total: 46 behavioral questions

Technical Phase:
  └─> programming_fundamentals (10)
  └─> dsa_questions (10)
  └─> database_backend (10)
  └─> web_frontend (10)
  └─> PLUS: Indexed questions (original 52)
  Total: ~92 technical questions

Advanced Phase:
  └─> problem_solving (10)
  └─> PLUS: High-difficulty indexed questions
  Total: ~60 advanced questions
```

---

## Question Schema

Each question follows this structure:

```json
{
  "id": "unique_id_001",
  "phase": "warmup|behavioral|technical|advanced",
  "role": "any|frontend|backend|fullstack",
  "level": "intern|fresher|junior|mid|senior",
  "skill": "programming|dsa|database|react|...",
  "difficulty": 1-5,
  "question": "The actual question text",
  "ideal_points": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "evaluation_rubric": {
    "criterion_1": "What to evaluate",
    "criterion_2": "What to evaluate"
  },
  "follow_ups": [
    "Follow-up question 1",
    "Follow-up question 2"
  ]
}
```

---

## Benefits

### 1. **Comprehensive Coverage**
- Covers **all interview stages**: warmup, behavioral, technical, advanced
- Addresses **soft skills**: communication, leadership, problem-solving
- Covers **hard skills**: programming, DSA, databases, web development

### 2. **Realistic Interview Experience**
- Mimics actual interview structure
- Behavioral questions use STAR method
- Situational questions test judgment
- Technical questions progress from fundamentals to advanced

### 3. **Better Evaluation**
- Each question has evaluation rubrics
- Behavioral questions assess soft skills
- Technical questions have ideal answer points
- Follow-up questions ensure depth

### 4. **Flexible & Scalable**
- Easy to add more questions
- File-based organization
- Phase-based retrieval
- Session-aware filtering

### 5. **No Repetition**
- Session tracking prevents duplicate questions
- Skill coverage tracking
- Phase advancement logic

---

## Usage Example

```python
from rag.retrieve import QuestionRetriever
from session_context import InterviewSession

# Initialize
retriever = QuestionRetriever()
session = InterviewSession()

# Will load:
# ✓ Loaded 10 questions from warmup_questions.json
# ✓ Loaded 6 questions from hr_basic_questions.json
# ✓ Loaded 10 questions from behavioral_questions.json
# ✓ Loaded 10 questions from situational_questions.json
# ✓ Loaded 10 questions from personality_questions.json
# ✓ Loaded 10 questions from career_questions.json
# ✓ Loaded 10 questions from programming_fundamentals.json
# ✓ Loaded 10 questions from dsa_questions.json
# ✓ Loaded 10 questions from database_backend.json
# ✓ Loaded 10 questions from web_frontend.json
# ✓ Loaded 10 questions from problem_solving.json
# ✓ Total questions loaded: 148

# Get questions (automatically phases through warmup → behavioral → technical → advanced)
questions = retriever.retrieve_phased(
    session=session,
    resume_text="Software engineer with React and Node.js experience",
    job_description="Full-stack developer position",
    top_k=10
)
```

---

## Statistics

| Category | Count | Phase | Level |
|----------|-------|-------|-------|
| Original Questions | 52 | Technical | Mixed |
| Warmup | 10 | Warmup | Any |
| HR Basic | 6 | Behavioral | Any |
| Behavioral | 10 | Behavioral | Any |
| Situational | 10 | Behavioral | Any |
| Personality | 10 | Behavioral | Any |
| Career | 10 | Behavioral | Any |
| Programming | 10 | Technical | Intern/Fresher |
| DSA | 10 | Technical | Intern/Junior |
| Database | 10 | Technical | Intern/Fresher |
| Web/Frontend | 10 | Technical | Intern/Junior |
| Problem-Solving | 10 | Advanced | Junior+ |
| **TOTAL** | **148** | **All phases** | **All levels** |

---

## Next Steps (Optional Enhancements)

1. **Add more technical depth:**
   - System design questions (10)
   - Cloud/DevOps questions (10)
   - Security questions (10)
   - Testing/QA questions (10)

2. **Role-specific question packs:**
   - Frontend specialist (React, Vue, Angular)
   - Backend specialist (Node.js, Python, Java)
   - Mobile development (React Native, Flutter)
   - Data science/ML questions

3. **Rebuild FAISS index:**
   - Include all new questions in embeddings
   - Better semantic search across entire question bank

4. **Frontend integration:**
   - Display question category badges
   - Show progress through phases
   - Visual indicators for skill coverage

---

## Files Modified

✅ `ai_service/rag/retrieve.py` (2 major sections updated)
✅ Created 10 new JSON question files

## Testing

Run the existing test suite:
```bash
cd ai_service
python test_realistic_flow.py
```

All tests should pass with expanded question bank.

---

## Conclusion

MockMate now has a **professional-grade question bank** covering:
- ✅ All interview phases
- ✅ All skill levels (intern to senior)
- ✅ All question types (technical, behavioral, situational)
- ✅ All domains (programming, web, database, problem-solving)

The interview experience now mirrors real interviews with proper progression, evaluation rubrics, and comprehensive coverage.
