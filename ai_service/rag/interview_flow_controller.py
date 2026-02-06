"""
Interview Flow Controller - Brain of the MockMate AI Interviewer

This module implements:
1. Master interview flow orchestration
2. Intelligent question selection with weights
3. Stage-based progression
4. Difficulty escalation based on performance
5. Interview memory and tracking
"""

import json
import random
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime


class InterviewStage(Enum):
    """Valid interview stages in strict progression order."""
    INTRODUCTION = "introduction"
    WARMUP = "warmup"
    RESUME = "resume"
    RESUME_TECHNICAL = "resume_technical"
    REAL_LIFE = "real_life"
    HR_CLOSING = "hr_closing"
    COMPLETE = "complete"


@dataclass
class QuestionScore:
    """Track score for each question answer."""
    question_id: str
    score: float  # 0.0 to 1.0
    red_flags_detected: int
    category: str
    difficulty: int
    timestamp: str


@dataclass
class InterviewState:
    """Track complete interview state and progress."""
    role: str
    level: str
    current_stage: InterviewStage
    questions_asked: List[str]  # IDs of questions asked
    scores: List[QuestionScore]
    stage_index: int  # 0-5 for the 6 stages
    average_score: float
    max_achieved_difficulty: int
    red_flags_total: int
    candidate_strengths: List[str]
    candidate_weaknesses: List[str]
    
    def __post_init__(self):
        self.stage_index = list(InterviewStage).index(self.current_stage)
    
    def get_average_score(self) -> float:
        """Calculate average score from all answers."""
        if not self.scores:
            return 0.5  # Start neutral
        return sum(s.score for s in self.scores) / len(self.scores)
    
    def advance_stage(self) -> bool:
        """Move to next stage. Returns True if advanced, False if already at end."""
        if self.stage_index < len(InterviewStage) - 2:  # -2 to skip COMPLETE
            self.stage_index += 1
            stages = [s.value for s in InterviewStage if s != InterviewStage.COMPLETE]
            self.current_stage = InterviewStage(stages[self.stage_index])
            return True
        return False
    
    def add_score(self, score: QuestionScore):
        """Add a question score to history."""
        self.scores.append(score)
        self.average_score = self.get_average_score()
        
        # Track weaknesses and strengths
        if score.red_flags_detected > 0:
            self.red_flags_total += score.red_flags_detected
        
        if score.score > 0.8:
            self.candidate_strengths.append(score.category)
        elif score.score < 0.5:
            self.candidate_weaknesses.append(score.category)
        
        # Update max difficulty achieved
        if score.difficulty > self.max_achieved_difficulty:
            self.max_achieved_difficulty = score.difficulty


