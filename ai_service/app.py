from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import json
import re
from typing import Optional, List
import os

# Try to import Google Generative AI (for Gemini backup)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# Try to import RAG retriever (optional, graceful fallback if not available)
try:
    from rag.retrieve import QuestionRetriever, extract_metadata
    from session_context import InterviewSession, INTERVIEW_MODE_CONFIG
    retriever = QuestionRetriever()
    RAG_AVAILABLE = True
    print("✅ RAG retriever loaded successfully")
except Exception as e:
    RAG_AVAILABLE = False
    retriever = None
    print(f"⚠️ RAG retriever not available: {e}")

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY and GEMINI_AVAILABLE:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        print("✅ Gemini API configured successfully (backup available)")
    except Exception as e:
        print(f"⚠️ Gemini API configuration failed: {e}")
        GEMINI_AVAILABLE = False
elif GEMINI_AVAILABLE and not GEMINI_API_KEY:
    GEMINI_AVAILABLE = False
    print("⚠️ Gemini API key not provided (set GEMINI_API_KEY env var)")

app = FastAPI(title="MockMate AI Service", version="1.0.0")

# CORS for server communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class EvaluateRequest(BaseModel):
    question: str
    user_answer: str
    ideal_points: list[str]
    question_id: Optional[str] = None
    session_id: Optional[str] = None
    resume_context: Optional[dict] = None

class EvaluateResponse(BaseModel):
    strengths: list[str]
    improvements: list[str]
    score: int
    feedback: str
    follow_ups: Optional[list[dict]] = None
    missed_opportunities: Optional[list[str]] = None

class GenerateQARequest(BaseModel):
    resume: Optional[str] = ""
    jobDescription: Optional[str] = ""
    skills: Optional[List[str]] = None
    education: Optional[str] = ""
    projects: Optional[List[str]] = None
    experience_level: Optional[str] = "intern"
    target_role: Optional[str] = ""
    interview_mode: Optional[str] = "general"
    session_id: Optional[str] = None
    questionCount: Optional[int] = 10

class SessionRequest(BaseModel):
    session_id: Optional[str] = None
    action: str  # create, get, update, delete

class SessionResponse(BaseModel):
    session_id: str
    statistics: dict
    current_phase: str

# Ollama config
OLLAMA_BASE_URL = "http://localhost:11434"
MODEL_NAME = "phi3"
TIMEOUT = 60.0

# Session storage (in-memory for now, can move to Redis/DB later)
active_sessions = {}

