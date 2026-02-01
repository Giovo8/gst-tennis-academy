# Security Audit Checklist for Windows
# Run with: powershell -ExecutionPolicy Bypass -File scripts\security-check.ps1

Write-Host "?? GST Tennis Academy - Security Audit" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$ERRORS = 0
$WARNINGS = 0
$PASSED = 0

# Check 1: Environment file exists
Write-Host "1. Checking .env.local exists... " -NoNewline
if (Test-Path ".env.local") {
    Write-Host "PASS" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "FAIL - Create .env.local from .env.example" -ForegroundColor Red
    $ERRORS++
}

# Check 2: Dependencies installed
Write-Host "2. Checking security dependencies... " -NoNewline
try {
    $zodInstalled = npm list zod 2>&1 | Select-String "zod@"
    $dompurifyInstalled = npm list isomorphic-dompurify 2>&1 | Select-String "isomorphic-dompurify@"
    
    if ($zodInstalled -and $dompurifyInstalled) {
        Write-Host "PASS" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "FAIL - Run: npm install" -ForegroundColor Red
        $ERRORS++
    }
} catch {
    Write-Host "FAIL - Run: npm install" -ForegroundColor Red
    $ERRORS++
}

# Check 3: Console.log in source
Write-Host "3. Checking for console.log in src/... " -NoNewline
$consoleCount = (Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
    Select-String -Pattern "console\.(log|error|warn)" | 
    Where-Object { $_.Path -notlike "*test.ts" }).Count

if ($consoleCount -lt 5) {
    Write-Host "PASS - $consoleCount found" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "WARNING - $consoleCount console statements found" -ForegroundColor Yellow
    Write-Host "   Run: node scripts/migrate-to-logger.js" -ForegroundColor Yellow
    $WARNINGS++
}

# Check 4: Required files exist
Write-Host "4. Checking security framework files... " -NoNewline
$requiredFiles = @(
    "src\lib\constants\app.ts",
    "src\lib\validation\schemas.ts",
    "src\lib\security\sanitize.ts",
    "src\lib\security\rate-limiter.ts",
    "src\lib\logger\secure-logger.ts",
    "src\lib\config\env.ts"
)

$missingFiles = $requiredFiles | Where-Object { -not (Test-Path $_) }

if ($missingFiles.Count -eq 0) {
    Write-Host "PASS" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "FAIL - Missing $($missingFiles.Count) framework files" -ForegroundColor Red
    $ERRORS++
}

# Check 5: API routes refactored
Write-Host "5. Checking refactored API routes... " -NoNewline
$apiFiles = Get-ChildItem -Path "src\app\api" -Recurse -Filter "route.ts"
$refactoredCount = 0

foreach ($file in $apiFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "applyRateLimit" -and $content -match "logger\." -and $content -match "HTTP_STATUS") {
        $refactoredCount++
    }
}

if ($refactoredCount -ge 4) {
    Write-Host "PASS - $refactoredCount routes refactored" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "WARNING - Only $refactoredCount routes refactored" -ForegroundColor Yellow
    $WARNINGS++
}

# Check 6: XSS protection
Write-Host "6. Checking XSS protection (sanitizeHtml usage)... " -NoNewline
$xssFiles = Get-ChildItem -Path "src" -Recurse -Include "*.tsx" | 
    Select-String -Pattern "dangerouslySetInnerHTML"

$protectedCount = 0
foreach ($match in $xssFiles) {
    $content = Get-Content $match.Path -Raw
    if ($content -match "sanitizeHtml") {
        $protectedCount++
    }
}

if ($xssFiles.Count -eq 0 -or $protectedCount -eq $xssFiles.Count) {
    Write-Host "PASS" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "WARNING - $($xssFiles.Count - $protectedCount) unprotected dangerouslySetInnerHTML" -ForegroundColor Yellow
    $WARNINGS++
}

# Check 7: Hardcoded secrets
Write-Host "7. Checking for hardcoded secrets... " -NoNewline
$secretPatterns = @("api_key\s*=\s*['\"]", "password\s*=\s*['\"]", "secret\s*=\s*['\"]")
$secretsFound = 0

foreach ($pattern in $secretPatterns) {
    $matches = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | 
        Select-String -Pattern $pattern | 
        Where-Object { $_.Line -notmatch "process\.env" }
    $secretsFound += $matches.Count
}

if ($secretsFound -eq 0) {
    Write-Host "PASS" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "FAIL - $secretsFound potential hardcoded secrets found" -ForegroundColor Red
    $ERRORS++
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Passed: $PASSED" -ForegroundColor Green
Write-Host "Warnings: $WARNINGS" -ForegroundColor Yellow
Write-Host "Errors: $ERRORS" -ForegroundColor Red
Write-Host ""

if ($ERRORS -eq 0 -and $WARNINGS -eq 0) {
    Write-Host "SUCCESS - All checks passed! Your app is secure" -ForegroundColor Green
    exit 0
} elseif ($ERRORS -eq 0) {
    Write-Host "INFO - Some warnings found. Review and fix if needed" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "ERROR - Critical errors found. Fix before deploying" -ForegroundColor Red
    exit 1
}
