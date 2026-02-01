Write-Host "GST Tennis Academy - Security Audit" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$ERRORS = 0
$WARNINGS = 0
$PASSED = 0

# Check 1: .env.local exists
Write-Host "1. Checking .env.local exists... " -NoNewline
if (Test-Path ".env.local") {
    Write-Host "PASS" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "FAIL" -ForegroundColor Red
    $ERRORS++
}

# Check 2: Dependencies installed
Write-Host "2. Checking security dependencies... " -NoNewline
try {
    $zodCheck = npm list zod 2>&1
    $dompurifyCheck = npm list isomorphic-dompurify 2>&1
    
    if (($zodCheck -match "zod@") -and ($dompurifyCheck -match "isomorphic-dompurify@")) {
        Write-Host "PASS" -ForegroundColor Green
        $PASSED++
    } else {
        Write-Host "FAIL" -ForegroundColor Red
        $ERRORS++
    }
} catch {
    Write-Host "FAIL" -ForegroundColor Red
    $ERRORS++
}

# Check 3: Console.log usage
Write-Host "3. Checking console.log usage... " -NoNewline
$consoleMatches = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx | Select-String -Pattern "console\.(log|error|warn)" | Where-Object { $_.Path -notlike "*test.ts" }
$consoleCount = ($consoleMatches | Measure-Object).Count

if ($consoleCount -lt 10) {
    Write-Host "PASS - $consoleCount instances found" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "WARNING - $consoleCount instances found" -ForegroundColor Yellow
    $WARNINGS++
}

# Check 4: Security framework files
Write-Host "4. Checking security framework... " -NoNewline
$requiredFiles = @(
    "src\lib\constants\app.ts",
    "src\lib\validation\schemas.ts",
    "src\lib\security\sanitize.ts",
    "src\lib\security\rate-limiter.ts",
    "src\lib\logger\secure-logger.ts",
    "src\lib\config\env.ts"
)

$missingCount = 0
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingCount++
    }
}

if ($missingCount -eq 0) {
    Write-Host "PASS - All 6 files present" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "FAIL - $missingCount files missing" -ForegroundColor Red
    $ERRORS++
}

# Check 5: API routes refactored
Write-Host "5. Checking refactored API routes... " -NoNewline
$apiFiles = Get-ChildItem -Path "src\app\api" -Recurse -Filter "route.ts"
$refactoredCount = 0

foreach ($file in $apiFiles) {
    $content = Get-Content $file.FullName -Raw
    if (($content -match "applyRateLimit") -and ($content -match "logger\.") -and ($content -match "HTTP_STATUS")) {
        $refactoredCount++
    }
}

if ($refactoredCount -ge 4) {
    Write-Host "PASS - $refactoredCount routes secured" -ForegroundColor Green
    $PASSED++
} else {
    Write-Host "WARNING - Only $refactoredCount routes secured" -ForegroundColor Yellow
    $WARNINGS++
}

# Check 6: XSS protection
Write-Host "6. Checking XSS protection... " -NoNewline
$xssMatches = Get-ChildItem -Path "src" -Recurse -Include *.tsx | Select-String -Pattern "dangerouslySetInnerHTML"
$xssCount = ($xssMatches | Measure-Object).Count

$protectedCount = 0
foreach ($match in $xssMatches) {
    $content = Get-Content $match.Path -Raw
    if ($content -match "sanitizeHtml") {
        $protectedCount++
    }
}

if ($xssCount -eq 0 -or $protectedCount -eq $xssCount) {
    Write-Host "PASS - All uses protected" -ForegroundColor Green
    $PASSED++
} else {
    $unprotected = $xssCount - $protectedCount
    Write-Host "WARNING - $unprotected unprotected uses" -ForegroundColor Yellow
    $WARNINGS++
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
    Write-Host "SUCCESS - All security checks passed" -ForegroundColor Green
    exit 0
} elseif ($ERRORS -eq 0) {
    Write-Host "INFO - Review warnings before deployment" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "ERROR - Fix critical issues before deployment" -ForegroundColor Red
    exit 1
}
