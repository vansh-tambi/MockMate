@echo off
REM Simple test for resume parsing

echo Testing Resume Parser...
echo.

REM Create a simple test file
(
echo Skills: Python, Django, FastAPI
echo Experience: 5 years developer
)> test_resume.txt

echo Uploading test resume...

REM Using PowerShell inline to send multipart form data
powershell -Command "
try {
    `$filePath = 'test_resume.txt'
    `$fileContent = [System.IO.File]::ReadAllBytes(`$filePath)
    `$boundary = 'boundary_' + [guid]::NewGuid().ToString('N')
    
    `$bodyLines = @()
    `$bodyLines += '--' + `$boundary
    `$bodyLines += 'Content-Disposition: form-data; name=\"resume\"; filename=\"test_resume.txt\"'
    `$bodyLines += 'Content-Type: text/plain'
    `$bodyLines += ''
    
    `$body = [System.Text.Encoding]::UTF8.GetBytes(([System.String]::Join(\"`r`n\", `$bodyLines) + \"`r`n\"))
    `$body += `$fileContent
    `$body += [System.Text.Encoding]::UTF8.GetBytes(\"`r`n--\" + `$boundary + \"--\")
    
    `$response = Invoke-WebRequest -Uri 'http://localhost:5000/api/parse-resume' \
        -Method Post \
        -ContentType (\"multipart/form-data; boundary=\" + `$boundary) \
        -Body `$body \
        -UseBasicParsing
    
    Write-Host 'Status: '$response.StatusCode -ForegroundColor Green
    `$data = `$response.Content | ConvertFrom-Json
    Write-Host 'Service: '$data.service
    Write-Host 'Success: '$data.success
    Write-Host 'Skills Found: '$data.data.skills.Count
} catch {
    Write-Host 'Error: '$_.Exception.Message -ForegroundColor Red
}
"

REM Cleanup
del test_resume.txt 2>nul

echo.
echo Done!
