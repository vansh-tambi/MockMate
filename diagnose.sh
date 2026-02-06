#!/bin/bash

# MockMate Staged Progression - Diagnostic Script
# Run this to verify the system is set up correctly

echo "🔍 MockMate System Diagnostic"
echo "============================="
echo ""

# Check if server is running
echo "1️⃣  Checking if server is running..."
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Server is running"
    HEALTH=$(curl -s http://localhost:5000/api/health)
    echo "   Response: $HEALTH"
else
    echo "❌ Server is NOT running"
    echo "   Fix: Run 'npm start' in the server directory"
    exit 1
fi

echo ""
echo "2️⃣  Checking Gemini API Key..."
if echo "$HEALTH" | grep -q '"hasGeminiKey":true'; then
    echo "✅ GEMINI_API_KEY is set"
else
    echo "❌ GEMINI_API_KEY is missing"
    echo "   Fix: Create server/.env with GEMINI_API_KEY=your_key"
    exit 1
fi

echo ""
echo "3️⃣  Checking stage data loading..."
STAGES=$(curl -s http://localhost:5000/api/debug/stages)
echo "   Stages endpoint response:"

# Extract and display stage info
echo "$STAGES" | grep -o '"[a-z_]*":\s*{[^}]*}' | while read line; do
    echo "   $line"
done

echo ""
echo "4️⃣  Testing question generation (Q0)..."
TEST=$(curl -s -X POST http://localhost:5000/api/debug/test-question \
  -H "Content-Type: application/json" \
  -d '{"questionIndex": 0}')

if echo "$TEST" | grep -q '"stage":"introduction"'; then
    echo "✅ Question generation works"
    echo "   Stage: $(echo "$TEST" | grep -o '"stage":"[^"]*"')"
    echo "   Questions available: $(echo "$TEST" | grep -o '"questionsInStage":[0-9]*')"
else
    echo "❌ Question generation failed"
    echo "   Error: $(echo "$TEST" | grep -o '"error":"[^"]*"')"
    exit 1
fi

echo ""
echo "5️⃣  Testing full Q&A generation..."
QA=$(curl -s -X POST http://localhost:5000/api/generate-qa \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "I am a software engineer with 3 years of experience",
    "jobDescription": "SDE Intern",
    "questionIndex": 0,
    "askedQuestions": []
  }')

if echo "$QA" | grep -q '"success":true'; then
    echo "✅ Full Q&A endpoint works"
    STAGE=$(echo "$QA" | grep -o '"stage":"[^"]*"' | head -1)
    QTEXT=$(echo "$QA" | grep -o '"text":"[^"]*"' | head -1 | cut -c10-60)
    echo "   Stage: $STAGE"
    echo "   Question: $QTEXT..."
else
    echo "❌ Full Q&A endpoint failed"
    echo "   Response: $(echo "$QA" | head -c 200)"
    exit 1
fi

echo ""
echo "================================"
echo "✅ All checks passed! System is ready."
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000 in browser"
echo "2. Upload resume (PDF or text)"
echo "3. Enter job role"
echo "4. Click 'Start Interview' to begin staged progression"
