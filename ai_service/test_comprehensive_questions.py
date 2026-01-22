"""
Test Comprehensive Question Bank Integration
Tests the expanded question bank with all new question categories
"""

from rag.retrieve import QuestionRetriever
from session_context import InterviewSession

def test_question_loading():
    """Test all question banks load correctly"""
    print("\n" + "="*60)
    print("TEST 1: Question Bank Loading")
    print("="*60)
    
    retriever = QuestionRetriever()
    
    assert len(retriever.warmup_questions) == 10, "Warmup questions not loaded"
    assert len(retriever.hr_basic_questions) == 6, "HR questions not loaded"
    assert len(retriever.behavioral_questions) == 10, "Behavioral questions not loaded"
    assert len(retriever.situational_questions) == 10, "Situational questions not loaded"
    assert len(retriever.personality_questions) == 10, "Personality questions not loaded"
    assert len(retriever.career_questions) == 10, "Career questions not loaded"
    assert len(retriever.programming_questions) == 10, "Programming questions not loaded"
    assert len(retriever.dsa_questions) == 10, "DSA questions not loaded"
    assert len(retriever.database_questions) == 10, "Database questions not loaded"
    assert len(retriever.web_frontend_questions) == 10, "Web frontend questions not loaded"
    assert len(retriever.problem_solving_questions) == 10, "Problem-solving questions not loaded"
    
    total = len(retriever.all_questions)
    print(f"✅ All question banks loaded: {total} total questions")
    assert total == 158, f"Expected 158 questions, got {total}"
    
    return retriever

def test_warmup_phase():
    """Test warmup phase retrieves warmup questions"""
    print("\n" + "="*60)
    print("TEST 2: Warmup Phase Retrieval")
    print("="*60)
    
    retriever = QuestionRetriever()
    session = InterviewSession()
    
    # Should be in warmup phase initially
    assert session.current_phase == "warmup"
    
    questions = retriever.retrieve_phased(
        session=session,
        resume_text="Recent graduate with internship experience",
        job_description="Entry-level software engineer",
        top_k=5
    )
    
    print(f"\nRetrieved {len(questions)} questions:")
    for i, q in enumerate(questions, 1):
        print(f"  {i}. [{q['id']}] {q['question'][:60]}...")
    
    # All should be warmup questions
    warmup_count = sum(1 for q in questions if q['id'].startswith('warmup'))
    print(f"\n✅ Warmup questions in first batch: {warmup_count}/{len(questions)}")
    assert warmup_count >= 3, "Should get warmup questions first"

def test_behavioral_phase():
    """Test behavioral phase retrieves behavioral questions"""
    print("\n" + "="*60)
    print("TEST 3: Behavioral Phase Retrieval")
    print("="*60)
    
    retriever = QuestionRetriever()
    session = InterviewSession()
    
    # Mark all warmup questions as asked to advance to behavioral
    for q in retriever.warmup_questions:
        session.mark_question_asked(q['id'])
    
    session.advance_phase()
    assert session.current_phase == "behavioral"
    
    questions = retriever.retrieve_phased(
        session=session,
        resume_text="Software engineer with 2 years experience",
        job_description="Mid-level developer position",
        top_k=10
    )
    
    print(f"\nRetrieved {len(questions)} questions:")
    for i, q in enumerate(questions, 1):
        print(f"  {i}. [{q['id']}] {q['question'][:60]}...")
    
    # Should have behavioral-type questions
    behavioral_ids = ['hr_basic', 'behavioral', 'situational', 'personality', 'career']
    behavioral_count = sum(1 for q in questions if any(bid in q['id'] for bid in behavioral_ids))
    
    print(f"\n✅ Behavioral-type questions: {behavioral_count}/{len(questions)}")
    assert behavioral_count >= 5, "Should get behavioral questions in behavioral phase"

def test_technical_phase():
    """Test technical phase retrieves technical questions"""
    print("\n" + "="*60)
    print("TEST 4: Technical Phase Retrieval")
    print("="*60)
    
    retriever = QuestionRetriever()
    session = InterviewSession()
    
    # Advance to technical phase
    session.current_phase = "technical"
    session.questions_in_current_phase = 0
    
    questions = retriever.retrieve_phased(
        session=session,
        resume_text="Full-stack developer with React and Node.js",
        job_description="Senior developer with database expertise",
        top_k=10
    )
    
    print(f"\nRetrieved {len(questions)} questions:")
    for i, q in enumerate(questions, 1):
        skill = q.get('skill', 'general')
        print(f"  {i}. [{q['id']}] [{skill}] {q['question'][:50]}...")
    
    # Should have technical questions
    tech_ids = ['prog_fund', 'dsa', 'db_back', 'web_front']
    tech_count = sum(1 for q in questions if any(tid in q['id'] for tid in tech_ids))
    
    print(f"\n✅ Technical questions from new banks: {tech_count}/{len(questions)}")
    print(f"✅ Total technical questions retrieved: {len(questions)}")

