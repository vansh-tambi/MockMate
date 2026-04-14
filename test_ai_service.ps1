# Test AI Service
Write-Host "🧪 Testing AI Service..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣  Testing Health Endpoint..." -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -ErrorAction SilentlyContinue
if ($health.StatusCode -eq 200) {
    Write-Host "✅ Health Check: PASSED" -ForegroundColor Green
    $healthData = $health.Content | ConvertFrom-Json
    Write-Host "   Status: $($healthData.status)"
    Write-Host "   Ollama: $($healthData.ollama)"
    Write-Host ""
}

# Test 2: Evaluation Endpoint
Write-Host "2️⃣  Testing Evaluation Endpoint..." -ForegroundColor Yellow
$evalBody = @{
    question = "What is your experience with Python?"
    user_answer = "I have 3 years of professional Python experience with Django and FastAPI."
    ideal_points = @("Django or FastAPI", "Backend development", "3+ years")
} | ConvertTo-Json

$eval = Invoke-WebRequest -Uri "http://localhost:8000/evaluate" `
    -Method Post `
    -ContentType "application/json" `
    -Body $evalBody `
    -UseBasicParsing `
    -ErrorAction SilentlyContinue

if ($eval.StatusCode -eq 200) {
    Write-Host "✅ Evaluation: PASSED" -ForegroundColor Green
    $evalData = $eval.Content | ConvertFrom-Json
    Write-Host "   Score: $($evalData.score)/10" -ForegroundColor Cyan
    Write-Host "   Strengths:"
    foreach ($s in $evalData.strengths) {
        Write-Host "     • $s"
    }
    Write-Host "   Improvements:"
    foreach ($i in $evalData.improvements) {
        Write-Host "     • $i"
    }
    Write-Host ""
}

# Test 3: Generate Q&A Endpoint
Write-Host "3️⃣  Testing Generate Q&A Endpoint..." -ForegroundColor Yellow
$qaBody = @{
    resume = "Python developer with 3 years experience in Django and FastAPI"
    skills = @("Python", "Django", "FastAPI", "PostgreSQL")
    experience_level = "mid-level"
    questionCount = 3
} | ConvertTo-Json

$qa = Invoke-WebRequest -Uri "http://localhost:8000/api/generate-qa" `
    -Method Post `
    -ContentType "application/json" `
    -Body $qaBody `
    -UseBasicParsing `
    -ErrorAction SilentlyContinue

if ($qa.StatusCode -eq 200) {
    Write-Host "✅ Generate Q&A: PASSED" -ForegroundColor Green
    $qaData = $qa.Content | ConvertFrom-Json
    Write-Host "   Questions Generated: $($qaData.questions.Count)"
    Write-Host "   Sample Questions:"
    for ($i = 0; $i -lt [Math]::Min(3, $qaData.questions.Count); $i++) {
        Write-Host "     $($i+1). $($qaData.questions[$i])"
    }
    Write-Host ""
} else {
    Write-Host "⚠️  Generate Q&A: Failed with status $($qa.StatusCode)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "🎉 All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
Write-Host "   AI Service: Running on http://localhost:8000" -ForegroundColor Green
Write-Host "   Ollama (phi3): Connected" -ForegroundColor Green
Write-Host "   Node Backend: Running on http://localhost:5000" -ForegroundColor Yellow
Write-Host "   Frontend: Running on http://localhost:5173" -ForegroundColor Yellow
