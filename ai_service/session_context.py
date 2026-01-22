"""
Session Context Manager

Handles interview session state:
- Resume/JD data
- Asked/answered questions
- Covered skills
- Mentioned topics (for follow-ups)
- Interview phase tracking
"""

import json
from typing import List, Dict, Optional, Set
from datetime import datetime

class InterviewSession:
    def __init__(self, session_id: str = None):
        self.session_id = session_id or datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # User context (from resume/JD)
        self.resume_data = {
            "skills": [],
            "education": "",
            "projects": [],
            "experience_level": "",
            "target_role": ""
        }
        
        # Interview state
        self.current_phase = "warmup"  # warmup -> behavioral -> technical -> advanced
        self.asked_questions: Set[str] = set()  # Question IDs
        self.answered_questions: Dict[str, dict] = {}  # {question_id: {answer, score, timestamp}}
        self.skipped_questions: Set[str] = set()
        
        # Skill tracking
        self.covered_skills: Set[str] = set()
        self.target_skills: List[str] = []
        
        # Context for follow-ups
        self.mentioned_topics: Dict[str, List[str]] = {}  # {category: [topics]}
        # e.g., {"projects": ["MockMate", "ChatApp"], "technologies": ["React", "Node"]}
        
        # Interview mode
        self.interview_mode = "general"  # general, hr, technical, behavioral, managerial
        
    def set_user_context(self, resume: str = "", job_description: str = "", 
                        skills: List[str] = None, education: str = "", 
                        projects: List[str] = None, experience_level: str = "",
                        target_role: str = ""):
        """Store user context from resume/JD"""
        if skills:
            self.resume_data["skills"] = skills
            self.target_skills = skills
        if education:
            self.resume_data["education"] = education
        if projects:
            self.resume_data["projects"] = projects
        if experience_level:
            self.resume_data["experience_level"] = experience_level
        if target_role:
            self.resume_data["target_role"] = target_role
            
    def mark_question_asked(self, question_id: str):
        """Mark a question as asked"""
        self.asked_questions.add(question_id)
        
    def mark_question_answered(self, question_id: str, answer: str, score: int = None):
        """Mark a question as answered with details"""
        self.answered_questions[question_id] = {
            "answer": answer,
            "score": score,
            "timestamp": datetime.now().isoformat()
        }
        self.asked_questions.add(question_id)
        
    def mark_question_skipped(self, question_id: str):
        """Mark a question as skipped"""
        self.skipped_questions.add(question_id)
        self.asked_questions.add(question_id)
        
    def is_question_used(self, question_id: str) -> bool:
        """Check if question has been asked/answered/skipped"""
        return question_id in self.asked_questions
    
    def mark_skill_covered(self, skill: str):
        """Mark a skill as evaluated"""
        self.covered_skills.add(skill.lower())
        
    def is_skill_covered(self, skill: str) -> bool:
        """Check if skill has been evaluated"""
        return skill.lower() in self.covered_skills
    
    def get_uncovered_skills(self) -> List[str]:
        """Get skills from resume that haven't been evaluated yet"""
        return [s for s in self.target_skills if not self.is_skill_covered(s)]
    
    def add_mentioned_topic(self, category: str, topic: str):
        """Track topics mentioned in answers for follow-up questions"""
        if category not in self.mentioned_topics:
            self.mentioned_topics[category] = []
        if topic not in self.mentioned_topics[category]:
            self.mentioned_topics[category].append(topic)
            
    def get_mentioned_topics(self, category: str = None) -> Dict[str, List[str]]:
        """Get mentioned topics, optionally filtered by category"""
        if category:
            return {category: self.mentioned_topics.get(category, [])}
        return self.mentioned_topics
    
    def advance_phase(self):
        """Move to next interview phase"""
        phase_order = ["warmup", "behavioral", "technical", "advanced"]
        current_idx = phase_order.index(self.current_phase)
        if current_idx < len(phase_order) - 1:
            self.current_phase = phase_order[current_idx + 1]
            
    def should_advance_phase(self) -> bool:
        """Determine if it's time to move to next phase"""
        # Advance after answering enough questions in current phase
        phase_thresholds = {
            "warmup": 5,      # Must complete 5 warmup questions
            "behavioral": 8,  # 8 behavioral questions
            "technical": 10   # 10 technical questions
        }
        
        # Count answered questions in current phase
        current_phase_count = sum(
            1 for qid in self.answered_questions.keys() 
            if qid.startswith(self.current_phase)
        )
        
        threshold = phase_thresholds.get(self.current_phase, 10)
        return current_phase_count >= threshold
    
    def set_interview_mode(self, mode: str):
        """Set interview mode (hr, technical, behavioral, etc.)"""
        valid_modes = ["general", "hr", "technical", "behavioral", "managerial"]
        if mode in valid_modes:
            self.interview_mode = mode
            # Adjust phase based on mode
            if mode == "hr":
                self.current_phase = "warmup"
            elif mode == "technical":
                self.current_phase = "technical"
            elif mode == "behavioral":
                self.current_phase = "behavioral"
                
    def get_statistics(self) -> Dict:
        """Get session statistics"""
        return {
            "session_id": self.session_id,
            "current_phase": self.current_phase,
            "interview_mode": self.interview_mode,
            "total_asked": len(self.asked_questions),
            "total_answered": len(self.answered_questions),
            "total_skipped": len(self.skipped_questions),
            "covered_skills": list(self.covered_skills),
            "uncovered_skills": self.get_uncovered_skills(),
            "mentioned_topics": self.mentioned_topics,
            "average_score": self._calculate_average_score()
        }
        
    def _calculate_average_score(self) -> Optional[float]:
        """Calculate average score from answered questions"""
        scores = [
            data["score"] for data in self.answered_questions.values() 
            if data.get("score") is not None
        ]
        return sum(scores) / len(scores) if scores else None
    
    def to_dict(self) -> Dict:
        """Serialize session to dict"""
        return {
            "session_id": self.session_id,
            "resume_data": self.resume_data,
            "current_phase": self.current_phase,
            "asked_questions": list(self.asked_questions),
            "answered_questions": self.answered_questions,
            "skipped_questions": list(self.skipped_questions),
            "covered_skills": list(self.covered_skills),
            "target_skills": self.target_skills,
            "mentioned_topics": self.mentioned_topics,
            "interview_mode": self.interview_mode
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "InterviewSession":
        """Deserialize session from dict"""
        session = cls(session_id=data.get("session_id"))
        session.resume_data = data.get("resume_data", {})
        session.current_phase = data.get("current_phase", "warmup")
        session.asked_questions = set(data.get("asked_questions", []))
        session.answered_questions = data.get("answered_questions", {})
        session.skipped_questions = set(data.get("skipped_questions", []))
        session.covered_skills = set(data.get("covered_skills", []))
        session.target_skills = data.get("target_skills", [])
        session.mentioned_topics = data.get("mentioned_topics", {})
        session.interview_mode = data.get("interview_mode", "general")
        return session
    
    def save(self, filepath: str):
        """Save session to file"""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
            
    @classmethod
    def load(cls, filepath: str) -> "InterviewSession":
        """Load session from file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)


# Interview mode configurations
INTERVIEW_MODE_CONFIG = {
    "hr": {
        "name": "HR Round",
        "description": "Focus on behavioral, culture fit, and basic background",
        "phases": ["warmup", "behavioral"],
        "question_distribution": {
            "warmup": 6,
            "behavioral": 12,
            "technical": 2  # Just basic technical awareness
        }
    },
    "technical": {
        "name": "Technical Round",
        "description": "Deep dive into technical skills and problem-solving",
        "phases": ["warmup", "technical", "advanced"],
        "question_distribution": {
            "warmup": 2,  # Brief intro
            "technical": 15,
            "advanced": 5
        }
    },
    "behavioral": {
        "name": "Behavioral Round",
        "description": "STAR method, past experiences, soft skills",
        "phases": ["warmup", "behavioral"],
        "question_distribution": {
            "warmup": 3,
            "behavioral": 15
        }
    },
    "managerial": {
        "name": "Managerial Round",
        "description": "Leadership, team management, strategic thinking",
        "phases": ["warmup", "behavioral", "technical"],
        "question_distribution": {
            "warmup": 4,
            "behavioral": 10,
            "technical": 6  # Some technical depth expected
        }
    },
    "general": {
        "name": "General Interview",
        "description": "Balanced mix of all question types",
        "phases": ["warmup", "behavioral", "technical", "advanced"],
        "question_distribution": {
            "warmup": 5,
            "behavioral": 7,
            "technical": 8,
            "advanced": 5
        }
    }
}

if __name__ == "__main__":
    # Test session
    session = InterviewSession()
    
    # Set context
    session.set_user_context(
        skills=["React", "Node.js", "MongoDB"],
        education="B.Tech CSE",
        projects=["MockMate", "ChatApp"],
        experience_level="intern",
        target_role="Frontend Intern"
    )
    
    # Simulate interview
    session.mark_question_asked("warmup_001")
    session.mark_question_answered("warmup_001", "I'm a CS student...", score=7)
    session.add_mentioned_topic("projects", "MockMate")
    session.mark_skill_covered("React")
    
    print("📊 Session Statistics:")
    print(json.dumps(session.get_statistics(), indent=2))
    
    print(f"\n✅ Covered skills: {session.covered_skills}")
    print(f"❌ Uncovered skills: {session.get_uncovered_skills()}")
    print(f"💬 Mentioned topics: {session.mentioned_topics}")
