"""
RAG Retrieval Module

Handles:
- Semantic search over question bank
- Filtering by metadata (role, level, skill)
- Ranking and scoring
- Phased interview flow (warmup -> behavioral -> technical)
- Question state tracking (asked/answered/skipped)
- Follow-up question generation

Usage:
    from rag.retrieve import QuestionRetriever
    from session_context import InterviewSession
    
    retriever = QuestionRetriever()
    session = InterviewSession()
    
    results = retriever.retrieve_phased(
        session=session,
        resume_text="Software engineer with React experience",
        job_description="Senior Frontend Developer",
        top_k=10
    )
"""

import numpy as np
import json
import os
from typing import List, Dict, Optional, Set
from sentence_transformers import SentenceTransformer
import faiss

class QuestionRetriever:
    def __init__(self, index_path: str = 'data/embeddings'):
        """Initialize retriever with pre-built index"""
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Load index and questions
        self.index = faiss.read_index(f"{index_path}.index")
        with open(f"{index_path}_questions.json", 'r') as f:
            self.questions = json.load(f)
        
        # Load all additional question sets
        self.warmup_questions = []
        self.introductory_questions = []
        self.hr_basic_questions = []
        self.behavioral_questions = []
        self.situational_questions = []
        self.self_awareness_questions = []
        self.personality_questions = []
        self.career_questions = []
        self.communication_questions = []
        self.work_ethic_questions = []
        self.ethics_questions = []
        self.company_fit_questions = []
        self.pressure_questions = []
        self.programming_questions = []
        self.dsa_questions = []
        self.database_questions = []
        self.web_frontend_questions = []
        self.problem_solving_questions = []
        
        # Profession-specific question banks
        self.medical_questions = []
        self.pilot_questions = []
        self.lawyer_questions = []
        self.teacher_questions = []
        self.police_defense_questions = []
        self.mba_management_questions = []
        self.cabin_crew_questions = []
        self.civil_services_questions = []
        self.journalist_questions = []
        self.psychologist_questions = []
        self.hotel_hospitality_questions = []
        self.actor_artist_questions = []
        self.entrepreneur_questions = []
        self.designer_creative_questions = []
        
        # Load each question set if file exists
        question_files = [
            # General interview questions
            ('data/warmup_questions.json', 'warmup_questions'),
            ('data/introductory_icebreaker.json', 'introductory_questions'),
            ('data/hr_basic_questions.json', 'hr_basic_questions'),
            ('data/behavioral_questions.json', 'behavioral_questions'),
            ('data/situational_questions.json', 'situational_questions'),
            ('data/self_awareness.json', 'self_awareness_questions'),
            ('data/personality_questions.json', 'personality_questions'),
            ('data/career_questions.json', 'career_questions'),
            ('data/communication_teamwork.json', 'communication_questions'),
            ('data/work_ethic_professionalism.json', 'work_ethic_questions'),
            ('data/values_ethics_integrity.json', 'ethics_questions'),
            ('data/company_role_fit.json', 'company_fit_questions'),
            ('data/pressure_trick_questions.json', 'pressure_questions'),
            # Technical questions
            ('data/programming_fundamentals.json', 'programming_questions'),
            ('data/dsa_questions.json', 'dsa_questions'),
            ('data/database_backend.json', 'database_questions'),
            ('data/web_frontend.json', 'web_frontend_questions'),
            ('data/problem_solving.json', 'problem_solving_questions'),
            # Profession-specific questions
            ('data/medical_professional.json', 'medical_questions'),
            ('data/pilot_aviation.json', 'pilot_questions'),
            ('data/lawyer_legal.json', 'lawyer_questions'),
            ('data/teacher_education.json', 'teacher_questions'),
            ('data/police_defense.json', 'police_defense_questions'),
            ('data/mba_management.json', 'mba_management_questions'),
            ('data/cabin_crew.json', 'cabin_crew_questions'),
            ('data/civil_services.json', 'civil_services_questions'),
            ('data/journalist_media.json', 'journalist_questions'),
            ('data/psychologist_therapist.json', 'psychologist_questions'),
            ('data/hotel_hospitality.json', 'hotel_hospitality_questions'),
            ('data/actor_artist.json', 'actor_artist_questions'),
            ('data/entrepreneur_startup.json', 'entrepreneur_questions'),
            ('data/designer_creative.json', 'designer_creative_questions')
        ]
        
        for file_path, attr_name in question_files:
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    setattr(self, attr_name, json.load(f))
                print(f"✓ Loaded {len(getattr(self, attr_name))} questions from {file_path}")
        
        # Combine all questions for comprehensive search
        self.all_questions = (
            self.questions + 
            self.warmup_questions + 
            self.introductory_questions +
            self.hr_basic_questions + 
            self.behavioral_questions +
            self.situational_questions +
            self.self_awareness_questions +
            self.personality_questions +
            self.career_questions +
            self.communication_questions +
            self.work_ethic_questions +
            self.ethics_questions +
            self.company_fit_questions +
            self.pressure_questions +
            self.programming_questions +
            self.dsa_questions +
            self.database_questions +
            self.web_frontend_questions +
            self.problem_solving_questions +
            # Profession-specific questions
            self.medical_questions +
            self.pilot_questions +
            self.lawyer_questions +
            self.teacher_questions +
            self.police_defense_questions +
            self.mba_management_questions +
            self.cabin_crew_questions +
            self.civil_services_questions +
            self.journalist_questions +
            self.psychologist_questions +
            self.hotel_hospitality_questions +
            self.actor_artist_questions +
            self.entrepreneur_questions +
            self.designer_creative_questions
        )
        
        print(f"✓ Total questions loaded: {len(self.all_questions)}")
    
    def encode_query(self, text: str) -> np.ndarray:
        """Encode query text to embedding"""
        return self.model.encode(text, convert_to_numpy=True).astype('float32')
    
    def retrieve(
        self,
        resume_text: str,
        job_description: str,
        role: Optional[str] = None,
        level: Optional[str] = None,
        skill: Optional[str] = None,
        top_k: int = 10
    ) -> List[Dict]:
        """
        Retrieve relevant questions based on resume and JD.
        
        Args:
            resume_text: User's resume content
            job_description: Target job/role description
            role: Filter by role (frontend, backend, etc.)
            level: Filter by level (intern, fresher, etc.)
            skill: Filter by skill (react, python, etc.)
            top_k: Number of questions to retrieve
        
        Returns:
            List of question dicts with scores
        """
        
        # Create query embedding from resume + JD
        query_text = f"{job_description} {resume_text[:500]}"
        query_embedding = self.encode_query(query_text).reshape(1, -1)
        
        # Semantic search
        distances, indices = self.index.search(query_embedding, min(top_k * 3, len(self.questions)))
        
        # Filter and rank
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            question = self.questions[idx].copy()
            question['score'] = float(1 / (1 + dist))  # Convert distance to similarity score
            
            # Apply metadata filters
            if role and question.get('role') != role and question.get('role') != 'any':
                continue
            if level and question.get('level') != level and question.get('level') != 'any':
                continue
            if skill and question.get('skill') != skill:
                continue
            
            results.append(question)
            
            if len(results) >= top_k:
                break
        
        # Ensure we have enough questions (fallback to unfiltered if needed)
        if len(results) < top_k:
            print(f"⚠️  Only found {len(results)} matching questions, adding more...")
            for dist, idx in zip(distances[0], indices[0]):
                if len(results) >= top_k:
                    break
                question = self.questions[idx].copy()
                question['score'] = float(1 / (1 + dist))
                if question not in results:
                    results.append(question)
        
        return results[:top_k]
    
    def retrieve_phased(
        self,
        session: 'InterviewSession',
        resume_text: str = "",
        job_description: str = "",
        top_k: int = 10,
        force_phase: Optional[str] = None
    ) -> List[Dict]:
        """
        Retrieve questions with phased ordering and session awareness.
        
        Phase priority:
        1. Warmup (always first if not completed)
        2. Behavioral
        3. Technical (skill-aware, no repetition)
        4. Advanced
        
        Args:
            session: InterviewSession object with state tracking
            resume_text: User's resume
            job_description: Target role description
            top_k: Number of questions to retrieve
            force_phase: Override automatic phase detection
            
        Returns:
            List of questions prioritized by phase and filtered by session state
        """
        
        # Determine current phase
        current_phase = force_phase or session.current_phase
        
        results = []
        
        # Phase 1: Warmup questions (ALWAYS FIRST)
        if current_phase == "warmup":
            warmup_needed = max(0, 5 - len([q for q in session.asked_questions if q.startswith("warmup")]))
            
            if warmup_needed > 0:
                # Get unused warmup questions
                available_warmup = [
                    q for q in self.warmup_questions 
                    if q["id"] not in session.asked_questions
                ]
                
                # Prioritize based on resume context
                warmup_selected = self._prioritize_warmup_questions(
                    available_warmup, 
                    session,
                    min(warmup_needed, top_k)
                )
                
                results.extend(warmup_selected)
                
                # If we still need questions after warmup
                if len(results) < top_k:
                    session.advance_phase()
                    current_phase = session.current_phase
        
        # Fill remaining slots with phase-appropriate questions
        remaining_slots = top_k - len(results)
        
        if remaining_slots > 0 and current_phase != "warmup":
            # Get uncovered skills
            uncovered_skills = session.get_uncovered_skills()
            
            # Retrieve technical questions
            technical_results = self._retrieve_technical_filtered(
                resume_text=resume_text,
                job_description=job_description,
                session=session,
                phase=current_phase,
                skills=uncovered_skills,
                top_k=remaining_slots
            )
            
            results.extend(technical_results)
        
        return results[:top_k]
    
    def _prioritize_warmup_questions(
        self, 
        questions: List[Dict], 
        session: 'InterviewSession',
        count: int
    ) -> List[Dict]:
        """Prioritize warmup questions based on context"""
        
        # Always start with "introduce yourself"
        intro_q = next((q for q in questions if "introduce" in q["question"].lower()), None)
        
        selected = []
        if intro_q and len(session.answered_questions) == 0:
            selected.append(intro_q)
            questions = [q for q in questions if q != intro_q]
        
        # Then educational background if they have education in resume
        if session.resume_data.get("education"):
            edu_q = next((q for q in questions if "educational background" in q["question"].lower()), None)
            if edu_q:
                selected.append(edu_q)
                questions = [q for q in questions if q != edu_q]
        
        # Company/role specific questions
        if session.resume_data.get("target_role"):
            role_q = next((q for q in questions if "this role" in q["question"].lower()), None)
            if role_q:
                selected.append(role_q)
                questions = [q for q in questions if q != role_q]
        
        # Fill remaining with other warmup questions
        remaining = count - len(selected)
        selected.extend(questions[:remaining])
        
        return selected[:count]
    
    def _retrieve_technical_filtered(
        self,
        resume_text: str,
        job_description: str,
        session: 'InterviewSession',
        phase: str,
        skills: List[str],
        top_k: int
    ) -> List[Dict]:
        """Retrieve technical questions filtered by session state"""
        
        # Get phase-appropriate question pools
        phase_questions = []
        
        if phase == "behavioral":
            # Behavioral phase: HR, behavioral STAR, situational, personality
            phase_questions = (
                self.hr_basic_questions + 
                self.behavioral_questions + 
                self.situational_questions +
                self.personality_questions +
                self.career_questions
            )
        elif phase == "technical":
            # Technical phase: programming, DSA, database, web, plus indexed questions
            phase_questions = (
                self.programming_questions +
                self.dsa_questions +
                self.database_questions +
                self.web_frontend_questions
            )
        elif phase == "advanced":
            # Advanced phase: problem-solving, system design, plus high-difficulty indexed questions
            phase_questions = self.problem_solving_questions.copy()
        
        # For behavioral phase, prioritize curated questions over indexed ones
        if phase == "behavioral":
            results = []
            
            # Filter out already asked questions
            available = [q for q in phase_questions if q["id"] not in session.asked_questions]
            
            # Add available questions up to top_k (no skill filtering for behavioral)
            results = available[:top_k]
            
            return results
        
        # For technical/advanced, blend curated questions with indexed search
        results = []
        seen_skills = set()
        
        # First, add relevant curated questions (50% of results)
        curated_count = max(1, top_k // 2)
        available_curated = [q for q in phase_questions if q["id"] not in session.asked_questions]
        
        for question in available_curated[:curated_count]:
            q_skill = question.get('skill', '').lower()
            if q_skill and session.is_skill_covered(q_skill):
                continue
            if q_skill and q_skill in seen_skills:
                continue
            
            results.append(question)
            if q_skill:
                seen_skills.add(q_skill)
        
        # Then, fill with indexed questions (remaining 50%)
        if len(results) < top_k:
            # Create query embedding
            query_text = f"{job_description} {resume_text[:500]}"
            query_embedding = self.encode_query(query_text).reshape(1, -1)
            
            # Search with buffer for filtering
            distances, indices = self.index.search(
                query_embedding, 
                min((top_k - len(results)) * 5, len(self.questions))
            )
            
            for dist, idx in zip(distances[0], indices[0]):
                if len(results) >= top_k:
                    break
                    
                question = self.questions[idx].copy()
                question['score'] = float(1 / (1 + dist))
                
                # Skip if already asked
                if question["id"] in session.asked_questions:
                    continue
                
                # Get question skill
                q_skill = question.get('skill', '').lower()
                
                # Prioritize uncovered skills
                if skills and q_skill:
                    # Skip if this skill was already covered
                    if session.is_skill_covered(q_skill):
                        continue
                        
                    # Skip if we already asked a question for this skill in this batch
                    if q_skill in seen_skills:
                        continue
                        
                    # Only include if skill is in target skills
                    if q_skill not in [s.lower() for s in skills]:
                        continue
                
                # Phase-appropriate difficulty
                difficulty = question.get('difficulty', 1)
                if phase == "technical":
                    if difficulty < 2 or difficulty > 4:
                        continue
                elif phase == "advanced":
                    if difficulty < 4:
                        continue
                
                results.append(question)
                if q_skill:
                    seen_skills.add(q_skill)
        
        return results

    
    def get_follow_up_questions(
        self,
        answered_question: Dict,
        user_answer: str,
        session: 'InterviewSession'
    ) -> List[Dict]:
        """
        Generate contextual follow-up questions based on user's answer.
        
        Returns list of follow-up question dicts.
        """
        
        follow_ups = []
        
        # Check if question has predefined follow-ups
        predefined = answered_question.get("follow_ups", [])
        
        if predefined:
            # Context-aware selection of follow-ups
            for follow_up_text in predefined:
                # Replace placeholders with mentioned topics
                personalized_text = self._personalize_followup(
                    follow_up_text,
                    user_answer,
                    session
                )
                
                follow_ups.append({
                    "id": f"{answered_question['id']}_followup_{len(follow_ups)}",
                    "question": personalized_text,
                    "phase": answered_question.get("phase", "technical"),
                    "parent_question_id": answered_question["id"],
                    "is_follow_up": True
                })
        
        return follow_ups[:2]  # Max 2 follow-ups per question
    
    def _personalize_followup(
        self,
        follow_up_text: str,
        user_answer: str,
        session: 'InterviewSession'
    ) -> str:
        """Personalize follow-up question with mentioned topics"""
        
        # Replace [mentioned project] with actual project mentioned
        if "[mentioned project]" in follow_up_text:
            projects = session.get_mentioned_topics("projects").get("projects", [])
            if projects:
                follow_up_text = follow_up_text.replace("[mentioned project]", projects[-1])
        
        # Replace [mentioned field] with target role
        if "[mentioned field]" in follow_up_text:
            field = session.resume_data.get("target_role", "this field")
            follow_up_text = follow_up_text.replace("[mentioned field]", field)
        
        # Replace [mentioned degree] with education
        if "[mentioned degree]" in follow_up_text:
            education = session.resume_data.get("education", "your degree")
            follow_up_text = follow_up_text.replace("[mentioned degree]", education)
        
        return follow_up_text
    
    def get_by_id(self, question_id: str) -> Optional[Dict]:
        """Get question by ID from any source"""
        # Check technical questions
        for q in self.questions:
            if q.get('id') == question_id:
                return q
        
        # Check warmup questions
        for q in self.warmup_questions:
            if q.get('id') == question_id:
                return q
        
        return None


def extract_metadata(resume_text: str, job_description: str) -> Dict:
    """
    Extract role, level, skills from resume/JD.
    
    TODO: Use NER or keyword matching.
    For now, simple keyword search.
    """
    text = (resume_text + " " + job_description).lower()
    
    metadata = {
        'role': None,
        'level': None,
        'skills': []
    }
    
    # Role detection
    if any(word in text for word in ['frontend', 'react', 'vue', 'angular']):
        metadata['role'] = 'frontend'
    elif any(word in text for word in ['backend', 'nodejs', 'python', 'api']):
        metadata['role'] = 'backend'
    elif 'data' in text or 'analytics' in text:
        metadata['role'] = 'data'
    
    # Level detection
    if any(word in text for word in ['intern', 'internship']):
        metadata['level'] = 'intern'
    elif any(word in text for word in ['fresher', 'graduate', 'entry']):
        metadata['level'] = 'fresher'
    elif any(word in text for word in ['junior', '1-2 years']):
        metadata['level'] = 'junior'
    elif any(word in text for word in ['senior', 'lead', '5+ years']):
        metadata['level'] = 'senior'
    
    # Skill detection (simple)
    skills = ['react', 'python', 'sql', 'nodejs', 'javascript', 'java']
    for skill in skills:
        if skill in text:
            metadata['skills'].append(skill)
    
    return metadata

if __name__ == "__main__":
    # Test retrieval
    print("=" * 60)
    print("Testing Question Retrieval")
    print("=" * 60)
    
    retriever = QuestionRetriever()
    
    # Test query
    results = retriever.retrieve(
        resume_text="Software engineer with 2 years React experience",
        job_description="Frontend Developer role focusing on React",
        top_k=5
    )
    
    print(f"\n📋 Retrieved {len(results)} questions:")
    for i, q in enumerate(results, 1):
        print(f"\n{i}. [{q['id']}] (score: {q['score']:.3f})")
        print(f"   {q['question']}")
        print(f"   Role: {q.get('role')}, Level: {q.get('level')}, Skill: {q.get('skill')}")
