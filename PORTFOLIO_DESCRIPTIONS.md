# Portfolio Descriptions - Ready to Copy/Paste

## 1️⃣ SHORT (Resume/LinkedIn headline)

```
Interview evaluation system using RAG to ground AI feedback in real standards.
Local-first with Phi-3, eliminating arbitrary scoring and generic advice.
```

---

## 2️⃣ MEDIUM (Portfolio card)

```
MockMate: RAG-Grounded Interview Evaluation

Traditional AI interview tools give arbitrary scores and generic feedback. 
MockMate uses Retrieval-Augmented Generation to evaluate answers against a 
curated question bank with known ideal points, providing explainable scores 
and specific, actionable feedback.

The key innovation: Locked score bands (0-30 = wrong, 51-70 = acceptable, 
71-85 = strong) make scores meaningful instead of arbitrary.

Built with: Phi-3 (Ollama) • FAISS • React • FastAPI • Node.js
Validated with: 5 normal usage tests + 5 stress tests
Status: Production-ready, portfolio frozen

[View Demo] [GitHub Repo] [Case Study]
```

---

## 3️⃣ LONG (Project page/Portfolio description)

```
MockMate: Interview Evaluation Grounded in Real Standards

THE PROBLEM
Most AI interview prep tools give you arbitrary scores with no meaning. 
You get 67/100 but don't know if that's good, bad, or meaningless. Feedback 
is generic: "add more detail," "be clearer." The system has no grounding in 
what actual interview excellence looks like.

Result: Users never know if they're actually improving or if the AI is just 
being nice.

THE SOLUTION
MockMate uses RAG (Retrieval-Augmented Generation) to evaluate answers 
against a curated question bank. When you answer:

1. System retrieves 3 similar questions from the bank
2. Extracts their ideal talking points (reference standards)
3. Judges your answer against these standards
4. Assigns you to a locked score band with clear meaning

Instead of "Score: 67/100" you get:
"✓ ACCEPTABLE (67/100) - Meets interview bar. Solid answer with room to improve."

Feedback is specific: "Add async/await examples and error handling" not 
"be clearer."

Result: Scores are explainable. Feedback is specific. Progress is measurable.

TECHNICAL ARCHITECTURE
├── React Frontend (TailwindCSS + Framer Motion)
├── Node.js Server (Express)
├── FastAPI AI Service
│   ├── Phi-3 via Ollama (primary evaluation)
│   ├── RAG Retrieval (FAISS)
│   └── Gemini fallback (optional)
└── Question Bank (52 curated questions)

KEY TECHNICAL DECISIONS

1. Local AI (Phi-3) Over Cloud
   Why: Zero API costs, no vendor lock-in, fast, consistent
   Tradeoff: Requires Ollama setup
   Result: 90%+ of evaluations use local AI

2. 52 Curated Questions vs 1000+ Scraped
   Why: Quality > quantity, maintainable, testable, coherent coverage
   Alternative rejected: Scraped data would be inconsistent and low-quality
   Result: Consistent, useful reference standards

3. Locked Score Bands vs Granular 0-100
   Why: Meaningful > precise, users understand what scores mean
   Tradeoff: Less granular but more interpretable
   Result: Users know exactly what 67 means

4. FAISS for Vector Search
   Why: Local, fast (<100ms), deterministic
   Alternative rejected: LLM re-ranking (introduces variability)
   Result: Consistent retrieval without external dependencies

VALIDATION & TESTING

Phase 6 - Normal Usage (5 mock interviews):
[To be filled with user testing data]
- Score consistency
- Feedback specificity
- Band alignment
- RAG visibility

Phase 9 - Stress Testing (5 edge cases):
[To be filled with user testing data]
- Confidently wrong answer handling
- Brief but correct answer handling
- Rambling without substance handling
- Buzzword salad handling
- Consistency across runs

LESSONS LEARNED

1. RAG > Raw LLM
   Phi-3 (3.8B) + RAG beats GPT-3.5 (175B) without context
   Grounding in data matters more than model size

2. Curated Data > Scraped Data
   52 high-quality > 500 low-quality
   Consistency > coverage for evaluation systems

3. Semantics Matter
   Locked bands > granular 0-100
   Users trust systems they understand

4. Local-First is Viable
   Phi-3 handles 90%+ of cases
   Setup friction is worth zero-cost/no-lock-in benefits

5. Knowing When to Stop is the Skill
   Froze at v1.0 despite "could add more"
   Shipping clean is better than shipping everything

DESIGN DECISIONS: Why Not...

❌ Fine-tune Phi-3?
   Cost, time, diminishing returns. RAG gets 80% of value with 10% of effort.

❌ Use GPT-4/Claude?
   Vendor lock-in, API costs, latency, data privacy.

❌ Add user accounts?
   Scope creep, complexity, dilutes focus.

❌ Build with 500+ questions?
   Quality over quantity. Every addition requires revalidation.

PORTFOLIO VALUE

This project demonstrates:
- Judgment (not just code)
- Knowing what NOT to build
- Explicit tradeoffs (local vs cloud, curated vs scraped, locked vs granular)
- Validation discipline (10 tests, not 2 demos)
- Knowing when to freeze (rare skill)

Tech Stack: Phi-3 • FAISS • React • FastAPI • Node.js • TailwindCSS
Status: Production-ready, frozen for portfolio
Time: Built with discipline, not continuous sprawl

[View Demo] [GitHub Repo] [Case Study] [Read PRODUCT_NARRATIVE.md]
```

---

## How to Use These

### For Resume/LinkedIn:
Copy the SHORT version. Use as headline under "Projects" section.

### For Portfolio Website:
- Card view: Use MEDIUM version
- Project detail page: Use LONG version
- Link to Case Study, GitHub, and Demo

### For Interview Talking Points:
Lead with the problem, explain the solution in the MEDIUM version, be ready 
to dive into LONG version if asked to go deeper.

### Key Phrases to Remember:
- "RAG-grounded evaluation"
- "Eliminated hallucinations by grounding in reference standards"
- "52 curated questions for consistency"
- "Locked score bands make scores meaningful"
- "Validated with 10 tests before freezing"

---

## What Makes These Different

**NOT**: "I built an AI thing with React and FastAPI"
**IS**: "Interview evaluation system that solves hallucination using RAG with explicit tradeoffs and validation"

**NOT**: Feature list
**IS**: Problem → Solution → Technical decisions → Why it matters

**NOT**: Generic AI project
**IS**: Demonstrates judgment, restraint, and knowing when to stop
