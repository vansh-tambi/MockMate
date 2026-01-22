# 🎯 Scoring Semantics - Define Once, Lock Forever

**Purpose**: Make scores meaningful, not arbitrary.  
**Decision Point**: Now, before dataset expansion.  

---

## Current Problem

Right now scores are numbers. Users don't know:
- Is 65 "pass" or "fail"?
- Is 75 "good" or "mediocre"?
- What's the difference between 71 and 81?

**Scores must have meaning tied to interview reality.**

---

## Proposed Score Bands

### 🔴 0–30: Fundamentally Incorrect
**What this means**: Answer is wrong. Demonstrates misunderstanding.

**When this happens**:
- Question: "What is React?"
- Answer: "It's a database tool"

**User's action**: Learn the basics. This is fail territory.

**Label**: ❌ **INCORRECT**

---

### 🟠 31–50: Surface-Level Understanding
**What this means**: Has some right ideas but gaps/confusion evident.

**When this happens**:
- Question: "Explain React hooks"
- Answer: "Hooks are... functions? They help with state?"

**User's action**: Study deeper. Revisit fundamentals.

**Label**: ⚠️ **SURFACE LEVEL**

---

### 🟡 51–70: Acceptable Interview Answer
**What this means**: Meets minimum bar. Would pass most interviews.

**When this happens**:
- Question: "What is a JOIN in SQL?"
- Answer: "It combines tables. INNER JOIN returns matching records, LEFT JOIN includes all from left side"

**User's action**: Good, but room to improve. Add examples next time.

**Label**: ✓ **ACCEPTABLE**

---

### 🟢 71–85: Strong
**What this means**: Better than average. Shows solid understanding + some depth.

**When this happens**:
- Question: "Explain React hooks"
- Answer: "useState manages component state. useEffect handles side effects. Custom hooks let you share stateful logic. They're better than class components because..."

**User's action**: This is interview-winning level. Practice similar questions.

**Label**: ✓✓ **STRONG**

---

### 🟢🟢 86–100: Exceptional (Rare)
**What this means**: Hire-this-person-now level. Demonstrates mastery.

**When this happens**:
- Question: "Design a system for X"
- Answer: [Shows architecture, tradeoffs, scaling concerns, lessons learned]

**User's action**: Excellent. Prepare for senior/staff interviews.

**Label**: ✓✓✓ **EXCEPTIONAL**

---

## Band Thresholds (FINAL DECISION - LOCKED ✅)

**Status**: LOCKED as of January 22, 2026. Do not change without testing.

```
0–30    = ❌ INCORRECT (fundamentally wrong)
31–50   = ⚠️ SURFACE LEVEL (vague, major gaps)
51–70   = ✓ ACCEPTABLE (meets interview bar)
71–85   = ✓✓ STRONG (better than most)
86–100  = ✓✓✓ EXCEPTIONAL (rare mastery)
```

**Normalization**: AI returns 0-10, multiply by 10 to get 0-100 display score.

---

## Frontend Implementation

### Current Code (TestMode.jsx)
```javascript
<span className={feedback.rating === 'Green' ? 'text-green-400' : ...}>
  {feedback.score}/100
</span>
```

### New Code (with bands)
```javascript
function getScoreBand(score) {
  if (score <= 30) return { label: "❌ INCORRECT", color: "text-red-600", bg: "bg-red-500/10" };
  if (score <= 50) return { label: "⚠️ SURFACE LEVEL", color: "text-orange-600", bg: "bg-orange-500/10" };
  if (score <= 70) return { label: "✓ ACCEPTABLE", color: "text-yellow-600", bg: "bg-yellow-500/10" };
  if (score <= 85) return { label: "✓✓ STRONG", color: "text-green-600", bg: "bg-green-500/10" };
  return { label: "✓✓✓ EXCEPTIONAL", color: "text-emerald-600", bg: "bg-emerald-500/10" };
}

const band = getScoreBand(feedback.score);

// In feedback modal
<div className={`text-2xl font-bold ${band.color} mb-2`}>
  {band.label}
</div>
<div className={`text-5xl font-bold ${band.color} mb-4`}>
  {feedback.score}/100
</div>
```

