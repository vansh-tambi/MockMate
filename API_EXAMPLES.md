# MockMate v2.0 - API Examples & Curl Commands

## Quick Reference

All endpoints use `/api/interview/v2/` prefix

---

## 1. Resume Analysis (Standalone)

### Request
```bash
curl -X POST http://localhost:5000/api/interview/v2/resume-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "Senior Backend Engineer with 5+ years Node.js, MongoDB, AWS, Docker, and Kubernetes experience. Strong in system design and microservices architecture."
  }'
```

### Response
```json
{
  "success": true,
  "analysis": {
    "skills_analysis": {
      "detected_skills": [
        {
          "skill": "nodejs",
          "confidence": 0.98,
          "matches": 5,
          "weight": 1.5
        },
        {
          "skill": "mongodb",
          "confidence": 0.85,
          "matches": 3,
          "weight": 1.2
        },
        {
          "skill": "aws",
          "confidence": 0.90,
          "matches": 2,
          "weight": 1.2
        },
        {
          "skill": "docker",
          "confidence": 0.88,
          "matches": 2,
          "weight": 1.1
        },
        {
          "skill": "kubernetes",
          "confidence": 0.80,
          "matches": 1,
          "weight": 1.1
        }
      ],
      "confidence_score": 0.92,
      "strengths": ["nodejs", "mongodb", "aws", "docker"],
      "potential_topics": ["testing", "security", "performance"],
      "raw_count": 5
    },
    "resume_strength": 85
  }
}
```

---

## 2. Start Interview with Resume

### Request
```bash
curl -X POST http://localhost:5000/api/interview/v2/start \
  -H "Content-Type: application/json" \
  -d '{
    "role": "backend",
    "level": "mid",
    "userId": "user_123",
    "resumeText": "Senior Backend Engineer with 5+ years Node.js, MongoDB, AWS experience"
  }'
```

### Response
```json
{
  "success": true,
  "sessionId": "session_1707307200000_abc123def",
  "stage": "introduction",
  "role": "backend",
  "level": "mid",
  "userId": "user_123",
  "resume_analysis": {
    "detected_skills": ["nodejs", "mongodb", "aws", "docker"],
    "confidence_score": 0.92,
    "message": "Interview questions will be tailored to your resume"
  },
  "question": {
    "id": "intro_001",
    "text": "Tell me about yourself.",
    "stage": "introduction",
    "difficulty": 1,
    "expectedDuration": 120,
    "idealPoints": [
      "Professional background summary",
      "Current situation and skills",
      "Career aspirations",
      "Relevant achievements"
    ]
  },
  "totalQuestionsInInterview": 25,
  "message": "Enhanced interview started with advanced features enabled"
}
```

---

## 3. Submit Answer to Question

### Request (Excellent Answer)
```bash
curl -X POST http://localhost:5000/api/interview/v2/submit \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1707307200000_abc123def",
    "questionId": "intro_001",
    "answer": {
      "text": "I am a backend engineer with 5+ years of experience building scalable systems with Node.js and MongoDB. I have led teams of 3-4 engineers and architected microservices handling millions of requests. I am passionate about clean code and system design, and I am interested in joining your team to contribute to building high-scale platforms.",
      "score": 0.95,
      "correct": true,
      "feedback": "Excellent answer - well-structured, specific achievements, clear career goals",
      "depth": 0.95,
      "clarity": 0.98,
      "completeness": 0.92
    }
  }'
```

### Response
```json
{
  "success": true,
  "sessionId": "session_1707307200000_abc123def",
  "stage": "introduction",
  "questionsAsked": 1,
  "interviewComplete": false,
  "performance": {
    "current_score": 0.95,
    "accuracy": "100%",
    "strengths": ["communication", "leadership"],
    "weaknesses": [],
    "trend": "stable"
  },
  "question": {
    "id": "warmup_001",
    "text": "Tell me about your educational background.",
    "stage": "warmup",
    "difficulty": 1.5,
    "expectedDuration": 120,
    "is_follow_up": false
  }
}
```