# Health check
@app.get("/health")
async def health_check():
    """Check if service and Ollama are running"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            models = response.json().get("models", [])
            model_names = [m["name"] for m in models]
            
            return {
                "status": "healthy",
                "ollama": "connected",
                "available_models": model_names,
                "active_model": MODEL_NAME,
                "gemini_backup": "available" if GEMINI_AVAILABLE else "not available",
                "rag_enabled": RAG_AVAILABLE,
                "active_sessions": len(active_sessions)
            }
    except Exception as e:
        # If Ollama is down, check if Gemini is available as backup
        gemini_status = "available" if GEMINI_AVAILABLE else "not available"
        return {
            "status": "degraded",
            "ollama": "disconnected",
            "gemini_backup": gemini_status,
            "error": str(e),
            "rag_enabled": RAG_AVAILABLE,
            "active_sessions": len(active_sessions)
        }

@app.post("/api/generate-qa")
async def generate_qa(req: GenerateQARequest):
    """Generate interview questions with phased ordering"""
    
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=503, detail="RAG system not available")
    
    try:
        # Get or create session
        session_id = req.session_id or f"session_{len(active_sessions)}"
        
        if session_id not in active_sessions:
            session = InterviewSession(session_id)
            session.set_user_context(
                resume=req.resume or "",
                job_description=req.jobDescription or "",
                skills=req.skills or [],
                education=req.education or "",
                projects=req.projects or [],
                experience_level=req.experience_level or "intern",
                target_role=req.target_role or ""
            )
            session.set_interview_mode(req.interview_mode or "general")
            active_sessions[session_id] = session
        else:
            session = active_sessions[session_id]
        
        # Retrieve questions with phased ordering
        questions = retriever.retrieve_phased(
            session=session,
            resume_text=req.resume or "",
            job_description=req.jobDescription or "",
            top_k=req.questionCount or 10
        )
        
        # Mark questions as asked
        for q in questions:
            session.mark_question_asked(q["id"])
        
        # Format for frontend
        qa_pairs = [
            {
                "id": q["id"],
                "question": q["question"],
                "ideal_points": q.get("ideal_points", []),
                "phase": q.get("phase", "technical"),
                "difficulty": q.get("difficulty", 1),
                "skill": q.get("skill", "general"),
                "follow_ups": q.get("follow_ups", [])
            }
            for q in questions
        ]
        
        return {
            "qaPairs": qa_pairs,
            "session_id": session_id,
            "current_phase": session.current_phase,
            "statistics": session.get_statistics()
        }
        
    except Exception as e:
        print(f"❌ Error generating questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session")
async def manage_session(req: SessionRequest):
    """Manage interview sessions"""
    
    if req.action == "create":
        session = InterviewSession()
        active_sessions[session.session_id] = session
        return {
            "session_id": session.session_id,
            "statistics": session.get_statistics(),
            "current_phase": session.current_phase
        }
    
    elif req.action == "get":
        if not req.session_id or req.session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = active_sessions[req.session_id]
        return {
            "session_id": session.session_id,
            "statistics": session.get_statistics(),
            "current_phase": session.current_phase
        }
    
    elif req.action == "delete":
        if req.session_id and req.session_id in active_sessions:
            del active_sessions[req.session_id]
        return {"message": "Session deleted"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@app.get("/api/interview-modes")
async def get_interview_modes():
    """Get available interview mode configurations"""
    return {
        "modes": INTERVIEW_MODE_CONFIG
    }

@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(req: EvaluateRequest):
    """Evaluate candidate answer with context-aware feedback"""
    
    # Validate input
    if not req.user_answer.strip():
        raise HTTPException(status_code=400, detail="User answer cannot be empty")
    
    # Get session if available
    session = None
    if req.session_id and req.session_id in active_sessions:
        session = active_sessions[req.session_id]
    
    # Get question details if available
    question_obj = None
    evaluation_rubric = None
    if RAG_AVAILABLE and retriever and req.question_id:
        question_obj = retriever.get_by_id(req.question_id)
        if question_obj:
            evaluation_rubric = question_obj.get("evaluation_rubric", {})
    
    # Build context-aware evaluation prompt
    context = ""
    if req.resume_context or (session and session.resume_data):
        resume_data = req.resume_context or session.resume_data
        context = "\n\nCANDIDATE CONTEXT (from resume/JD):\n"
        if resume_data.get("skills"):
            context += f"Skills: {', '.join(resume_data['skills'])}\n"
        if resume_data.get("education"):
            context += f"Education: {resume_data['education']}\n"
        if resume_data.get("projects"):
            context += f"Projects: {', '.join(resume_data['projects'])}\n"
        if resume_data.get("target_role"):
            context += f"Target Role: {resume_data['target_role']}\n"
    
    # Build evaluation rubric
    rubric_text = ""
    missed_opportunity_categories = []
    if evaluation_rubric:
        rubric_text = "\n\nEVALUATION RUBRIC (judge on these specific criteria):\n"
        for criterion, description in evaluation_rubric.items():
            if criterion != "missed_opportunities":
                rubric_text += f"• {criterion.replace('_', ' ').title()}: {description}\n"
        
        missed_opportunity_categories = evaluation_rubric.get("missed_opportunities", [])
    
    # RAG integration - retrieve relevant questions
    rag_context = ""
    if RAG_AVAILABLE and retriever:
        try:
            similar_questions = retriever.retrieve(
                resume_text=req.question,
                job_description="",
                top_k=3
            )
            
            if similar_questions:
                rag_context = "\n\nREFERENCE STANDARDS FROM QUESTION BANK:\n"
                rag_context += "Use these as calibration for what 'good' looks like:\n\n"
                
                for i, q in enumerate(similar_questions[:3], 1):
                    skill = q.get('skill', 'general')
                    difficulty = q.get('difficulty', 'unknown')
                    ideal_points = q.get('ideal_points', [])
                    
                    rag_context += f"{i}. Similar question (skill: {skill}, difficulty: {difficulty}):\n"
                    if ideal_points:
                        rag_context += "   Expected talking points:\n"
                        for point in ideal_points[:4]:
                            rag_context += f"   • {point}\n"
                    rag_context += "\n"
        except Exception as e:
            print(f"  ⚠️ RAG context failed (non-critical): {e}")
    
    # Build strict evaluation prompt
    ideal_points_text = "\n".join([f"- {p}" for p in req.ideal_points]) if req.ideal_points else "- (none specified)"
    
    prompt = f"""You are a strict, fair interview evaluator judging against real industry standards.