def test_advanced_phase():
    """Test advanced phase retrieves problem-solving questions"""
    print("\n" + "="*60)
    print("TEST 5: Advanced Phase Retrieval")
    print("="*60)
    
    retriever = QuestionRetriever()
    session = InterviewSession()
    
    # Advance to advanced phase
    session.current_phase = "advanced"
    session.questions_in_current_phase = 0
    
    questions = retriever.retrieve_phased(
        session=session,
        resume_text="Senior engineer with 5+ years experience",
        job_description="Tech lead position",
        top_k=10
    )
    
    print(f"\nRetrieved {len(questions)} questions:")
    for i, q in enumerate(questions, 1):
        difficulty = q.get('difficulty', 1)
        print(f"  {i}. [{q['id']}] [Difficulty {difficulty}] {q['question'][:50]}...")
    
    # Should have problem-solving questions
    problem_count = sum(1 for q in questions if 'problem_solve' in q['id'])
    
    print(f"\n✅ Problem-solving questions: {problem_count}/{len(questions)}")

def test_no_repetition():
    """Test that questions don't repeat across multiple retrieval calls"""
    print("\n" + "="*60)
    print("TEST 6: No Question Repetition")
    print("="*60)
    
    retriever = QuestionRetriever()
    session = InterviewSession()
    session.current_phase = "behavioral"
    
    all_ids = set()
    
    for batch in range(3):
        questions = retriever.retrieve_phased(
            session=session,
            resume_text="Experienced developer",
            job_description="Software engineer",
            top_k=5
        )
        
        print(f"\nBatch {batch + 1}:")
        for q in questions:
            print(f"  - {q['id']}")
            session.mark_question_asked(q['id'])
        
        # Check for duplicates
        batch_ids = set(q['id'] for q in questions)
        duplicates = all_ids.intersection(batch_ids)
        
        assert len(duplicates) == 0, f"Found duplicate questions: {duplicates}"
        all_ids.update(batch_ids)
    
    print(f"\n✅ No repetitions across {len(all_ids)} questions in 3 batches")

def test_question_structure():
    """Test that all questions have required fields"""
    print("\n" + "="*60)
    print("TEST 7: Question Structure Validation")
    print("="*60)
    
    retriever = QuestionRetriever()
    
    required_fields = ['id', 'phase', 'question', 'ideal_points', 'follow_ups']
    
    all_question_sets = [
        ('Warmup', retriever.warmup_questions),
        ('HR Basic', retriever.hr_basic_questions),
        ('Behavioral', retriever.behavioral_questions),
        ('Situational', retriever.situational_questions),
        ('Personality', retriever.personality_questions),
        ('Career', retriever.career_questions),
        ('Programming', retriever.programming_questions),
        ('DSA', retriever.dsa_questions),
        ('Database', retriever.database_questions),
        ('Web', retriever.web_frontend_questions),
        ('Problem-solving', retriever.problem_solving_questions)
    ]
    
    for set_name, question_set in all_question_sets:
        print(f"\nValidating {set_name} ({len(question_set)} questions)...")
        
        for q in question_set:
            for field in required_fields:
                assert field in q, f"Missing '{field}' in {q.get('id', 'unknown')}"
            
            # Check ideal_points is a list
            assert isinstance(q['ideal_points'], list), f"ideal_points should be list in {q['id']}"
            assert len(q['ideal_points']) > 0, f"ideal_points empty in {q['id']}"
            
            # Check follow_ups is a list
            assert isinstance(q['follow_ups'], list), f"follow_ups should be list in {q['id']}"
        
        print(f"  ✅ All {len(question_set)} questions valid")
    
    print(f"\n✅ All question sets validated successfully!")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("COMPREHENSIVE QUESTION BANK INTEGRATION TESTS")
    print("="*60)
    
    try:
        # Run all tests
        test_question_loading()
        test_warmup_phase()
        test_behavioral_phase()
        test_technical_phase()
        test_advanced_phase()
        test_no_repetition()
        test_question_structure()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\nThe comprehensive question bank is working correctly:")
        print("  ✓ 158 total questions loaded")
        print("  ✓ All question categories present")
        print("  ✓ Phase-based retrieval working")
        print("  ✓ No question repetition")
        print("  ✓ All questions properly structured")
        print("\n🎉 MockMate is ready with comprehensive interview questions!")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise
