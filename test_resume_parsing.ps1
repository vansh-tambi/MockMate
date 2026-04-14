# Test Resume Parsing with New AI Service Integration
Write-Host "🧪 Testing Resume Parsing..." -ForegroundColor Cyan
Write-Host ""

# Create a simple test resume
$testResume = @"
John Doe
Senior Python Developer

SKILLS:
- Python, Django, FastAPI
- PostgreSQL, Redis
- Docker, Kubernetes
- AWS, GCP
- React, JavaScript

EXPERIENCE:
- Senior Developer at TechCorp (2021-Present)
  - Led 5-person team
  - Built scalable microservices

- Python Developer at StartupXYZ (2019-2021)
  - Full-stack development
  - API design and optimization

EDUCATION:
- B.S. Computer Science, State University (2019)

PROJECTS:
- E-commerce Platform: Django + React, 5K users
- Real-time Chat App: FastAPI + WebSocket
"@

Write-Host "📝 Sample Resume: $($testResume.Length) chars"
Write-Host ""

try {
    # Create form data with resume file
    $boundary = "----WebKitFormBoundary$(Get-Random)"
    $tempFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tempFile -Value $testResume
    
    Write-Host "🚀 Uploading resume to http://localhost:5000/api/parse-resume..."
    Write-Host ""
    
    $file = Get-Item $tempFile
    $fileBytes = [System.IO.File]::ReadAllBytes($file.FullName)
    
    # Call the endpoint with RestMethod (simpler than WebRequest for multipart)
    $uri = "http://localhost:5000/api/parse-resume"
    
    Write-Host "📤 Sending request..."
    $response = Invoke-WebRequest -Uri $uri `
        -Method Post `
        -InFile $tempFile `
        -ContentType "application/octet-stream" `
        -UseBasicParsing -ErrorAction Stop
    
    Write-Host "✅ Response received!" -ForegroundColor Green
    Write-Host ""
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "📊 Parsing Results:" -ForegroundColor Cyan
    Write-Host "   Service Used: $($data.service)" -ForegroundColor Yellow
    Write-Host "   Status: $($data.success)"
    Write-Host "   Skills Found: $($data.data.skills.Count)"
    Write-Host "   Text Length: $($data.textLength) chars"
    Write-Host ""
    
    if ($data.data.skills.Count -gt 0) {
        Write-Host "🔧 Extracted Skills:" -ForegroundColor Green
        $data.data.skills | Select-Object -First 10 | ForEach-Object {
            Write-Host "   • $_"
        }
    }
    
    Write-Host ""
    Write-Host "✅ Resume parsing test PASSED!" -ForegroundColor Green
    
    Remove-Item $tempFile -Force
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Test complete!" -ForegroundColor Cyan