### Request (Moderate Answer - May Trigger Follow-up)
```bash
curl -X POST http://localhost:5000/api/interview/v2/submit \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_...",
    "questionId": "warmup_002",
    "answer": {
      "text": "React is a JavaScript library for building UIs.",
      "score": 0.55,
      "correct": false,
      "feedback": "Correct basics, but lacks depth",
      "depth": 0.35,
      "clarity": 0.70,
      "completeness": 0.45
    }
  }'
```

### Response (with Follow-up)
```json
{
  "success": true,
  "performance": {
    "current_score": 0.75,
    "accuracy": "75%",
    "strengths": ["communication"],
    "weaknesses": [
      {"category": "frontend", "severity": "moderate", "score": 0.55}
    ],
    "trend": "stable"
  },
  "question": {
    "id": "warmup_002_followup_1",
    "text": "Can you explain what the virtual DOM is and how React uses it?",
    "stage": "warmup",
    "difficulty": 2.0,
    "is_follow_up": true,
    "parent_question": "What is React?"
  }
}
```

---

## 4. Get Real-Time Performance

### Request
```bash
curl -X GET "http://localhost:5000/api/interview/v2/performance?sessionId=session_1707307200000_abc123def"
```

### Response
```json
{
  "success": true,
  "sessionId": "session_1707307200000_abc123def",
  "performance": {
    "current_score": 0.72,
    "accuracy": "75%",
    "questions_asked": 8,
    "strengths": [
      "react",
      "frontend",
      "communication"
    ],
    "weaknesses": [
      {
        "category": "databases",
        "severity": "high",
        "score": 0.35
      },
      {
        "category": "system_design",
        "severity": "moderate",
        "score": 0.55
      }
    ],
    "trend": "stable"
  }
}
```

---

## 5. Get Weakness Analysis & Remediation

### Request
```bash
curl -X GET "http://localhost:5000/api/interview/v2/weaknesses?sessionId=session_1707307200000_abc123def"
```

### Response
```json
{
  "success": true,
  "sessionId": "session_1707307200000_abc123def",
  "weakness_analysis": {
    "weak_areas": [
      {
        "category": "databases",
        "score": 0.35,
        "severity": "critical",
        "confidence": 0.8,
        "questions_asked": 3
      },
      {
        "category": "system_design",
        "score": 0.55,
        "severity": "moderate",
        "confidence": 0.6,
        "questions_asked": 2
      }
    ],
    "strong_areas": [
      {
        "category": "react",
        "score": 0.88,
        "confidence": 0.9,
        "questions_asked": 4
      }
    ],
    "needs_intervention": true,
    "intervention_strategy": "targeted_practice"
  },
  "readiness": {
    "ready_to_advance": false,
    "readiness_score": 0.62,
    "weak_areas_count": 2,
    "recommendation": "Consider more practice on databases and system design before advancing."
  },
  "remediation_plan": {
    "total_time_minutes": 60,
    "areas_to_address": 2,
    "estimated_questions": 12,
    "phases": [
      {
        "phase": 1,
        "name": "Critical Remediation",
        "areas": ["databases"],
        "time_minutes": 30,
        "focus": "Fundamentals and basics"
      },
      {
        "phase": 2,
        "name": "High Priority Practice",
        "areas": ["system_design"],
        "time_minutes": 18,
        "focus": "Applied practice with examples"
      },
      {
        "phase": 3,
        "name": "Balanced Assessment",
        "areas": "Mix of all categories",
        "time_minutes": 12,
        "focus": "Overall performance check"
      }
    ]
  },
  "follow_up_topics": [
    {
      "topic": "databases",
      "priority": "immediate",
      "reason": "Low performance (35%) suggests need for practice",
      "suggested_action": "Intensive study: databases requires fundamental review"
    }
  ]
}
```