class InterviewFlowController:
    """Master controller for interview flow and question selection."""
    
    def __init__(self, flow_config_path: str, questions_data: List[Dict]):
        """
        Initialize controller with flow config and questions.
        
        Args:
            flow_config_path: Path to interview_flow.json
            questions_data: List of all loaded question dictionaries
        """
        with open(flow_config_path, 'r', encoding='utf-8') as f:
            self.flow_config = json.load(f)
        
        self.interview_flow = self.flow_config['interview_flow']
        self.all_questions = questions_data
        self.state: Optional[InterviewState] = None
    
    def initialize_interview(self, role: str, level: str) -> InterviewState:
        """Start a new interview session."""
        self.state = InterviewState(
            role=role,
            level=level,
            current_stage=InterviewStage.INTRODUCTION,
            questions_asked=[],
            scores=[],
            stage_index=0,
            average_score=0.5,
            max_achieved_difficulty=0,
            red_flags_total=0,
            candidate_strengths=[],
            candidate_weaknesses=[]
        )
        return self.state
    
    def get_current_stage_config(self) -> Dict:
        """Get configuration for current stage."""
        stage_name = self.state.current_stage.value
        for stage_config in self.interview_flow:
            if stage_config['stage'] == stage_name:
                return stage_config
        raise ValueError(f"Stage {stage_name} not found in config")
    
    def get_eligible_questions(self, stage_config: Dict, difficulty_override: Optional[int] = None) -> List[Dict]:
        """
        Filter questions eligible for current stage.
        
        Args:
            stage_config: Stage configuration dict
            difficulty_override: Override difficulty range (for adaptive difficulty)
        
        Returns:
            List of eligible questions
        """
        stage = stage_config['stage']
        categories = stage_config['allowed_categories']
        
        # Determine difficulty range with adaptive escalation
        if difficulty_override:
            difficulty_range = [difficulty_override, difficulty_override + 1]
        else:
            difficulty_range = stage_config['difficulty_range']
        
        eligible = [
            q for q in self.all_questions
            if (
                q.get('stage') == stage and
                q.get('category') in categories and
                difficulty_range[0] <= q.get('difficulty', 2) <= difficulty_range[1] and
                (q.get('role') == self.state.role or q.get('role') == 'any') and
                q['id'] not in self.state.questions_asked  # Don't repeat questions
            )
        ]
        
        return eligible
    
    def weight_questions(self, questions: List[Dict]) -> List[Tuple[Dict, float]]:
        """
        Apply weight-based scoring to questions.
        
        Weight system:
        - 1.0-1.2: Foundation (basic knowledge)
        - 1.3-1.5: Standard (applied knowledge)
        - 1.6-1.8: Challenging (expertise)
        - 1.9-2.5: Elite/Killer (FAANG level)
        
        Args:
            questions: List of eligible questions
        
        Returns:
            List of (question, weight_score) tuples
        """
        weighted = []
        for q in questions:
            weight = q.get('weight', 1.0)
            
            # Bonus: questions matching candidate weaknesses get higher priority
            if q.get('category') in self.state.candidate_weaknesses:
                weight *= 1.3
            
            # Malus: questions already asked similar category
            if q.get('category') in self.state.candidate_strengths:
                weight *= 0.7
            
            weighted.append((q, weight))
        
        return weighted
    
    def select_questions(self, count: int, use_adaptive_difficulty: bool = True) -> List[Dict]:
        """
        Intelligently select N questions for current stage using weighted sampling.
        
        This ensures:
        - Elite questions appear more often
        - Candidate weaknesses are probed
        - No repetition
        - Adaptive difficulty based on performance
        
        Args:
            count: Number of questions to select
            use_adaptive_difficulty: Adjust difficulty based on performance
        
        Returns:
            List of selected questions
        """
        stage_config = self.get_current_stage_config()
        
        # Determine adaptive difficulty if enabled
        difficulty_override = None
        if use_adaptive_difficulty:
            difficulty_override = self._calculate_adaptive_difficulty(stage_config)
        
        # Get eligible questions
        eligible = self.get_eligible_questions(stage_config, difficulty_override)
        
        if len(eligible) == 0:
            # Fallback: relax constraints
            eligible = self.get_eligible_questions(stage_config, None)
        
        if len(eligible) == 0:
            raise ValueError(f"No eligible questions for stage {stage_config['stage']}")
        
        # Weight the questions
        weighted = self.weight_questions(eligible)
        
        # Create weighted pool for sampling
        pool = []
        for question, weight in weighted:
            # Convert weight to pool multiplicity
            multiplicity = max(1, int(weight * 10))
            pool.extend([question] * multiplicity)
        
        # Random sample without replacement
        selected = []
        random.shuffle(pool)
        
        for question in pool:
            if question not in selected and len(selected) < count:
                selected.append(question)
        
        return selected[:count]
    
    def _calculate_adaptive_difficulty(self, stage_config: Dict) -> Optional[int]:
        """
        Adjust difficulty based on candidate performance.
        
        Rules:
        - score > 0.75 in previous stage: +1 difficulty
        - score < 0.45 in previous stage: -1 difficulty
        - Keep within stage's allowed range
        
        Returns:
            Overridden difficulty level or None to use stage default
        """
        if not self.state.scores:
            return None  # First stage, use default
        
        avg_score = self.state.get_average_score()
        
        if avg_score > 0.75:
            # Candidate is performing well, increase difficulty
            return min(5, self.state.max_achieved_difficulty + 1)
        elif avg_score < 0.45:
            # Candidate struggling, decrease difficulty
            return max(1, self.state.max_achieved_difficulty - 1)
        else:
            return None  # Keep current difficulty
    
    def get_next_questions(self, num_questions: Optional[int] = None) -> List[Dict]:
        """
        Get the next batch of questions for the current stage.
        
        Args:
            num_questions: Override number of questions (default uses stage config)
        
        Returns:
            List of questions ready for interview
        """
        stage_config = self.get_current_stage_config()
        count = num_questions or stage_config['question_count']
        
        questions = self.select_questions(count)
        
        # Record that we're asking these questions
        for q in questions:
            self.state.questions_asked.append(q['id'])
        
        return questions
    
    def should_advance_stage(self) -> bool:
        """
        Determine if candidate should advance to next stage.
        
        Rules:
        - Must have answered minimum questions for stage (from config)
        - Average score >= 0.4 (minimum competency)
        
        Returns:
            True if should advance, False to repeat current stage
        """
        stage_config = self.get_current_stage_config()
        num_questions_in_stage = stage_config['question_count']
        
        # Count questions from current stage
        questions_in_stage = sum(
            1 for q_id in self.state.questions_asked
            if any(q['id'] == q_id and q['stage'] == stage_config['stage'] 
                   for q in self.all_questions)
        )
        
        # Check if enough questions asked in this stage
        if questions_in_stage < num_questions_in_stage:
            return False
        
        # Check minimum competency (you need at least 40% to pass)
        recent_scores = self.state.scores[-num_questions_in_stage:]
        if recent_scores:
            stage_avg = sum(s.score for s in recent_scores) / len(recent_scores)
            return stage_avg >= 0.4
        
        return True
    
    def advance_stage_if_ready(self) -> bool:
        """Advance to next stage if conditions are met."""
        if self.should_advance_stage():
            result = self.state.advance_stage()
            return result
        return False
    
    def generate_full_interview(self) -> Dict:
        """
        Generate a complete interview plan for the candidate.
        
        Returns:
            Dictionary with interview stages and questions
        """
        interview_plan = {
            'candidate': {
                'role': self.state.role,
                'level': self.state.level
            },
            'interview': [],
            'stats': {
                'total_questions': sum(s['question_count'] for s in self.interview_flow),
                'total_duration_minutes': self.flow_config['total_interview_time_minutes'],
                'stages': len(self.interview_flow)
            }
        }
        
        for stage_config in self.interview_flow:
            stage_dict = {
                'stage': stage_config['stage'],
                'stage_name': stage_config['stage_name'],
                'purpose': stage_config['purpose'],
                'duration_seconds': stage_config['duration_seconds'],
                'questions': []
            }
            
            # Set current stage to get questions
            session_stage_index = [s['stage'] for s in self.interview_flow].index(stage_config['stage'])
            stages = [s['stage'] for s in self.interview_flow]
            self.state.current_stage = InterviewStage(stages[session_stage_index])
            
            # Get questions for this stage
            questions = self.select_questions(stage_config['question_count'], use_adaptive_difficulty=False)
            stage_dict['questions'] = [{'id': q['id'], 'question': q['question']} for q in questions]
            
            interview_plan['interview'].append(stage_dict)
        
        return interview_plan
    
    def record_answer(self, question_id: str, score: float, red_flags: int = 0) -> None:
        """
        Record a candidate's answer and update state.
        
        Args:
            question_id: ID of the question answered
            score: Score from 0.0 to 1.0
            red_flags: Number of red flags detected
        """
        # Find question to get metadata
        question = next((q for q in self.all_questions if q['id'] == question_id), None)
        if not question:
            raise ValueError(f"Question {question_id} not found")
        
        q_score = QuestionScore(
            question_id=question_id,
            score=score,
            red_flags_detected=red_flags,
            category=question.get('category', 'unknown'),
            difficulty=question.get('difficulty', 2),
            timestamp=datetime.now().isoformat()
        )
        
        self.state.add_score(q_score)
    
    def get_interview_summary(self) -> Dict:
        """
        Generate summary of interview so far.
        
        Returns:
            Dictionary with performance metrics
        """
        return {
            'role': self.state.role,
            'level': self.state.level,
            'current_stage': self.state.current_stage.value,
            'progress': f"{len(self.state.questions_asked)} questions answered",
            'average_score': round(self.state.average_score, 2),
            'red_flags_total': self.state.red_flags_total,
            'max_difficulty_reached': self.state.max_achieved_difficulty,
            'strengths': list(set(self.state.candidate_strengths)),
            'weaknesses': list(set(self.state.candidate_weaknesses)),
            'scores': [
                {
                    'question_id': s.question_id,
                    'score': round(s.score, 2),
                    'category': s.category,
                    'red_flags': s.red_flags_detected
                }
                for s in self.state.scores
            ]
        }