### Tooltip (on hover)
```javascript
<Tooltip title={SCORE_EXPLANATIONS[band.label]}>
  <QuestionMarkIcon />
</Tooltip>

const SCORE_EXPLANATIONS = {
  "❌ INCORRECT": "Answer demonstrates fundamental misunderstanding. Review basics.",
  "⚠️ SURFACE LEVEL": "Some understanding but significant gaps. Study deeper.",
  "✓ ACCEPTABLE": "Meets interview bar. Solid answer with room to improve.",
  "✓✓ STRONG": "Better than average. Demonstrates solid expertise.",
  "✓✓✓ EXCEPTIONAL": "Hire-this-person-now level. Exceptional understanding."
};
```

---

## Backend Alignment (ai_service)

### Current Eval Prompt
```python
prompt = f"""
Evaluate this answer...
Score 0–10...
"""
```

### New Eval Prompt (with band context)
```python
prompt = f"""
You are evaluating an interview answer.

Score bands:
- 0–3:   Fundamentally incorrect
- 4–5:   Surface-level understanding  
- 6–7:   Acceptable interview answer
- 7.5–8.5: Strong understanding
- 9–10:  Exceptional mastery

Score based on completeness, accuracy, and depth.
Lean strict: only score 9+ for truly exceptional answers.

Question: {req.question}
Expected talking points: {req.ideal_points}
Candidate's answer: {req.user_answer}

...

Return JSON with score (0–10 integer).
"""
```

---

## Score Philosophy

### Strict Scoring (Recommended)
- 50 = median interview answer
- 70 = better than most candidates
- 85+ = genuinely impressive

**Rationale**: Users learn faster with honest feedback. Inflated scores hide problems.

### Lenient Scoring
- 60 = passing
- 75 = good
- 90 = very good

**Rationale**: Feels better, but users overestimate skill. Reality hits in interviews.

**Decision**: Go STRICT. Users benefit from honesty.

---

## Questions This Answers

### For Users
- "Is my answer good enough?" → Look at band
- "What should I do next?" → Band-specific guidance
- "How do I compare to others?" → Score distribution

### For You (Product)
- "Is evaluation working?" → Check if score distribution makes sense
- "What's the pass rate?" → % of users scoring ≥50
- "Difficulty vs skill?" → Band distribution per role

---

## Adjustments by Role (Optional)

Consider: Should bands differ by role?

**Frontend React**: 
- 70 is good (hard to get perfect)

**Behavioral**:
- 70 is adequate (should be higher)

**DSA**:
- 65 is good (lower bar for fresher)

**Decision for now**: **Same bands across all roles**. Revisit after 50+ questions if data suggests otherwise.

---

## Calibration Checklist

After implementing bands:

- [ ] Run EVAL_NOTES session 1 with new bands
- [ ] Does score band feel right for answer quality?
- [ ] Are the labels showing in UI?
- [ ] Do tooltips help users understand?
- [ ] Are "EXCEPTIONAL" scores actually rare (< 10% of answers)?
- [ ] Are "INCORRECT" answers actually wrong (> 90% of answers)?

---

## Implementation Order

1. **Update [ai_service/app.py](ai_service/app.py)** - Adjust eval prompt with bands
2. **Update [TestMode.jsx](client/src/components/TestMode.jsx)** - Display band labels + colors
3. **Add tooltips** - Explain what each band means
4. **Run EVAL_NOTES** - Calibrate with real data
5. **Adjust if needed** - Band thresholds based on observations

---

## Lock-In Moment

Once you commit to these bands:
- Users calibrate expectations around them
- Dataset curation uses them
- UI copy references them

**Changing bands later is disruptive.** Pick carefully now.

---

## Final Decision

**Confirm these bands are locked:**

```
✅ 0–30    = INCORRECT
✅ 31–50   = SURFACE LEVEL  
✅ 51–70   = ACCEPTABLE
✅ 71–85   = STRONG
✅ 86–100  = EXCEPTIONAL
```

**If different, document why:**
[Your reasoning]

---

Once locked, move to STEP 3: Activate RAG in evaluation prompt.
