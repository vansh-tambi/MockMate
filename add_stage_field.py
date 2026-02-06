import json
import os
from collections import OrderedDict

# Define the stage mappings
stage_mapping = {
    "introduction": [
        "introductory_icebreaker.json",
        "self_awareness.json",
        "personality_questions.json"
    ],
    "warmup": [
        "warmup_questions.json",
        "hr_basic_questions.json"
    ],
    "resume_technical": [
        "programming_fundamentals.json",
        "web_frontend.json",
        "database_backend.json",
        "backend_intermediate_advanced.json",
        "backend_advanced.json",
        "dsa_questions.json",
        "problem_solving.json",
        "system_design.json"
    ],
    "real_life": [
        "behavioral_questions.json",
        "communication_teamwork.json",
        "situational_questions.json",
        "values_ethics_integrity.json",
        "leadership_questions.json",
        "leadership_behavioral.json"
    ],
    "hr_closing": [
        "hr_closing.json",
        "company_role_fit.json",
        "career_questions.json",
        "pressure_trick_questions.json"
    ]
}

# Priority files in order
priority_files = [
    "introductory_icebreaker.json",
    "warmup_questions.json",
    "behavioral_questions.json",
    "hr_closing.json",
    "programming_fundamentals.json",
    "web_frontend.json",
    "database_backend.json",
    "backend_intermediate_advanced.json",
    "communication_teamwork.json",
    "company_role_fit.json"
]

# Create reverse mapping: filename -> stage
file_to_stage = {}
for stage, files in stage_mapping.items():
    for file in files:
        file_to_stage[file] = stage

# Base directory
base_dir = r"c:\Users\hp\OneDrive\Desktop\WebDev\Projects\MockMate\ai_service\data"

# Results tracking
results = []

def add_stage_field(question, stage):
    """Add stage field right after id in a question object"""
    new_question = OrderedDict()
    for key, value in question.items():
        new_question[key] = value
        if key == "id":
            new_question["stage"] = stage
    return new_question

# Process each priority file
for filename in priority_files:
    file_path = os.path.join(base_dir, filename)
    
    if not os.path.exists(file_path):
        results.append(f"❌ {filename}: File not found")
        continue
    
    # Get the stage for this file
    stage = file_to_stage.get(filename)
    if not stage:
        results.append(f"❌ {filename}: No stage mapping found")
        continue
    
    try:
        # Read the JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        
        # Count questions
        question_count = len(questions)
        
        # Check if stage already exists in first question
        if questions and "stage" in questions[0]:
            results.append(f"⚠️  {filename}: Already has stage field ({question_count} questions)")
            continue
        
        # Add stage field to each question
        updated_questions = []
        for question in questions:
            updated_question = add_stage_field(question, stage)
            updated_questions.append(updated_question)
        
        # Write back to file with proper formatting
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(updated_questions, f, indent=2, ensure_ascii=False)
        
        results.append(f"✅ {filename}: Updated {question_count} questions with stage '{stage}'")
        
    except Exception as e:
        results.append(f"❌ {filename}: Error - {str(e)}")

# Print results
print("\n" + "="*70)
print("STAGE FIELD UPDATE SUMMARY")
print("="*70 + "\n")

for result in results:
    print(result)

print("\n" + "="*70)
print(f"Total files processed: {len(results)}")
print("="*70)