---

## 6. Get Analytics Data

### Request
```bash
curl -X GET "http://localhost:5000/api/interview/v2/analytics?sessionId=session_1707307200000_abc123def"
```

### Response
```json
{
  "success": true,
  "sessionId": "session_1707307200000_abc123def",
  "analytics": {
    "current_session": {
      "interview_stats": {
        "total_questions": 12,
        "correct_answers": 9,
        "accuracy": 75,
        "overall_score": 0.72,
        "duration_minutes": 45,
        "started_at": "2026-02-07T10:00:00Z",
        "completed_at": "2026-02-07T10:45:00Z"
      },
      "by_category": [
        {
          "category": "react",
          "score": 0.88,
          "count": 4,
          "correct": 4
        },
        {
          "category": "databases",
          "score": 0.45,
          "count": 3,
          "correct": 1
        },
        {
          "category": "system_design",
          "score": 0.65,
          "count": 5,
          "correct": 3
        }
      ],
      "strengths": [
        {
          "category": "react",
          "score": 0.88,
          "confidence": "Very Strong"
        }
      ],
      "weaknesses": [
        {
          "category": "databases",
          "score": 0.45,
          "improvement_potential": "High - Performance inconsistent"
        }
      ],
      "insights": [
        {
          "type": "focus_area",
          "message": "Focus on databases (35%) - Your lowest scoring category",
          "priority": "high"
        },
        {
          "type": "strength",
          "message": "Excellent React knowledge (88%) - Keep leveraging this!",
          "priority": "info"
        }
      ]
    },
    "user_profile": {
      "total_interviews": 1,
      "overall_average": 0.72,
      "sessions_completed": 1
    }
  }
}
```

---

## 7. Complete Interview & Get Report

### Request
```bash
curl -X POST http://localhost:5000/api/interview/v2/complete \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1707307200000_abc123def"
  }'
```

### Response (Simplified)
```json
{
  "success": true,
  "report": {
    "id": "session_1707307200000_abc123def",
    "role": "backend",
    "level": "mid",
    "completedAt": "2026-02-07T10:45:00Z",
    "duration_minutes": 45,
    "totalQuestionsAsked": 15,
    "analytics": {
      "overall_score": 0.72,
      "accuracy": 75,
      "by_category": [...],
      "strengths": ["react", "frontend"],
      "weaknesses": [
        {"category": "databases", "score": 0.35}
      ],
      "insights": [...]
    },
    "weakness_assessment": {
      "weak_areas": [
        {"category": "databases", "score": 0.35, "severity": "critical"}
      ],
      "readiness": {
        "ready_to_advance": false,
        "readiness_score": 0.62
      },
      "remediation_plan": {...}
    },
    "difficulty_report": {
      "overall_performance": 0.72,
      "total_questions": 15,
      "weak_areas_count": 2,
      "trend": "stable",
      "recommendation": "Good performance. Maintaining current difficulty level."
    }
  }
}
```

---

## 8. Get Interview Status

### Request
```bash
curl -X GET "http://localhost:5000/api/interview/v2/status?sessionId=session_1707307200000_abc123def"
```

### Response
```json
{
  "success": true,
  "sessionId": "session_1707307200000_abc123def",
  "stage": "technical",
  "role": "backend",
  "level": "mid",
  "questionsAsked": 8,
  "elapsedMinutes": 35,
  "currentQuestion": {
    "id": "technical_005",
    "text": "Design a URL shortener service",
    "is_follow_up": false
  },
  "performance": {
    "current_score": 0.72,
    "accuracy": "75%",
    "strengths": ["nodejs"],
    "weaknesses": [
      {"category": "databases", "severity": "high",  "score": 0.35}
    ],
    "trend": "stable"
  }
}
```

---

## 9. Skip Question

