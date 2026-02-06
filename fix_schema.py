#!/usr/bin/env python3
"""
Comprehensive schema fix for all question files.
Fixes:
1. Removes 'phase' field (conflicts with stage)
2. Adds missing metadata: priority, interviewer_goal, prerequisite_difficulty
3. Adds scoring weights to evaluation_rubrics
4. Adds weight field if missing
5. Adds expected_duration_sec if missing
6. Validates all JSON files
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List
import re

DATA_DIR = Path("ai_service/data")

# Mapping of question types to interviewer goals
INTERVIEWER_GOALS = {
    "behavioral": "assess soft skills and maturity",
    "technical": "test technical depth and problem-solving",
    "system_design": "evaluate architecture and scalability thinking",
    "testing": "assess quality mindset and testing knowledge",
    "architecture": "test system design and real-world thinking",
    "resume": "verify project authenticity and ownership",
    "real_life": "test maturity and handling ambiguity",
    "hr_closing": "assess culture fit and motivation",
    "version_control": "evaluate development workflow knowledge",
}

# Priority mapping based on stage
PRIORITY_BY_STAGE = {
    "introduction": "core",
    "warmup": "core",
    "resume": "core",
    "resume_technical": "core",
    "technical": "core",
    "real_life": "core",
    "hr_closing": "core",
}

# Duration ranges (seconds)
DEFAULT_DURATIONS = {
    1: 60,    # 1 minute
    2: 90,    # 1.5 minutes
    3: 120,   # 2 minutes
    4: 180,   # 3 minutes
    5: 300,   # 5 minutes
}

# Scoring weights for evaluation rubric
RUBRIC_WEIGHTS = {
    "correctness": 0.25,
    "depth": 0.20,
    "clarity": 0.15,
    "real_experience": 0.20,
    "ownership": 0.20,
    "completeness": 0.15,
    "scalability": 0.15,
    "reliability": 0.15,
    "performance": 0.15,
    "communication": 0.20,
    "problem_solving": 0.20,
    "collaboration": 0.15,
    "leadership": 0.25,
    "strategy": 0.15,
}

def remove_phase_field(question: Dict[str, Any]) -> Dict[str, Any]:
    """Remove phase field from question."""
    if "phase" in question:
        del question["phase"]
    return question

def add_missing_metadata(question: Dict[str, Any], filename: str) -> Dict[str, Any]:
    """Add missing metadata fields."""
    
    # Determine stage if not present
    if "stage" not in question:
        # Try to infer from filename
        if "introduction" in filename:
            question["stage"] = "introduction"
        elif "warmup" in filename:
            question["stage"] = "warmup"
        elif "resume" in filename:
            question["stage"] = "resume"
        else:
            question["stage"] = "technical"
    
    # Determine category if not present
    if "category" not in question:
        if "behavioral" in filename or "leadership" in filename:
            question["category"] = "behavioral"
        elif "system_design" in filename:
            question["category"] = "system_design"
        elif "testing" in filename:
            question["category"] = "testing"
        else:
            question["category"] = "technical"
    
    # Add priority if missing
    if "priority" not in question:
        question["priority"] = PRIORITY_BY_STAGE.get(
            question.get("stage", "technical"), "core"
        )
    
    # Add interviewer_goal if missing
    if "interviewer_goal" not in question:
        category = question.get("category", "technical")
        question["interviewer_goal"] = INTERVIEWER_GOALS.get(
            category, "evaluate candidate skills"
        )
    
    # Add weight if missing
    if "weight" not in question:
        difficulty = question.get("difficulty", 2)
        # Higher difficulty = higher weight
        question["weight"] = round(1.0 + (difficulty * 0.25), 1)
    
    # Add expected_duration_sec if missing
    if "expected_duration_sec" not in question:
        difficulty = question.get("difficulty", 2)
        question["expected_duration_sec"] = DEFAULT_DURATIONS.get(difficulty, 120)
    
    # Add prerequisite_difficulty if missing (for difficulty 4-5 questions)
    if "prerequisite_difficulty" not in question:
        difficulty = question.get("difficulty", 1)
        if difficulty >= 4:
            question["prerequisite_difficulty"] = difficulty - 1
    
    return question

def add_rubric_weights(question: Dict[str, Any]) -> Dict[str, Any]:
    """Add scoring weights to evaluation_rubric if not present."""
    if "evaluation_rubric" not in question:
        return question
    
    rubric = question["evaluation_rubric"]
    
    # If rubric is a dict with non-numeric values, add weights
    if isinstance(rubric, dict):
        weighted_rubric = {}
        for key, value in rubric.items():
            if key in RUBRIC_WEIGHTS:
                # Add weight as metadata
                if isinstance(value, dict):
                    value["weight"] = RUBRIC_WEIGHTS[key]
                elif isinstance(value, str):
                    weighted_rubric[key] = {
                        "description": value,
                        "weight": RUBRIC_WEIGHTS[key]
                    }
                else:
                    weighted_rubric[key] = value
            else:
                weighted_rubric[key] = value
        
        question["evaluation_rubric"] = weighted_rubric
    
    return question

def fix_question_order(question: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure consistent field order in question."""
    ordered = {}
    
    # Define desired field order
    field_order = [
        "id", "stage", "category", "role", "level", "skill",
        "difficulty", "weight", "priority", "expected_duration_sec",
        "prerequisite_difficulty", "interviewer_goal",
        "question", "ideal_points", "evaluation_rubric",
        "strong_signals", "weak_signals", "red_flags", "follow_ups"
    ]
    
    # Add fields in desired order
    for field in field_order:
        if field in question:
            ordered[field] = question[field]
    
    # Add any remaining fields
    for field, value in question.items():
        if field not in ordered:
            ordered[field] = value
    
    return ordered

def process_file(filepath: Path) -> tuple[int, int, str]:
    """Process a single JSON file.
    
    Returns: (questions_processed, errors, status_msg)
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            return 0, 1, f"Not a list: {filepath.name}"
        
        # Process each question
        for question in data:
            question = remove_phase_field(question)
            question = add_missing_metadata(question, filepath.name)
            question = add_rubric_weights(question)
            question = fix_question_order(question)
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return len(data), 0, f"✅ Fixed {len(data)} questions"
    
    except json.JSONDecodeError as e:
        return 0, 1, f"❌ JSON Error: {e}"
    except Exception as e:
        return 0, 1, f"❌ Error: {e}"

def main():
    """Fix all question files."""
    print("=" * 70)
    print("COMPREHENSIVE SCHEMA FIX")
    print("=" * 70)
    
    files = sorted(DATA_DIR.glob("*.json"))
    total_questions = 0
    total_errors = 0
    
    for filepath in files:
        if filepath.name == "taxonomy.json":
            continue  # Skip taxonomy file
        
        count, errors, msg = process_file(filepath)
        total_questions += count
        total_errors += errors
        
        print(f"{filepath.name:40} {msg}")
    
    print("=" * 70)
    print(f"SUMMARY: {total_questions} questions fixed, {total_errors} errors")
    print("=" * 70)

if __name__ == "__main__":
    main()
