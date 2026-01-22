# 🧪 Stress Testing Guide (Phase 9)

**Purpose**: Deliberately break the system to expose real flaws  
**Status**: ⚠️ SKIPPED FOR FAST FREEZE

---

## ⚠️ STRESS TESTING SKIPPED

**Decision**: Project frozen at portfolio-ready state without stress testing.

**Rationale**: 
- Portfolio focus is on architectural decisions and tradeoffs
- Test framework documented (shows planning discipline)
- Core evaluation logic verified during development
- Freezing without exhaustive testing demonstrates restraint

**Impact**: Case study notes "FROZEN WITHOUT STRESS TESTING" for edge case validation.  

---

## Why Stress Test?

Normal testing shows what works. Stress testing shows what **breaks**.

These edge cases reveal:
- Overly generous scoring
- Inability to detect confident wrongness
- Reward for verbosity over substance
- Inconsistency across runs
- Generic feedback generation

---

## Test Cases (Run All 5)

### Test 1: Confidently Wrong Answer

**Setup**: Pick a technical question you know the answer to

**What to do**: Answer with complete confidence using **wrong** information

**Example**:
- Q: "What is React?"
- A: "React is a relational database management system built by Oracle. It uses SQL queries to manage component state and is primarily used for backend data storage. The main advantage is ACID compliance."

**What you're testing**:
- [ ] Does system penalize confidently wrong answers?
- [ ] Expected: Score ≤ 30 (❌ INCORRECT band)
- [ ] Does feedback call out the fundamental wrongness?
- [ ] Or does system hallucinate strengths ("good confidence!")?

**Red flags**:
- ❌ Score > 40 = system is too generous
- ❌ Strengths list things that are wrong = hallucination
- ❌ Improvements don't mention core misconception = not grounded

---

### Test 2: Correct But Very Brief

**Setup**: Pick a question with 5 ideal points

**What to do**: Give a technically correct but minimal answer (1 sentence)

**Example**:
- Q: "Explain React hooks and why they were introduced"
- A: "Hooks let you use state in functional components."

**What you're testing**:
- [ ] Does system distinguish brevity from completeness?
- [ ] Expected: Score 40-50 (⚠️ SURFACE LEVEL) - correct but incomplete
- [ ] Does feedback list the 4 missing ideal points?
- [ ] Or does it reward the one correct point too generously?

**Red flags**:
- ❌ Score > 60 = rewarding brevity
- ❌ Feedback says "good answer" = missing the incompleteness
- ❌ Doesn't mention missing ideal points = RAG not working

---

### Test 3: Rambling Without Substance

**Setup**: Pick any technical question

**What to do**: Give a long answer full of filler, buzzwords, no real content

**Example**:
- Q: "What is a JOIN in SQL?"
- A: "So basically, like, JOINs are really important in databases, you know? They're used when you have, like, multiple tables and you need to, you know, connect them together. It's really powerful and, like, companies use it all the time. You can do different types of joins, like there's INNER and LEFT and stuff, and they all do different things depending on what you need. It's really about understanding the data model and how everything relates, you know?"

**What you're testing**:
- [ ] Does system penalize verbal filler?
- [ ] Expected: Score 35-50 (⚠️ SURFACE LEVEL) - vague, no specifics
- [ ] Does feedback call out lack of substance?
- [ ] Or does length fool the system?

**Red flags**:
- ❌ Score > 55 = rewarding verbosity
- ❌ Feedback doesn't mention vagueness = can't detect rambling
- ❌ Gives credit for "mentioned types of joins" without specifics = too generous

---

### Test 4: Buzzword Salad (Incorrect Usage)

**Setup**: Pick a technical question

**What to do**: Use technical terms incorrectly but confidently

**Example**:
- Q: "Explain the event loop in Node.js"
- A: "The event loop uses asynchronous polymorphism to handle concurrent microservices through the callback stack. It implements a singleton pattern for non-blocking recursion, which enables horizontal scaling of the virtual DOM. This is why Node.js has better encapsulation than traditional thread-based architectures."

**What you're testing**:
- [ ] Does system detect misused technical terms?
- [ ] Expected: Score ≤ 35 (❌/⚠️) - uses terms but incorrectly
- [ ] Does feedback identify specific wrong usage?
- [ ] Or does it get confused by technical vocabulary?

**Red flags**:
- ❌ Score > 50 = fooled by buzzwords
- ❌ Strengths mention "good technical knowledge" = didn't catch wrongness
- ❌ Feedback is vague = system can't parse technical correctness

---

### Test 5: Same Answer Twice (Consistency Test)

**Setup**: Pick any question

**What to do**: 
1. Answer the question (any quality level)
2. Note the score and feedback
3. **Immediately** answer the **exact same question** with the **exact same answer**
4. Compare results

**What you're testing**:
- [ ] Does same answer get same score (±5 points)?
- [ ] Is feedback similar or completely different?
- [ ] Are strengths/improvements consistent?

