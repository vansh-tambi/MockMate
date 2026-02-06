# 🚀 IMPLEMENTATION GUIDE - New Schema Features

## Quick Reference for Developers

### What Changed in 30 Seconds

**Removed:**
- ❌ All "phase" fields (722 questions)

**Added to ALL questions:**
- ✅ "priority": core | warmup | advanced | optional
- ✅ "interviewer_goal": Strategic purpose
- ✅ "expected_duration_sec": Time estimate
- ✅ "prerequisite_difficulty": Min difficulty requirement
- ✅ Scoring weights in evaluation_rubrics

**Fixed:**
- ✅ Removed role/skill mixing from taxonomy
- ✅ Added 1 killer question (authenticity_killer_001, weight 2.5)

---

## Code Changes Needed

### 1. Update question_loader.py

**Before:**
```python
def load_questions():
    data = load_json("questions.json")
    return [q for q in data if q.get("phase") == "technical"]
```

**After:**
```python
def load_questions(stage: str):
    data = load_json("questions.json")
    return [q for q in data if q.get("stage") == stage]
```

**Key Changes:**
- Use `stage` instead of `phase`
- Add `category` filtering support
- Add `skill` filtering support
- Add `role` filtering support

---

### 2. Update retrieve.py - Smart Question Selection

**Before:**
```python
def retrieve_questions(session, num_questions, phase):
    all_questions = load_questions(phase)
    # Simple random selection
    return random.sample(all_questions, num_questions)
```

**After:**
```python
def retrieve_questions(session, num_questions, stage):
    questions = load_questions(stage)
    
    # Filter by role match
    role_match = [
        q for q in questions 
        if q.get("role") == session.user_role or q.get("role") == "any"
    ]
    
    # Filter by difficulty progression
    difficulty_min = session.get_current_difficulty() - 1
    difficulty_max = session.get_current_difficulty() + 1
    difficulty_match = [
        q for q in role_match
        if difficulty_min <= q.get("difficulty", 3) <= difficulty_max
    ]
    
    # Filter by prerequisite
    passed_difficulties = session.get_passed_difficulties()
    prerequisite_met = [
        q for q in difficulty_match
        if q.get("prerequisite_difficulty", 0) <= max(passed_difficulties, default=0)
    ]
    
    # Score by weight and other factors
    scored = [
        (q, score_question(q, session))
        for q in prerequisite_met
    ]
    
    # Return top N by score
    scored.sort(key=lambda x: x[1], reverse=True)
    return [q for q, _ in scored[:num_questions]]

def score_question(q, session):
    base_score = q.get("weight", 1.0)
    
    # Bonus for matching role
    if q.get("role") == session.user_role:
        base_score *= 1.2
    
    # Bonus for matching skills
    if session.candidate_skills and q.get("skill") in session.candidate_skills:
        base_score *= 1.1
    
    # Reduce if already asked similar
    if session.recently_asked(q):
        base_score *= 0.5
    
    return base_score
```

---

### 3. Update app.py - Scoring with Weights

**Before:**
```python
def evaluate_answer(answer, ideal_points):
    matches = sum(
        1 for ideal in ideal_points 
        if ideal.lower() in answer.lower()
    )
    return (matches / len(ideal_points)) * 100
```

**After:**
```python
def evaluate_answer(answer, question, rubric_scores):
    """
    rubric_scores = {
        "technical_depth": 0.8,
        "specificity": 0.9,
        "ownership": 0.7,
        "flow_understanding": 0.85
    }
    """
    evaluation_rubric = question.get("evaluation_rubric", {})
    
    # Apply weights from rubric
    weighted_score = 0
    total_weight = 0
    
    for criterion, details in evaluation_rubric.items():
        if criterion in rubric_scores:
            score = rubric_scores[criterion]
            weight = details.get("weight", 0.25) if isinstance(details, dict) else 0.25
            weighted_score += score * weight
            total_weight += weight
    
    # Check red flags
    red_flags = question.get("red_flags", [])
    detected_red_flags = sum(
        1 for flag in red_flags
        if should_flag(answer, flag)
    )
    
    # Red flags significantly impact score
    penalty = detected_red_flags * 0.15
    final_score = max(0, (weighted_score / total_weight) - penalty)
    
    return {
        "score": final_score,
        "weighted_score": weighted_score,
        "red_flags_detected": detected_red_flags,
        "component_scores": rubric_scores
    }
```

---

### 4. Stage Progression Logic

**New Stages:**
```
introduction → warmup → resume → resume_technical → technical → real_life → hr_closing
```

### 5. Monitoring Killer Questions

```python
def log_killer_question_performance(question_id, answer, evaluation_result):
    """Track weight 2.0+ questions for authenticity detection."""
    if evaluation_result["red_flags_detected"] >= 2:
        db.update_candidate_flag("potential_fake_project", True)
```

---

## Testing Checklist

- [ ] All 722 questions load without error
- [ ] Role-based filtering works correctly
- [ ] Stage progression follows flow
- [ ] Killer questions score higher
- [ ] Red flag detection works
- [ ] Duration estimates accurate
- [ ] Weighted scoring calculation correct
- [ ] Prerequisite logic enforced

---

## Quick Deployment

```bash
# Validate all files
python validate_all.py

# Run tests
pytest tests/

# Deploy to staging
git tag schema-v1.2.0
git push --tags

# Monitor killer question metrics
watch_killer_question_metrics()
```

---

See full documentation in SCHEMA_FIX_COMPLETE.md and SCHEMA_BEFORE_AFTER.md
