import requests
import json

API_URL = "http://localhost:5000/api/generate-qa"
PAYLOAD = {
    "resumeText": "Software Engineer with 5 years of experience in full-stack development using React, Node.js, and AWS",
    "jobDescription": "Senior Software Engineer position requiring 5+ years of experience"
}

print("Testing question randomization...")
print("=" * 60)

# Make 3 requests to see if questions vary
all_questions = []
for i in range(3):
    print(f"\nRequest {i+1}:")
    try:
        response = requests.post(API_URL, json=PAYLOAD, timeout=120)
        response.raise_for_status()
        data = response.json()
        
        if "qaPairs" in data:
            questions = [pair["question"] for pair in data["qaPairs"]]
            all_questions.append(questions)
            
            print(f"  First 3 questions:")
            for j, q in enumerate(questions[:3]):
                print(f"    {j+1}. {q}")
            
            # Check if first question is always "Tell me about yourself"
            first_q = questions[0]
            if "Tell me about yourself" in first_q:
                print(f"  ⚠️  First question: '{first_q}'")
            else:
                print(f"  ✅ First question varies: '{first_q}'")
        else:
            print(f"  ❌ Unexpected response format: {data.keys()}")
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Error: {e}")

# Compare uniqueness across requests
print("\n" + "=" * 60)
print("RANDOMIZATION CHECK:")
if len(all_questions) >= 2:
    if all_questions[0] == all_questions[1]:
        print("❌ FAILED: Questions are identical between requests (not randomized)")
    else:
        # Find differences
        differences = sum(1 for q1, q2 in zip(all_questions[0], all_questions[1]) if q1 != q2)
        print(f"✅ PASSED: {differences}/10 questions changed between requests")
        
        # Check if first question varies across requests
        first_questions = [qs[0] for qs in all_questions]
        unique_first = len(set(first_questions))
        print(f"✅ First question uniqueness: {unique_first}/3 different in 3 requests")

print("\n" + "=" * 60)