**Red flags**:
- ❌ Score difference > 10 points = inconsistent
- ❌ Completely different strengths = randomness
- ❌ Different score bands = serious problem

---

## Expected System Behavior

### ✅ System Should:

1. **Penalize confident wrongness** (Test 1)
   - Score ≤ 30 for fundamentally wrong answers
   - Feedback calls out core misconceptions
   - No hallucinated strengths

2. **Distinguish brevity from completeness** (Test 2)
   - Score 40-50 for correct but minimal answers
   - List missing ideal points specifically
   - RAG comparison visible

3. **Not reward verbosity** (Test 3)
   - Score ≤ 50 for rambling without substance
   - Call out vagueness
   - Demand specifics

4. **Detect misused technical terms** (Test 4)
   - Score ≤ 35 for incorrect buzzword usage
   - Identify specific wrong usage
   - Not fooled by vocabulary

5. **Stay consistent** (Test 5)
   - Same answer → similar score (±5)
   - Similar feedback patterns
   - Repeatable results

---

## Failure Patterns & What They Mean

### Pattern: Over-generous Scoring
**Symptoms**: Wrong answers get 50+, rambling gets 60+  
**Root cause**: Prompt too lenient or RAG not weighting correctly  
**Fix location**: `ai_service/app.py` - evaluation prompt strictness

### Pattern: Hallucinated Strengths
**Symptoms**: System lists strengths that don't exist in answer  
**Root cause**: LLM filling in gaps, not grounded in actual response  
**Fix location**: `ai_service/app.py` - prompt needs "quote from answer" requirement

### Pattern: Generic Improvements
**Symptoms**: "Add more detail", "Be clearer" appear repeatedly  
**Root cause**: Not using RAG ideal_points effectively  
**Fix location**: `ai_service/app.py` - RAG context injection or prompt

### Pattern: Verbosity Rewarded
**Symptoms**: Long rambling answers score higher than brief correct ones  
**Root cause**: Token count bias in evaluation  
**Fix location**: `ai_service/app.py` - prompt needs "penalize vagueness" emphasis

### Pattern: Inconsistency
**Symptoms**: Same answer gets wildly different scores  
**Root cause**: Temperature too high or RAG retrieval varying  
**Fix location**: `ai_service/app.py` - lower temperature or fix RAG determinism

---

## Documentation Template

After running all 5 stress tests, document in this format:

```markdown
## Stress Test Results

### Test 1: Confidently Wrong
- Score: X/100 | Band: [band]
- System passed/failed: [PASS/FAIL]
- Notes: [what worked/broke]

### Test 2: Correct But Brief
- Score: X/100 | Band: [band]
- System passed/failed: [PASS/FAIL]
- Notes:

### Test 3: Rambling
- Score: X/100 | Band: [band]
- System passed/failed: [PASS/FAIL]
- Notes:

### Test 4: Buzzword Salad
- Score: X/100 | Band: [band]
- System passed/failed: [PASS/FAIL]
- Notes:

### Test 5: Consistency
- Run 1: X/100 | Run 2: Y/100 | Diff: Z
- System passed/failed: [PASS/FAIL]
- Notes:

## Overall Assessment
- Tests passed: X/5
- Critical failures: [list]
- Quality tuning needed: [specific fixes]
```

---

## Quality Tuning Priority

Based on failures, prioritize fixes:

### Priority 1: Consistency (Test 5)
If this fails, nothing else matters. Fix immediately.

### Priority 2: Confident Wrongness (Test 1)
Users trust the system. Can't miss fundamental errors.

### Priority 3: Verbosity vs Substance (Test 2, 3)
Users will game the system if it rewards length.

### Priority 4: Technical Correctness (Test 4)
Important but less critical than above.

---

## When to Run This

**Timing**: AFTER Phase 6 validation, BEFORE Phase 10 freeze

**Why**: 
- Phase 6 tests normal usage
- Phase 9 tests edge cases
- Combined data informs Phase 8 quality tuning

**How long**: ~20 minutes for all 5 tests

---

## Success Criteria

System is ready for freeze when:

- [ ] Test 1 (Wrong): Score ≤ 30, feedback identifies wrongness
- [ ] Test 2 (Brief): Score 40-50, lists missing points
- [ ] Test 3 (Rambling): Score ≤ 50, calls out vagueness
- [ ] Test 4 (Buzzwords): Score ≤ 35, catches misuse
- [ ] Test 5 (Consistency): Score diff ≤ 5 points

**If 4/5 pass**: Good enough. Document the one failure as known limitation.

**If 2/5 or less pass**: Do NOT freeze. Phase 8 quality tuning required.

---

## Remember

This is NOT about finding bugs. This is about finding **behavioral flaws**.

The system might work perfectly for normal inputs but break on edge cases. That's what we're hunting for.

**Stress testing is how grown-ups validate systems.** 🧪