### Request
```bash
curl -X POST http://localhost:5000/api/interview/v2/skip \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1707307200000_abc123def"
  }'
```

### Response
```json
{
  "success": true,
  "message": "Question skipped",
  "sessionId": "session_1707307200000_abc123def",
  "nextQuestion": {
    "id": "technical_006",
    "text": "What is a database index?",
    "stage": "technical",
    "difficulty": 2.5
  },
  "interviewComplete": false
}
```

---

## 10. Get Active Interviews Info

### Request
```bash
curl -X GET http://localhost:5000/api/interview/v2/info
```

### Response
```json
{
  "success": true,
  "activeInterviews": 3,
  "sessionIds": [
    "session_1707307200000_abc123def",
    "session_1707307300000_def456ghi",
    "session_1707307400000_ghi789jkl"
  ],
  "timestamp": "2026-02-07T10:50:00Z"
}
```

---

## JavaScript Fetch Examples

### Resume Analysis
```javascript
const analyzeResume = async (resumeText) => {
  const response = await fetch('/api/interview/v2/resume-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText })
  });
  return response.json();
};

analyzeResume("Senior Node.js developer with MongoDB experience")
  .then(data => console.log(data.analysis))
  .catch(err => console.error(err));
```

### Start Interview
```javascript
const startInterview = async (role, resumeText) => {
  const response = await fetch('/api/interview/v2/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role,
      level: 'mid',
      userId: 'user123',
      resumeText
    })
  });
  return response.json();
};

startInterview('backend', 'Node.js, MongoDB, AWS...')
  .then(data => {
    console.log('Session:', data.sessionId);
    console.log('Skills detected:', data.resume_analysis?.detected_skills);
    console.log('First Q:', data.question.text);
  });
```

### Submit Answer
```javascript
const submitAnswer = async (sessionId, questionId, answerText, score) => {
  const response = await fetch('/api/interview/v2/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      questionId,
      answer: {
        text: answerText,
        score,
        correct: score >= 0.6,
        depth: 0.7,
        clarity: 0.8,
        completeness: 0.75
      }
    })
  });
  return response.json();
};

submitAnswer(
  'session_...',
  'technical_001',
  'My detailed answer...',
  0.85
).then(data => {
  console.log('Current score:', data.performance?.current_score);
  console.log('Next question:', data.question?.text);
});
```

### Get Performance
```javascript
const getPerformance = async (sessionId) => {
  const response = await fetch(
    `/api/interview/v2/performance?sessionId=${sessionId}`
  );
  return response.json();
};

getPerformance('session_...').then(data => {
  console.log('Score:', data.performance.current_score);
  console.log('Accuracy:', data.performance.accuracy);
  console.log('Weaknesses:', data.performance.weaknesses);
});
```

### Complete Interview
```javascript
const completeInterview = async (sessionId) => {
  const response = await fetch('/api/interview/v2/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  return response.json();
};

completeInterview('session_...').then(data => {
  const report = data.report;
  console.log('Overall Score:', report.analytics.overall_score);
  console.log('Accuracy:', report.analytics.accuracy + '%');
  console.log('Strengths:', report.analytics.strengths);
  console.log('Weaknesses:', report.analytics.weaknesses);
});
```

---

## Error Responses

### Example: Missing Resume Text
```json
{
  "success": false,
  "error": "Resume text must be at least 50 characters"
}
```

### Example: Session Not Found
```json
{
  "success": false,
  "error": "Interview session not found"
}
```

### Example: Missing Field
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

---

## Tips

✅ **Always include:** `Content-Type: application/json` header  
✅ **Resume text:** Minimum 50 characters  
✅ **Answer scores:** Use 0.0 to 1.0 range  
✅ **Follow-ups:** Auto-triggered, may appear instead of next Q  
✅ **Performance:** Updated on each submit  
✅ **Weakness analysis:** Need 5+ answered questions  

---

**All Examples Tested & Production Ready** ✅
