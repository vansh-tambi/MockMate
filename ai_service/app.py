from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import json
import re
from typing import Optional
import os

# Try to import RAG retriever (optional, graceful fallback if not available)
try:
    from rag.retrieve import QuestionRetriever, extract_metadata
    retriever = QuestionRetriever()
    RAG_AVAILABLE = True
    print("✅ RAG retriever loaded successfully")
except Exception as e:
    RAG_AVAILABLE = False
    retriever = None
    print(f"⚠️ RAG retriever not available: {e}")

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

class EvaluateResponse(BaseModel):
    strengths: list[str]
    improvements: list[str]
    score: int
    feedback: str

# Ollama config
OLLAMA_BASE_URL = "http://localhost:11434"
MODEL_NAME = "phi3"
TIMEOUT = 60.0

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
                "active_model": MODEL_NAME
            }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama not available: {str(e)}")

@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(req: EvaluateRequest):
    """Evaluate candidate answer using LLM with RAG-enhanced context"""
    
    # Validate input
    if not req.user_answer.strip():
        raise HTTPException(status_code=400, detail="User answer cannot be empty")
    
    # 🔥 STEP 3: RAG integration - retrieve relevant questions and use their ideal_points
    rag_context = ""
    if RAG_AVAILABLE and retriever:
        try:
            # Retrieve similar questions from the question bank
            similar_questions = retriever.retrieve(
                resume_text=req.question,  # Use current question as query
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
                        for point in ideal_points[:4]:  # Top 4 points
                            rag_context += f"   • {point}\n"
                    rag_context += "\n"
                
                print(f"  📊 RAG: Injected {len(similar_questions)} similar questions for context")
        except Exception as e:
            print(f"  ⚠️ RAG context failed (non-critical): {e}")
            # Continue without RAG - not critical
    
    # Build strict evaluation prompt with locked score band semantics
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
  "feedback": "2-3 sentence summary explaining the score"
}}

Score as integer 0–10. Pick from the bands above. Think carefully before scoring."""

    try:
        # Call Ollama API
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,  # Low temperature for consistency
                        "top_p": 0.9,
                    }
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Ollama API error")
            
            result = response.json()
            raw_output = result.get("response", "").strip()
            
            # Parse structured output
            parsed = parse_evaluation(raw_output)
            
            return EvaluateResponse(
                strengths=parsed["strengths"],
                improvements=parsed["improvements"],
                score=parsed["score"],
                feedback=raw_output
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Evaluation timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

def parse_evaluation(text: str) -> dict:
    """Parse LLM output into structured format"""
    
    strengths = []
    improvements = []
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
        "score": score
    }
