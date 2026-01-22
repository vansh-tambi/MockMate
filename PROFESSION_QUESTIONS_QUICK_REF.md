# Quick Reference: Profession-Specific Questions

## 📊 At a Glance

**Total Questions:** 358  
**Profession-Specific:** 200 questions across 14 careers  
**Status:** ✅ Loaded and ready

---

## 🎯 Profession Question Counts

| Profession | Questions | File |
|------------|-----------|------|
| 🩺 Medical/Healthcare | 15 | `medical_professional.json` |
| ✈️ Pilot/Aviation | 15 | `pilot_aviation.json` |
| ⚖️ Lawyer/Legal | 15 | `lawyer_legal.json` |
| 🧑‍🏫 Teacher/Education | 15 | `teacher_education.json` |
| 👮 Police/Defense | 15 | `police_defense.json` |
| 💼 MBA/Management | 15 | `mba_management.json` |
| 🧑‍✈️ Cabin Crew | 15 | `cabin_crew.json` |
| 🏛️ Civil Services (IAS/IPS) | 15 | `civil_services.json` |
| 📰 Journalist/Media | 15 | `journalist_media.json` |
| 🧠 Psychologist/Therapist | 15 | `psychologist_therapist.json` |
| 🍽️ Hotel/Hospitality | 15 | `hotel_hospitality.json` |
| 🎥 Actor/Artist | 10 | `actor_artist.json` |
| 🚀 Entrepreneur/Startup | 15 | `entrepreneur_startup.json` |
| 🎨 Designer/Creative | 10 | `designer_creative.json` |
| **TOTAL** | **200** | **14 files** |

---

## 🚀 How to Use

### No Setup Required!

The profession-specific questions are **automatically loaded** when you initialize the retriever:

```python
from rag.retrieve import QuestionRetriever
from session_context import InterviewSession

retriever = QuestionRetriever()
session = InterviewSession()

# Output shows all questions loaded:
# ✓ Loaded 15 questions from data/medical_professional.json
# ✓ Loaded 15 questions from data/pilot_aviation.json
# ... (all 14 profession files)
# ✓ Total questions loaded: 358
```

### Retrieve Questions

```python
# General interview (works for all roles)
questions = retriever.retrieve_phased(
    session=session,
    resume_text="Your resume",
    job_description="Job description",
    top_k=10
)

# Profession-specific retrieval happens automatically
# based on job description keywords
```

---

## 💡 Quick Tips

### 1. **For Medical Interviews**
Job description keywords: "doctor", "medical", "physician", "hospital", "clinical"

### 2. **For Aviation Interviews**
Job description keywords: "pilot", "aviation", "airline", "flight", "aircraft"

### 3. **For Legal Interviews**
Job description keywords: "lawyer", "legal", "advocate", "attorney", "law"

### 4. **For Teaching Interviews**
Job description keywords: "teacher", "professor", "educator", "faculty", "education"

### 5. **For Defense/Police**
Job description keywords: "police", "defense", "armed forces", "military", "security"

### 6. **For Management Roles**
Job description keywords: "manager", "MBA", "corporate", "leadership", "executive"

### 7. **For Cabin Crew**
Job description keywords: "cabin crew", "air hostess", "flight attendant", "airline"

### 8. **For Civil Services**
Job description keywords: "IAS", "IPS", "IFS", "civil services", "government"

### 9. **For Journalism**
Job description keywords: "journalist", "reporter", "media", "news", "editor"

### 10. **For Psychology**
Job description keywords: "psychologist", "therapist", "counselor", "mental health"

### 11. **For Hospitality**
Job description keywords: "hotel", "hospitality", "guest", "service", "restaurant"

### 12. **For Acting/Arts**
Job description keywords: "actor", "artist", "performer", "theatre", "cinema"

### 13. **For Entrepreneurs**
Job description keywords: "founder", "startup", "entrepreneur", "business owner"

### 14. **For Designers**
Job description keywords: "designer", "creative", "UX", "UI", "graphic"

---

## 📋 Sample Questions by Profession

### Medical
- "Why did you choose medicine as a career?"
- "How do you handle emotionally difficult patients?"
- "What would you do if a patient refuses treatment?"

### Pilot
- "Why do you want to become a pilot?"
- "How do you handle pressure?"
- "What would you do during an in-flight emergency?"

### Lawyer
- "Why did you choose law?"
- "What does justice mean to you?"
- "What would you do if your client is guilty?"

### Teacher
- "Why do you want to be a teacher?"
- "How do you handle diverse classrooms?"
- "What if a student is disruptive?"

### Police/Defense
- "Why do you want to serve in uniform?"
- "What does discipline mean to you?"
- "What if ordered something unethical?"

### MBA/Management
- "Why management?"
- "What is leadership to you?"
- "What if your team misses a deadline?"

### Cabin Crew
- "Why do you want to be cabin crew?"
- "How do you handle difficult passengers?"
- "What if passenger refuses safety instructions?"

### Civil Services
- "Why do you want to join civil services?"
- "What does public service mean to you?"
- "What if senior asks you to bend rules?"

### Journalist
- "Why journalism?"
- "How do you ensure unbiased reporting?"
- "What if editor asks you to change facts?"

### Psychologist
- "Why did you choose psychology?"
- "How do you build trust with clients?"
- "How do you handle suicidal ideation?"

### Hotel/Hospitality
- "Why hospitality?"
- "How do you handle guest complaints?"
- "What if a guest is extremely rude?"

### Actor/Artist
- "Why acting?"
- "How do you handle rejection?"
- "How do you prepare for a role?"

### Entrepreneur
- "Why do you want to start a business?"
- "How do you handle failure?"
- "What if investors say no?"

### Designer
- "Why did you choose design?"
- "How do you handle creative blocks?"
- "How do you balance creativity and constraints?"

---

## ✅ Verification

To verify all profession questions are loaded:

```bash
cd ai_service
python -c "from rag.retrieve import QuestionRetriever; r = QuestionRetriever()"
```

You should see:
```
✓ Loaded 15 questions from data/medical_professional.json
✓ Loaded 15 questions from data/pilot_aviation.json
✓ Loaded 15 questions from data/lawyer_legal.json
... (all 14 profession files)
✓ Total questions loaded: 358
```

---

## 📖 Full Documentation

For complete details, see:
- [PROFESSION_SPECIFIC_QUESTIONS.md](PROFESSION_SPECIFIC_QUESTIONS.md) - Full documentation
- [COMPREHENSIVE_QUESTION_BANK.md](COMPREHENSIVE_QUESTION_BANK.md) - Technical/general questions
- [QUICKSTART_COMPREHENSIVE_QUESTIONS.md](QUICKSTART_COMPREHENSIVE_QUESTIONS.md) - Getting started guide

---

## 🎉 Summary

**Before:** 158 questions (mostly technical)  
**After:** 358 questions (universal coverage)  
**Added:** 200 profession-specific questions across 14 careers  
**Status:** ✅ Production ready!

MockMate is now a **universal interview preparation platform** for any career! 🚀
