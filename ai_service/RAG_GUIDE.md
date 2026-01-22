# Phase 4 & 5: RAG Infrastructure + Question Dataset

## What's Here

This directory contains the foundation for the Retrieval-Augmented Generation (RAG) system.

### Directory Structure

```
ai_service/
├── data/
│   ├── questions.json       # Structured question bank ✅ STARTER SET
│   ├── taxonomy.json        # Role/skill/level definitions ✅
│   └── embeddings.index     # FAISS vector index (generated)
│
├── rag/
│   ├── embeddings.py        # Create embeddings & build index ✅
│   └── retrieve.py          # Search & filter questions ✅
```

---

## Phase 4: RAG Infrastructure (READY TO USE)

### 1. Build Embeddings Index

```bash
cd ai_service
python rag/embeddings.py
```

This creates:
- `data/embeddings.index` - FAISS vector search index
- `data/embeddings_questions.json` - Question metadata

### 2. Test Retrieval

```bash
python rag/retrieve.py
```

Should output 5 relevant questions based on sample query.

### 3. Dependencies (add to requirements.txt)

```txt
sentence-transformers==2.2.2
faiss-cpu==1.7.4
numpy==1.24.3
```

Install:
```bash
pip install sentence-transformers faiss-cpu numpy
```

---

## Phase 5: Question Dataset (STARTER INCLUDED)

### Current Dataset

`data/questions.json` contains **6 starter questions**:
- Frontend (React): 2 questions
- Backend (Node.js): 1 question
- Data (SQL): 1 question
- DSA: 1 question
- Behavioral: 1 question

### Schema

Each question:
```json
{
  "id": "fe_react_001",
  "role": "frontend",
  "level": "intern",
  "skill": "react",
  "difficulty": 1,
  "question": "What is React and why is it popular?",
  "ideal_points": [
    "Component-based architecture",
    "Virtual DOM for performance",
    ...
  ],
  "follow_ups": [
    "Can you explain the Virtual DOM?",
    ...
  ]
}
```

### Taxonomy

`data/taxonomy.json` defines:
- **Roles**: frontend, backend, fullstack, mobile, data, ml_engineer, devops, product, business
- **Levels**: intern, fresher, junior, mid, senior, staff
- **Skills**: Technical, frontend, backend, data, behavioral skills
- **Difficulty**: 1 (basic) → 5 (advanced)

---

## How RAG Works in MockMate

### Current Flow (Gemini-only):
```
User inputs resume/JD
    ↓
Gemini generates random questions
    ↓
User answers
    ↓
Gemini evaluates
```

### New Flow (RAG):
```
User inputs resume/JD
    ↓
Extract metadata (role, level, skills) ← rag/retrieve.py
    ↓
Semantic search in question bank ← rag/embeddings.py
    ↓
Retrieve top-K relevant questions
    ↓
(Optional) LLM adapts wording
    ↓
User answers
    ↓
Evaluate with ideal_points as context ← app.py
```

---

## Expanding the Dataset

### Method 1: Manual Curation (Quality)

Add questions to `questions.json` following the schema.

**Target: 200-500 high-quality questions**

Sources:
- GitHub interview repos
- LeetCode discussions
- Your own experience
- Team contributions

### Method 2: Scraping (Scale)

```python
# Example structure for scraper
import requests
from bs4 import BeautifulSoup

def scrape_interview_questions(url):
    # Fetch HTML
    # Extract question + answer
    # Tag with role/level/skill
    # Save to questions.json
    pass
```

**Target: 1000+ questions**

### Method 3: LLM Augmentation (Variety)

Use Ollama OFFLINE to generate variations:

```python
# Generate variations of existing questions
for question in questions:
    prompt = f"""
    Rephrase this interview question in 3 different ways:
    {question['question']}
    
    Keep the core concept the same.
    """
    variations = ollama.generate(prompt)
    # Add to dataset with same metadata
```

**Target: 3x multiplication of base set**

---

## Integration with Backend