SCORING BANDS (LOCKED - use these exactly):
• 0–3:   ❌ INCORRECT (fundamentally wrong, core misconception)
• 4–5:   ⚠️ SURFACE LEVEL (vague ideas, significant gaps)
• 6–7:   ✓ ACCEPTABLE (meets interview bar, solid answer)
• 7.5–8.5: ✓✓ STRONG (better than most, demonstrates expertise)
• 9–10:  ✓✓✓ EXCEPTIONAL (rare mastery, hire-this-person-now level)

CRUCIAL: Score strictly. Do NOT inflate. Exceptional (9+) is rare. Most good answers are 6-7.

---

QUESTION:
{req.question}

EXPECTED TALKING POINTS:
{ideal_points_text}

CANDIDATE'S ANSWER:
{req.user_answer}
{context}
{rubric_text}
{rag_context}

---

EVALUATION CRITERIA:
Judge on: correctness, completeness, clarity, depth, concrete examples (not vague generalities).

Be harsh on:
- Vague answers with no specifics ("it's good because it works")
- Missing core concepts from expected talking points
- Thinking out loud instead of structured answers
- Generic statements without evidence of understanding

Give credit for:
- Covering all/most expected talking points
- Practical examples from real experience
- Acknowledging tradeoffs and limitations
- Depth beyond surface-level explanations

{f"MISSED OPPORTUNITIES TO LOOK FOR: {', '.join(missed_opportunity_categories)}" if missed_opportunity_categories else ""}

---

Return ONLY JSON (no markdown, no extra text):

{{
  "strengths": [
    "specific strength 1 (be specific, not 'good answer')",
    "specific strength 2"
  ],
  "improvements": [
    "actionable improvement 1 (tell them what to add/study)",
    "actionable improvement 2"
  ],
  "score": 7,
  "feedback": "2-3 sentence summary explaining the score",
  "missed_opportunities": [
    "specific thing they should have mentioned based on their resume/context"
  ]
}}

