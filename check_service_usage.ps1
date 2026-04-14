Write-Host "Testing AI Service vs Gemini Usage" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Direct test - call the resume parsing endpoint
Write-Host "TEST 1: Resume Parsing Service Check" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

# Create test resume JSON
$testBody = @'
{
  "text": "Python developer with 5 years Django and FastAPI experience. Skills: Python, PostgreSQL, Docker, AWS, Redis, JavaScript."
}
'@

Write-Host "Sending test resume to: http://localhost:5000/api/parse-resume" -ForegroundColor White
Write-Host ""

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:5000/api/parse-resume" `
        -Method Post `
        -ContentType "application/json" `
        -Body $testBody `
        -UseBasicParsing `
        -TimeoutSec 15 `
        -ErrorAction Stop
    
    Write-Host "Status: $($response.StatusCode) OK" -ForegroundColor Green
    Write-Host ""
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "RESULTS:" -ForegroundColor Cyan
    Write-Host "--------"
    Write-Host ""
    Write-Host "Service Used: " -NoNewline -ForegroundColor White
    
    if ($data.service -eq 'ai-service') {
        Write-Host "$($data.service)" -ForegroundColor Green -NoNewline
        Write-Host " ✅ (PHI3 MODEL - LOCAL)" -ForegroundColor Green
    } elseif ($data.service -eq 'gemini') {
        Write-Host "$($data.service)" -ForegroundColor Yellow -NoNewline
        Write-Host " ⚠️  (FALLBACK - Check AI Service)" -ForegroundColor Yellow
    } else {
        Write-Host "$($data.service)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Success: $($data.success)"
    Write-Host "Skills Extracted: $($data.data.skills.Count)"
    Write-Host "Text Length: $($data.textLength) chars"
    Write-Host ""
    
    if ($data.data.skills.Count -gt 0) {
        Write-Host "Sample Skills:" -ForegroundColor Cyan
        $data.data.skills | Select-Object -First 5 | ForEach-Object {
            Write-Host "  • $_"
        }
    }
    
    if ($data.warning) {
        Write-Host ""
        Write-Host "⚠️ Warning: $($data.warning)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: " -ForegroundColor Red -NoNewline
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Test 2: Check logs for service usage
Write-Host "TEST 2: How to Monitor Service Usage" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "Check the Node server terminal for these log messages:" -ForegroundColor White
Write-Host ""
Write-Host "If Using PHI3 (AI Service):" -ForegroundColor Green
Write-Host "  ✅ AI Service response received" -ForegroundColor Green
Write-Host "  🔄 Calling AI Service (http://localhost:8000)..." -ForegroundColor Green
Write-Host ""
Write-Host "If Using Gemini (Fallback):" -ForegroundColor Yellow
Write-Host "  🔄 Falling back to Gemini API..." -ForegroundColor Yellow
Write-Host "  🔄 Calling Gemini API (attempt...)" -ForegroundColor Yellow
Write-Host ""
Write-Host "If Using Pattern-Based (Last Resort):" -ForegroundColor Gray
Write-Host "  ⚠️ Using pattern-based fallback extraction" -ForegroundColor Gray
Write-Host ""

Write-Host ""

# Test 3: Service Priority Explanation
Write-Host "SERVICE CALL PRIORITY (Implemented)" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "1️⃣  PRIMARY: AI Service (Local phi3)" -ForegroundColor Green
Write-Host "    Location: http://localhost:8000/api/generate-qa" -ForegroundColor Gray
Write-Host "    Status: ✅ No rate limits, local model" -ForegroundColor Green
Write-Host ""

Write-Host "2️⃣  SECONDARY: Gemini API" -ForegroundColor Yellow
Write-Host "    Used if: AI Service fails/unavailable" -ForegroundColor Gray
Write-Host "    Status: ⚠️ Can be rate-limited" -ForegroundColor Yellow
Write-Host ""

Write-Host "3️⃣  TERTIARY: Pattern-Based Extraction" -ForegroundColor Gray
Write-Host "    Used if: Both AI Service & Gemini fail" -ForegroundColor Gray
Write-Host "    Status: 🔄 Always works, less accurate" -ForegroundColor Gray
Write-Host ""

Write-Host ""

# Test 4: Force AI Service Usage
Write-Host "HOW TO FORCE AI SERVICE USAGE" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "To DISABLE Gemini fallback temporarily:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Stop Node server" -ForegroundColor Gray
Write-Host "  2. Remove/comment GEMINI_API_KEY from .env" -ForegroundColor Gray
Write-Host "  3. Restart Node server" -ForegroundColor Gray
Write-Host ""
Write-Host "  Now if AI Service fails, pattern-based extraction is used." -ForegroundColor Gray
Write-Host "  This guarantees phi3 is the primary service." -ForegroundColor White
Write-Host ""