### Phase 4.1: Add `/generate-questions` Endpoint

In `ai_service/app.py`:

```python
from rag.retrieve import QuestionRetriever, extract_metadata

retriever = QuestionRetriever()

@app.post("/generate-questions")
async def generate_questions(req: GenerateRequest):
    # Extract metadata from resume/JD
    metadata = extract_metadata(req.resume_text, req.job_description)
    
    # Retrieve relevant questions
    questions = retriever.retrieve(
        resume_text=req.resume_text,
        job_description=req.job_description,
        role=metadata.get('role'),
        level=metadata.get('level'),
        top_k=10
    )
    
    # Return questions with ideal_points
    return {"questions": questions}
```

### Phase 4.2: Update server/index.js

Replace Gemini generation with RAG:

```javascript
// In /api/generate-qa
const aiResponse = await fetch(`${AI_SERVICE_URL}/generate-questions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resume_text: resumeText,
    job_description: jobDescription
  })
});

const { questions } = await aiResponse.json();

// Format for frontend
const qaPairs = questions.map(q => ({
  question: q.question,
  direction: q.ideal_points.join('. '),
  answer: `Expected to cover: ${q.ideal_points.join(', ')}`
}));
```

---

## Testing RAG

### 1. Build Index
```bash
python rag/embeddings.py
```

### 2. Test Retrieval
```bash
python rag/retrieve.py
```

### 3. Test via API (once integrated)
```bash
curl -X POST http://localhost:8000/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Software engineer with React and Node.js",
    "job_description": "Full-stack developer"
  }'
```

---

## Metrics to Track

Once RAG is live:
- **Relevance**: Do users find questions relevant?
- **Coverage**: Are all roles/skills represented?
- **Difficulty**: Does difficulty match user level?
- **Diversity**: Are questions varied enough?

Add feedback buttons in UI:
- 👍 Relevant
- 👎 Not relevant
- 🔄 Generate different question

---

## Roadmap

### ✅ Phase 4.0: Infrastructure Ready
- [x] embeddings.py
- [x] retrieve.py
- [x] questions.json (starter)
- [x] taxonomy.json

### 🚧 Phase 4.1: Integration
- [ ] Add `/generate-questions` endpoint to app.py
- [ ] Update server to call ai_service for generation
- [ ] Pass ideal_points to evaluation

### 🚧 Phase 4.2: Dataset Expansion
- [ ] Scrape/curate 200+ questions
- [ ] Cover all roles in taxonomy
- [ ] Add difficulty progression

### 🚧 Phase 4.3: Advanced Features
- [ ] Hybrid search (semantic + keyword)
- [ ] Question difficulty adaptation
- [ ] User feedback loop
- [ ] Dynamic follow-up generation

---

## Benefits of This Approach

### vs Gemini Generation:
- ✅ **Consistent quality** - Curated questions, not random generation
- ✅ **Predictable behavior** - No hallucination, no weird prompts
- ✅ **Fast** - Vector search is <100ms
- ✅ **Offline-capable** - No API dependency
- ✅ **Cost-free** - No per-request charges
- ✅ **Debuggable** - See exactly which questions were retrieved

### Keeps LLM for:
- ✅ **Evaluation** - Still valuable for feedback
- ✅ **Adaptation** - Minor rephrasing (optional)
- ✅ **Follow-ups** - Generate dynamic follow-up questions

---

## Next Steps (for you)

1. **Install dependencies**:
   ```bash
   pip install sentence-transformers faiss-cpu numpy
   ```

2. **Build index**:
   ```bash
   python rag/embeddings.py
   ```

3. **Test retrieval**:
   ```bash
   python rag/retrieve.py
   ```

4. **Integrate into app.py** (Phase 4.1)

5. **Start expanding questions.json** (Phase 5)

---

**Status**: ✅ Phase 4 & 5 infrastructure is READY  
**Action Required**: Build index, test, integrate

---

**Made with 🔍 for MockMate RAG**