# Utility function for basic weighted selection (without full state tracking)
def weighted_random_selection(items: List[Tuple], count: int) -> List:
    """
    Simple weighted random selection from list of (item, weight) tuples.
    
    Args:
        items: List of (item, weight) tuples
        count: Number to select
    
    Returns:
        List of selected items
    """
    pool = []
    for item, weight in items:
        multiplicity = max(1, int(weight * 10))
        pool.extend([item] * multiplicity)
    
    random.shuffle(pool)
    
    selected = []
    for item in pool:
        if item not in selected and len(selected) < count:
            selected.append(item)
    
    return selected


# Example usage
if __name__ == "__main__":
    # Load flow config
    import os
    flow_config = "ai_service/data/interview_flow.json"
    
    # Load all questions (pseudo-code - load from your files)
    # questions = load_all_questions()
    
    # Initialize controller
    # controller = InterviewFlowController(flow_config, questions)
    # controller.initialize_interview(role="backend", level="mid")
    
    # Get questions for first stage
    # questions = controller.get_next_questions()
    
    # Record answer
    # controller.record_answer(questions[0]['id'], score=0.85, red_flags=0)
    
    # Check if should advance
    # if controller.should_advance_stage():
    #     controller.advance_stage_if_ready()
    
    # Get summary
    # summary = controller.get_interview_summary()
    # print(json.dumps(summary, indent=2))
    
    print("✅ Interview Flow Controller module loaded successfully")
    print("Use InterviewFlowController class to orchestrate interviews")
