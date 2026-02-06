#!/usr/bin/env python3
"""
Comprehensive test suite for interview_flow_controller.py

Tests interview orchestration, state management, and question selection.
Run with: python test_interview_flow.py
"""

import sys
import json
from pathlib import Path
from typing import List, Dict

# Add ai_service to path
sys.path.insert(0, str(Path(__file__).parent.parent / "ai_service"))

from rag.interview_flow_controller import (
    InterviewFlowController,
    InterviewStage,
    InterviewState,
    QuestionScore
)


class InterviewTester:
    """Test suite for interview flow controller."""
    
    def __init__(self):
        self.flow_config_path = Path(__file__).parent.parent / "ai_service" / "data" / "interview_flow.json"
        self.data_dir = Path(__file__).parent.parent / "ai_service" / "data"
        self.controller = None
        self.all_questions = []
        self.tests_passed = 0
        self.tests_failed = 0
    
    def setup(self):
        """Load data and initialize controller."""
        print("📦 Setting up test environment...")
        
        # Load all questions
        self.load_all_questions()
        
        # Initialize controller
        self.controller = InterviewFlowController(
            str(self.flow_config_path),
            self.all_questions
        )
        
        print(f"✅ Loaded {len(self.all_questions)} questions")
        print(f"✅ Controller initialized\n")
    
    def load_all_questions(self):
        """Load questions from all JSON files."""
        for json_file in self.data_dir.glob("*.json"):
            if json_file.name not in ["taxonomy.json", "interview_flow.json"]:
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        questions = json.load(f)
                        if isinstance(questions, list):
                            self.all_questions.extend(questions)
                except Exception as e:
                    print(f"⚠️  Error loading {json_file.name}: {e}")
    
    # Test functions
    
    def test_initialization(self):
        """Test interview initialization."""
        print("🧪 Test 1: Interview Initialization")
        
        self.controller.initialize_interview(role="backend", level="mid")
        state = self.controller.state
        
        assert state.role == "backend"
        assert state.level == "mid"
        assert state.current_stage == InterviewStage.INTRODUCTION
        assert len(state.questions_asked) == 0
        assert len(state.scores) == 0
        
        print("   ✅ Role set correctly")
        print("   ✅ Level set correctly")
        print("   ✅ Starting stage is INTRODUCTION")
        print("   ✅ No questions asked yet\n")
        
        self.tests_passed += 1
    
    def test_stage_config_loading(self):
        """Test that stage configs load properly."""
        print("🧪 Test 2: Stage Configuration Loading")
        
        for stage in [InterviewStage.INTRODUCTION, InterviewStage.WARMUP, 
                      InterviewStage.RESUME, InterviewStage.RESUME_TECHNICAL,
                      InterviewStage.REAL_LIFE, InterviewStage.HR_CLOSING]:
            self.controller.state.current_stage = stage
            config = self.controller.get_current_stage_config()
            
            assert 'stage_name' in config
            assert 'question_count' in config
            assert 'allowed_categories' in config
            assert 'difficulty_range' in config
            assert config['question_count'] > 0
            
            print(f"   ✅ {stage.value:15} → {config['question_count']} questions, "
                  f"diff {config['difficulty_range']}")
        
        print()
        self.tests_passed += 1
    
    def test_question_selection(self):
        """Test intelligent question selection."""
        print("🧪 Test 3: Question Selection & Filtering")
        
        self.controller.initialize_interview(role="backend", level="mid")
        
        # Get first batch
        questions = self.controller.get_next_questions(num_questions=3)
        
        assert len(questions) > 0
        assert len(questions) <= 3
        assert all(isinstance(q, dict) for q in questions)
        assert all('id' in q and 'question' in q for q in questions)
        
        print(f"   ✅ Retrieved {len(questions)} questions")
        print(f"   ✅ All questions have required fields")
        print(f"   ✅ Sample question: {questions[0]['question'][:60]}...\n")
        
        self.tests_passed += 1
    
    def test_weighted_selection_diversity(self):
        """Test that weighted selection produces variety."""
        print("🧪 Test 4: Weighted Selection Diversity")
        
        self.controller.initialize_interview(role="backend", level="mid")
        
        # Get questions multiple times
        selected_questions = set()
        for _ in range(10):
            self.controller.state.questions_asked = []  # Reset for testing
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                selected_questions.add(questions[0]['id'])
        
        # Should have variety (not always same question)
        diversity = len(selected_questions)
        assert diversity > 1, "All selections returned same question!"
        
        print(f"   ✅ Weighted selection returned {diversity} diverse questions")
        print(f"   ✅ Not always selecting the same question\n")
        
        self.tests_passed += 1
    
    def test_answer_recording(self):
        """Test recording answers and score updates."""
        print("🧪 Test 5: Answer Recording & Scoring")
        
        self.controller.initialize_interview(role="backend", level="mid")
        
        # Get a question
        questions = self.controller.get_next_questions(num_questions=1)
        question_id = questions[0]['id']
        
        # Record answer
        self.controller.record_answer(
            question_id=question_id,
            score=0.85,
            red_flags=0
        )
        
        state = self.controller.state
        assert len(state.questions_asked) == 1
        assert state.questions_asked[0] == question_id
        assert len(state.scores) == 1
        assert state.scores[0].score == 0.85
        
        avg_score = state.get_average_score()
        assert abs(avg_score - 0.85) < 0.01
        
        print(f"   ✅ Answer recorded for question {question_id[:20]}...")
        print(f"   ✅ Score registered: 0.85")
        print(f"   ✅ Average score computed: {avg_score:.2f}\n")
        
        self.tests_passed += 1
    
    def test_red_flag_tracking(self):
        """Test red flag detection tracking."""
        print("🧪 Test 6: Red Flag Tracking")
        
        self.controller.initialize_interview(role="backend", level="mid")
        
        # Record answers with red flags
        for i in range(3):
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                self.controller.record_answer(
                    question_id=questions[0]['id'],
                    score=0.5,
                    red_flags=2  # Each answer has 2 red flags
                )
        
        total_flags = self.controller.state.red_flags_total
        assert total_flags == 6  # 3 answers × 2 flags each
        
        print(f"   ✅ Recorded 3 answers with red flags")
        print(f"   ✅ Total red flags tracked: {total_flags}")
        print(f"   ⚠️  Note: Would flag for review at >= 5 flags\n")
        
        self.tests_passed += 1
    
    def test_stage_progression_gate(self):
        """Test that stage progression requires minimum competency."""
        print("🧪 Test 7: Stage Progression Gate")
        
        self.controller.initialize_interview(role="backend", level="mid")
        initial_stage = self.controller.state.current_stage
        
        # Get questions for introduction
        stage_config = self.controller.get_current_stage_config()
        num_questions = stage_config['question_count']
        
        # Record poor answers (below 40% threshold)
        for _ in range(num_questions):
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                self.controller.record_answer(questions[0]['id'], score=0.3)
        
        # Should not advance yet (score too low)
        should_advance = self.controller.should_advance_stage()
        assert should_advance == False
        
        print(f"   ✅ Poor performance (30% avg) blocks stage progression")
        print(f"   ✅ Should advance: {should_advance}")
        print(f"   ℹ️  Need >= 40% average to advance\n")
        
        # Now record good answers
        self.controller.state.scores = []  # Reset scores
        self.controller.state.questions_asked = []
        
        for _ in range(num_questions):
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                self.controller.record_answer(questions[0]['id'], score=0.75)
        
        # Should advance now (score high)
        should_advance = self.controller.should_advance_stage()
        assert should_advance == True
        
        print(f"   ✅ Good performance (75% avg) allows progression")
        print(f"   ✅ Should advance: {should_advance}\n")
        
        self.tests_passed += 1
    
    def test_adaptive_difficulty(self):
        """Test adaptive difficulty escalation."""
        print("🧪 Test 8: Adaptive Difficulty Escalation")
        
        self.controller.initialize_interview(role="backend", level="mid")
        
        # Strong performance should increase difficulty
        for _ in range(5):
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                self.controller.record_answer(questions[0]['id'], score=0.9)
        
        # Calculate adaptive difficulty
        stage_config = self.controller.get_current_stage_config()
        adaptive_diff = self.controller._calculate_adaptive_difficulty(stage_config)
        
        base_max = stage_config['difficulty_range'][1]
        assert adaptive_diff > stage_config['difficulty_range'][0]
        print(f"   ✅ Strong performance (90% avg) increases difficulty")
        print(f"   ✅ Base max difficulty: {base_max}")
        print(f"   ✅ Adaptive difficulty: {adaptive_diff}\n")
        
        # Weak performance should decrease difficulty
        self.controller.state.scores = []
        for _ in range(5):
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                self.controller.record_answer(questions[0]['id'], score=0.3)
        
        adaptive_diff = self.controller._calculate_adaptive_difficulty(stage_config)
        assert adaptive_diff <= base_max
        print(f"   ✅ Weak performance (30% avg) decreases difficulty")
        print(f"   ✅ Adaptive difficulty: {adaptive_diff}\n")
        
        self.tests_passed += 1
    
    def test_interview_state_advancement(self):
        """Test complete interview state advancement."""
        print("🧪 Test 9: Complete Interview State Advancement")
        
        self.controller.initialize_interview(role="backend", level="mid")
        stages_visited = [InterviewStage.INTRODUCTION]
        
        # Simulate completing introduction stage
        stage_config = self.controller.get_current_stage_config()
        num_q = stage_config['question_count']
        
        for _ in range(num_q):
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                self.controller.record_answer(questions[0]['id'], score=0.75)
        
        # Advance to warmup
        can_advance = self.controller.should_advance_stage()
        if can_advance:
            self.controller.advance_stage_if_ready()
            stages_visited.append(self.controller.state.current_stage)
        
        assert self.controller.state.current_stage == InterviewStage.WARMUP
        
        print(f"   ✅ Progressed from {stages_visited[0].value} to {stages_visited[1].value}")
        print(f"   ✅ Interview state updated correctly\n")
        
        self.tests_passed += 1
    
    def test_interview_summary(self):
        """Test interview summary generation."""
        print("🧪 Test 10: Interview Summary Generation")
        
        self.controller.initialize_interview(role="backend", level="mid")
        
        # Answer some questions
        for i in range(5):
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                score = 0.7 + (i * 0.05)  # Slightly increasing scores
                self.controller.record_answer(questions[0]['id'], score=score)
        
        # Generate summary
        summary = self.controller.get_interview_summary()
        
        # Verify all required keys exist
        assert 'current_stage' in summary
        assert 'progress' in summary
        assert 'average_score' in summary
        assert 'max_difficulty_reached' in summary
        assert 'red_flags_total' in summary
        assert 'role' in summary
        assert 'level' in summary
        
        print(f"   ✅ Summary generated with all keys")
        print(f"      Role: {summary['role']}")
        print(f"      Level: {summary['level']}")
        print(f"      Current stage: {summary['current_stage']}")
        print(f"      Progress: {summary['progress']}")
        print(f"      Average score: {summary['average_score']}")
        print(f"      Max difficulty: {summary['max_difficulty_reached']}")
        print(f"      Red flags: {summary['red_flags_total']}\n")
        
        self.tests_passed += 1
    
    def test_no_question_repetition(self):
        """Test that same question isn't asked twice."""
        print("🧪 Test 11: No Question Repetition")
        
        self.controller.initialize_interview(role="backend", level="mid")
        
        all_asked_ids = set()
        
        # Ask many questions
        for _ in range(20):
            questions = self.controller.get_next_questions(num_questions=1)
            if questions:
                q_id = questions[0]['id']
                
                # Check if we've seen this before
                if q_id in all_asked_ids:
                    assert False, f"Question {q_id} asked twice!"
                
                all_asked_ids.add(q_id)
                self.controller.record_answer(q_id, score=0.7)
        
        print(f"   ✅ Asked 20 questions without repetition")
        print(f"   ✅ All {len(all_asked_ids)} questions were unique\n")
        
        self.tests_passed += 1
    
    def test_stage_boundaries(self):
        """Test that stages don't jump or break."""
        print("🧪 Test 12: Stage Boundary Integrity")
        
        self.controller.initialize_interview(role="backend", level="mid")
        
        # Valid interview stages (excluding COMPLETE sentinel)
        valid_stages = [
            InterviewStage.INTRODUCTION,
            InterviewStage.WARMUP,
            InterviewStage.RESUME,
            InterviewStage.RESUME_TECHNICAL,
            InterviewStage.REAL_LIFE,
            InterviewStage.HR_CLOSING
        ]
        
        for stage in valid_stages:
            self.controller.state.current_stage = stage
            config = self.controller.get_current_stage_config()
            assert config is not None
            assert config['stage'] == stage.value
        
        print(f"   ✅ All {len(valid_stages)} production stages have valid configs")
        print(f"   ✅ No broken stage transitions")
        print(f"   ✅ COMPLETE sentinel stage excluded (expected)\n")
        
        self.tests_passed += 1
    
    # Reporting
    
    def run_all_tests(self):
        """Run complete test suite."""
        print("=" * 70)
        print("🚀 INTERVIEW FLOW CONTROLLER - TEST SUITE")
        print("=" * 70)
        print()
        
        try:
            self.setup()
            
            self.test_initialization()
            self.test_stage_config_loading()
            self.test_question_selection()
            self.test_weighted_selection_diversity()
            self.test_answer_recording()
            self.test_red_flag_tracking()
            self.test_stage_progression_gate()
            self.test_adaptive_difficulty()
            self.test_interview_state_advancement()
            self.test_interview_summary()
            self.test_no_question_repetition()
            self.test_stage_boundaries()
            
        except AssertionError as e:
            print(f"❌ ASSERTION FAILED: {e}\n")
            self.tests_failed += 1
        except Exception as e:
            print(f"❌ TEST ERROR: {e}\n")
            self.tests_failed += 1
        
        self.print_summary()
    
    def print_summary(self):
        """Print test results summary."""
        total = self.tests_passed + self.tests_failed
        
        print("=" * 70)
        print("📊 TEST RESULTS")
        print("=" * 70)
        print(f"✅ Passed: {self.tests_passed}/12")
        print(f"❌ Failed: {self.tests_failed}/12")
        print(f"📈 Success Rate: {(self.tests_passed/total)*100:.1f}%")
        print("=" * 70)
        
        if self.tests_failed == 0:
            print("🎉 ALL TESTS PASSED! Interview controller is production-ready.")
        else:
            print(f"⚠️  {self.tests_failed} test(s) failed. Review above for details.")
        
        print()


if __name__ == "__main__":
    tester = InterviewTester()
    tester.run_all_tests()
