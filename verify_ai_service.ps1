#!/usr/bin/env pwsh
<#
MockMate AI Service Usage Verification
Checks which AI service (phi3 or Gemini) is being used
#>

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AI Service Usage Verification Toolkit    " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Service Status
Write-Host "1️⃣  CHECKING SERVICE STATUS" -ForegroundColor Yellow
Write-Host "-".PadRight(40, '-') -ForegroundColor Gray

Write-Host "Checking AI Service (port 8000)..."
try {
    $aiService = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  ✅ AI Service RUNNING" -ForegroundColor Green
    $aiData = $aiService.Content | ConvertFrom-Json
    Write-Host "     Status: $($aiData.status)"
    Write-Host "     Ollama: $($aiData.ollama)"
} catch {
    Write-Host "  ❌ AI Service NOT running (phi3 will be unavailable)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking Node Backend (port 5000)..."
try {
    $nodeServer = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  ✅ Node Server RUNNING" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node Server NOT running" -ForegroundColor Red
}

Write-Host ""

# 2. Test Resume Parsing - Check Which Service is Used
Write-Host "2️⃣  TESTING RESUME PARSING" -ForegroundColor Yellow
Write-Host "-".PadRight(40, '-')  -ForegroundColor Gray

Write-Host "Sending test resume to /api/parse-resume..."
Write-Host ""

try {
    $testResume = @{
        text = "Python developer with Django and FastAPI experience. Skills: Python, PostgreSQL, Docker, AWS. 5 years backend development."
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/parse-resume" `
        -Method Post `
        -ContentType "application/json" `
        -Body $testResume `
        -UseBasicParsing -TimeoutSec 10
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 PARSING RESULT:" -ForegroundColor Cyan
    Write-Host "  Service Used: " -NoNewline
    
    switch ($data.service) {
        'ai-service' {
            Write-Host "$($data.service) ✅ (LOCAL PHI3 - GOOD!)" -ForegroundColor Green
        }
        'gemini' {
            Write-Host "$($data.service) ⚠️  (FALLBACK - Check AI Service!)" -ForegroundColor Yellow
        }
        'fallback' {
            Write-Host "$($data.service) ⚠️  (Pattern-based - Check Gemini!)" -ForegroundColor Yellow
        }
        default {
            Write-Host "$($data.service)" -ForegroundColor White
        }
    }
    
    Write-Host "  Success: $($data.success)"
    Write-Host "  Skills Found: $($data.data.skills.Count)"
    Write-Host ""
    Write-Host "Extracted Skills:" -ForegroundColor Cyan
    $data.data.skills | Select-Object -First 5 | ForEach-Object {
        Write-Host "    • $_"
    }
    
    if ($data.warning) {
        Write-Host ""
        Write-Host "⚠️  Warning: $($data.warning)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Test Question Generation - Check Which Service is Used
Write-Host "3️⃣  TESTING QUESTION GENERATION" -ForegroundColor Yellow
Write-Host "-".PadRight(40, '-') -ForegroundColor Gray

Write-Host "Sending test request to /api/generate-qa..."
Write-Host ""

try {
    $qaRequest = @{
        resume = "Python developer"
        skills = @("Python", "Django")
        experience_level = "mid-level"
        questionCount = 2
    } | ConvertTo-Json
    
    $qaResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/generate-qa" `
        -Method Post `
        -ContentType "application/json" `
        -Body $qaRequest `
        -UseBasicParsing -TimeoutSec 10
    
    $qaData = $qaResponse.Content | ConvertFrom-Json
    
    Write-Host "Response Status: $($qaResponse.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 QUESTION GENERATION RESULT:" -ForegroundColor Cyan
    Write-Host "  Questions Generated: $($qaData.questions.Count)"
    
    if ($qaData.questions.Count -gt 0) {
        Write-Host ""
        Write-Host "Sample Questions:" -ForegroundColor Cyan
        $qaData.questions | Select-Object -First 2 | ForEach-Object {
            Write-Host "    • $_"
        }
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 4. Summary & Recommendations
Write-Host "4️⃣  SUMMARY & RECOMMENDATIONS" -ForegroundColor Yellow
Write-Host "-".PadRight(40, '-') -ForegroundColor Gray

Write-Host ""
Write-Host "✅ How to Verify AI Service is Being Used:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Check Response Field:" -ForegroundColor White
Write-Host "     Look for 'service: ai-service' in API response" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Check Server Logs:" -ForegroundColor White
Write-Host "     Look for '✅ AI Service response received' or" -ForegroundColor Gray
Write-Host "     '🔄 Calling AI Service (http://localhost:8000)'" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Force AI Service Usage:" -ForegroundColor White
Write-Host "     Stop Gemini API calls by removing GEMINI_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Monitor Service Priority:" -ForegroundColor White
Write-Host "     Primary:   AI Service (phi3 - LOCAL)" -ForegroundColor Green
Write-Host "     Secondary: Gemini API (FALLBACK)" -ForegroundColor Yellow
Write-Host "     Tertiary:  Pattern-based (ALWAYS WORKS)" -ForegroundColor Yellow
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan

