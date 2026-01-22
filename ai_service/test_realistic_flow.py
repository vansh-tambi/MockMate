"""
Test Script for Realistic Interview Flow

Run this to verify the new interview system works correctly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from session_context import InterviewSession, INTERVIEW_MODE_CONFIG
from rag.retrieve import QuestionRetriever
import json

def test_session_management():
    """Test session context tracking"""
    print("=" * 60)
    print("TEST 1: Session Management")
    print("=" * 60)
    
    session = InterviewSession()
    
    # Set user context
    session.set_user_context(
        skills=["React", "Node.js", "MongoDB"],
        education="B.Tech CSE",
        projects=["MockMate", "ChatApp"],
        experience_level="intern",
        target_role="Frontend Intern"
    )
    
    print(f"✓ Created session: {session.session_id}")
    print(f"✓ Skills: {session.resume_data['skills']}")
    print(f"✓ Projects: {session.resume_data['projects']}")
    print(f"✓ Current phase: {session.current_phase}")
    
    # Mark some questions as asked
    session.mark_question_asked("warmup_001")
    session.mark_question_answered("warmup_002", "I'm a CS student...", score=7)
    session.mark_skill_covered("React")
    
    print(f"✓ Asked questions: {len(session.asked_questions)}")
    print(f"✓ Answered questions: {len(session.answered_questions)}")
    print(f"✓ Covered skills: {session.covered_skills}")
    print(f"✓ Uncovered skills: {session.get_uncovered_skills()}")
    
    stats = session.get_statistics()
    print(f"\n📊 Session Statistics:")
    print(json.dumps(stats, indent=2))
    
    return session

def test_warmup_priority():
    """Test that warmup questions always come first"""
    print("\n" + "=" * 60)
    print("TEST 2: Warmup Priority")
    print("=" * 60)
    
    try:
        retriever = QuestionRetriever()
        session = InterviewSession()
        
        session.set_user_context(
            skills=["React", "Node.js"],
            target_role="Frontend Developer"
        )
        
        # Get first batch of questions
        questions = retriever.retrieve_phased(
            session=session,
            resume_text="Frontend developer with React experience",
            job_description="Frontend Developer role",
            top_k=10
        )
        
        print(f"✓ Retrieved {len(questions)} questions")
        
        # Check warmup priority
        warmup_count = sum(1 for q in questions if q.get("phase") == "warmup")
        print(f"✓ Warmup questions: {warmup_count}")
        
        # First 5 should be warmup
        first_five_phases = [q.get("phase") for q in questions[:5]]
        all_warmup = all(phase == "warmup" for phase in first_five_phases)
        
        if all_warmup:
            print("✅ PASS: First 5 questions are all warmup")
        else:
            print(f"❌ FAIL: First 5 phases are {first_five_phases}")
        
        # Print first few questions
        print(f"\nFirst 3 questions:")
        for i, q in enumerate(questions[:3], 1):
            print(f"{i}. [{q.get('phase')}] {q['question']}")
        
        return questions, session
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None, None

def test_no_repetition():
    """Test that questions don't repeat"""
    print("\n" + "=" * 60)
    print("TEST 3: No Repetition")
    print("=" * 60)
    
    try:
        retriever = QuestionRetriever()
        session = InterviewSession()
        
        # Get first batch
        questions1 = retriever.retrieve_phased(session, "", "", top_k=5)
        print(f"✓ Batch 1: {len(questions1)} questions")
        
        # Mark them as asked
        for q in questions1:
            session.mark_question_asked(q["id"])
        
        # Get second batch
        questions2 = retriever.retrieve_phased(session, "", "", top_k=5)
        print(f"✓ Batch 2: {len(questions2)} questions")
        
        # Check for overlap
        ids1 = set(q["id"] for q in questions1)
        ids2 = set(q["id"] for q in questions2)
        overlap = ids1.intersection(ids2)
        
        if len(overlap) == 0:
            print("✅ PASS: No repeated questions")
        else:
            print(f"❌ FAIL: {len(overlap)} questions repeated: {overlap}")
        
        print(f"\nBatch 1 IDs: {list(ids1)[:3]}...")
        print(f"Batch 2 IDs: {list(ids2)[:3]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def test_skill_coverage():
    """Test skill-aware questioning"""
    print("\n" + "=" * 60)
    print("TEST 4: Skill Coverage")
    print("=" * 60)
    
    try:
        retriever = QuestionRetriever()
        session = InterviewSession()
        
        session.set_user_context(
            skills=["React", "Node.js", "MongoDB"]
        )
        
        # Get questions
        questions = retriever.retrieve_phased(session, "", "", top_k=15)
        
        # Count questions per skill
        skill_counts = {}
        for q in questions:
            skill = q.get("skill", "").lower()
            if skill:
                skill_counts[skill] = skill_counts.get(skill, 0) + 1
        
        print(f"✓ Questions by skill: {skill_counts}")
        
        # Check if target skills are covered
        target_skills_lower = [s.lower() for s in session.target_skills]
        covered_skills = set(skill_counts.keys())
        
        matched = covered_skills.intersection(set(target_skills_lower))
        
        if len(matched) >= 1:
            print(f"✅ PASS: Covered {len(matched)} target skills: {matched}")
        else:
            print(f"❌ FAIL: No target skills covered")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def test_interview_modes():
    """Test interview mode configurations"""
    print("\n" + "=" * 60)
    print("TEST 5: Interview Modes")
    print("=" * 60)
    
    print(f"✓ Available modes: {list(INTERVIEW_MODE_CONFIG.keys())}")
    
    for mode, config in INTERVIEW_MODE_CONFIG.items():
        print(f"\n{mode.upper()}: {config['name']}")
        print(f"  Description: {config['description']}")
        print(f"  Phases: {', '.join(config['phases'])}")
        print(f"  Distribution: {config['question_distribution']}")
    
    print("\n✅ PASS: All interview modes loaded")

def test_follow_ups():
    """Test follow-up question generation"""
    print("\n" + "=" * 60)
    print("TEST 6: Follow-Up Questions")
    print("=" * 60)
    
    try:
        retriever = QuestionRetriever()
        session = InterviewSession()
        
        session.set_user_context(
            projects=["MockMate"],
            education="B.Tech CSE"
        )
        
        # Get a warmup question
        warmup_q = retriever.get_by_id("warmup_001")
        if not warmup_q:
            print("⚠️  Warmup question not found")
            return
        
        # Simulate user mentioning a project
        user_answer = "I'm a CS student who built MockMate, a React project"
        session.add_mentioned_topic("projects", "MockMate")
        
        # Get follow-ups
        follow_ups = retriever.get_follow_up_questions(
            warmup_q,
            user_answer,
            session
        )
        
        print(f"✓ Generated {len(follow_ups)} follow-up questions")
        
        if follow_ups:
            print("\nFollow-up questions:")
            for fu in follow_ups:
                print(f"  - {fu['question']}")
            print("✅ PASS: Follow-ups generated")
        else:
            print("⚠️  No follow-ups (may be expected)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Run all tests"""
    print("\n🧪 TESTING REALISTIC INTERVIEW FLOW SYSTEM")
    print("=" * 60)
    
    try:
        # Test 1: Session management
        session = test_session_management()
        
        # Test 2: Warmup priority
        questions, session = test_warmup_priority()
        
        # Test 3: No repetition
        test_no_repetition()
        
        # Test 4: Skill coverage
        test_skill_coverage()
        
        # Test 5: Interview modes
        test_interview_modes()
        
        # Test 6: Follow-ups
        test_follow_ups()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS COMPLETED")
        print("=" * 60)
        print("\nNOTE: Some tests may show warnings if embeddings aren't built.")
        print("Run 'python rag/embeddings.py' to build embeddings.")
        
    except Exception as e:
        print(f"\n❌ TEST SUITE FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