Score as integer 0–10. Pick from the bands above. Think carefully before scoring."""

    raw_output = None
    used_service = "ollama"
    
    # Try Ollama first
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                raw_output = result.get("response", "").strip()
                used_service = "ollama"
                print(f"✅ Evaluation using Ollama")
            else:
                raise Exception(f"Ollama returned status {response.status_code}")
                
    except Exception as e:
        print(f"❌ Ollama failed: {e}")
        
        # Fallback to Gemini if available
        if GEMINI_AVAILABLE:
            try:
                print("⚠️ Falling back to Gemini API...")
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                raw_output = response.text.strip()
                used_service = "gemini"
                print(f"✅ Evaluation using Gemini API (backup)")
            except Exception as gemini_error:
                print(f"❌ Gemini also failed: {gemini_error}")
                raise HTTPException(status_code=503, detail="Both Ollama and Gemini are unavailable")
        else:
            raise HTTPException(status_code=503, detail="Ollama not available and Gemini backup not configured")
    
    if not raw_output:
        raise HTTPException(status_code=500, detail="Failed to get response from AI service")
    
    # Parse structured output
    parsed = parse_evaluation(raw_output)
    
    # Update session if available
    if session and req.question_id:
        session.mark_question_answered(
            req.question_id, 
            req.user_answer, 
            parsed["score"]
        )
        
        # Extract mentioned topics from answer
        if question_obj:
            extract_mentioned_topics(req.user_answer, session)
            
            # Mark skill as covered
            skill = question_obj.get("skill")
            if skill:
                session.mark_skill_covered(skill)
    
    # Get follow-up questions
    follow_ups = []
    if question_obj and RAG_AVAILABLE and retriever and session:
        follow_ups = retriever.get_follow_up_questions(
            question_obj,
            req.user_answer,
            session
        )
    
    return EvaluateResponse(
        strengths=parsed["strengths"],
        improvements=parsed["improvements"],
        score=parsed["score"],
        feedback=raw_output,
        follow_ups=follow_ups,
        missed_opportunities=parsed.get("missed_opportunities", [])
    )

def extract_mentioned_topics(answer: str, session: InterviewSession):
    """Extract mentioned topics from answer for follow-up context"""
    answer_lower = answer.lower()
    
    # Extract project mentions
    for project in session.resume_data.get("projects", []):
        if project.lower() in answer_lower:
            session.add_mentioned_topic("projects", project)
    
    # Extract skill mentions
    for skill in session.resume_data.get("skills", []):
        if skill.lower() in answer_lower:
            session.add_mentioned_topic("technologies", skill)
    
    # Extract education mentions (simplified)
    education = session.resume_data.get("education", "")
    if education and education.lower() in answer_lower:
        session.add_mentioned_topic("education", education)

def parse_evaluation(text: str) -> dict:
    """Parse LLM output into structured format"""
    
    strengths = []
    improvements = []
    missed_opportunities = []
    score = 5  # Default fallback
    
    # Extract strengths
    strengths_match = re.search(r'Strengths?:\s*\n((?:[-•]\s*.+\n?)+)', text, re.IGNORECASE)
    if strengths_match:
        strengths_text = strengths_match.group(1)
        strengths = [
            line.strip().lstrip('-•').strip() 
            for line in strengths_text.split('\n') 
            if line.strip() and line.strip().startswith(('-', '•'))
        ]
    
    # Extract improvements
    improvements_match = re.search(r'Improvements?:\s*\n((?:[-•]\s*.+\n?)+)', text, re.IGNORECASE)
    if improvements_match:
        improvements_text = improvements_match.group(1)
        improvements = [
            line.strip().lstrip('-•').strip() 
            for line in improvements_text.split('\n') 
            if line.strip() and line.strip().startswith(('-', '•'))
        ]
    
    # Extract missed opportunities
    missed_match = re.search(r'Missed[_ ]?Opportunities?:\s*\n((?:[-•]\s*.+\n?)+)', text, re.IGNORECASE)
    if missed_match:
        missed_text = missed_match.group(1)
        missed_opportunities = [
            line.strip().lstrip('-•').strip() 
            for line in missed_text.split('\n') 
            if line.strip() and line.strip().startswith(('-', '•'))
        ]
    
    # Extract score
    score_match = re.search(r'Score:\s*(\d+)', text, re.IGNORECASE)
    if score_match:
        score = int(score_match.group(1))
        # Clamp score 0-10
        score = max(0, min(10, score))
    
    # Ensure we have at least something
    if not strengths:
        strengths = ["Response provided"]
    if not improvements:
        improvements = ["Could provide more detail"]
    
    return {
        "strengths": strengths,
        "improvements": improvements,
        "score": score,
        "missed_opportunities": missed_opportunities
    }
