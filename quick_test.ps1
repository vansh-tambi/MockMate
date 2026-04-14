param()

Write-Host "Testing Resume Parsing..." -ForegroundColor Cyan

$testData = @{
    text = "Python developer with 5 years of Django and FastAPI experience. Skills: Python, JavaScript, PostgreSQL, Redis, Docker, AWS"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/parse-resume" `
        -Method Post `
        -ContentType "application/json" `
        -Body $testData `
        -UseBasicParsing
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Service: $($data.service)" 
    Write-Host "Success: $($data.success)"
    Write-Host "Skills: $($data.data.skills.Count)"
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
