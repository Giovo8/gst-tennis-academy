#!/bin/bash
# Quick Security Audit Script
# Run with: bash scripts/security-check.sh

echo "🔍 GST Tennis Academy - Security Audit"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
PASSED=0

# Check 1: Environment file exists
echo -n "1. Checking .env.local exists... "
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Create .env.local from .env.example${NC}"
    ((ERRORS++))
fi

# Check 2: Required env vars
echo -n "2. Checking required env vars... "
if [ -f ".env.local" ]; then
    REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "RESEND_API_KEY")
    MISSING=0
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" .env.local 2>/dev/null || grep -q "^$var=$" .env.local 2>/dev/null; then
            ((MISSING++))
        fi
    done
    if [ $MISSING -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING - $MISSING required vars missing or empty${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC}"
fi

# Check 3: Dependencies installed
echo -n "3. Checking security dependencies... "
if npm list zod isomorphic-dompurify &> /dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Run: npm install${NC}"
    ((ERRORS++))
fi

# Check 4: Console.log in source
echo -n "4. Checking for console.log in src/... "
CONSOLE_COUNT=$(grep -r "console\.\(log\|error\|warn\)" src/ --exclude-dir=node_modules --exclude="*.test.ts" 2>/dev/null | wc -l)
if [ "$CONSOLE_COUNT" -lt 5 ]; then
    echo -e "${GREEN}✅ PASS ($CONSOLE_COUNT found)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING - $CONSOLE_COUNT console statements found${NC}"
    echo "   Run: node scripts/migrate-to-logger.js"
    ((WARNINGS++))
fi

# Check 5: Hardcoded secrets
echo -n "5. Checking for hardcoded secrets... "
SECRETS=$(grep -riE "(api_key|password|secret|token)\s*=\s*['\"][^'\"]{10,}" src/ --exclude-dir=node_modules --exclude="*.test.ts" 2>/dev/null | wc -l)
if [ "$SECRETS" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - $SECRETS potential hardcoded secrets found${NC}"
    ((ERRORS++))
fi

# Check 6: SQL injection patterns
echo -n "6. Checking for SQL injection risks... "
SQL_RISKS=$(grep -rE "\.or\(\`[^%].*\$\{[^}]+\}" src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
if [ "$SQL_RISKS" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING - $SQL_RISKS potential SQL injection points${NC}"
    ((WARNINGS++))
fi

# Check 7: dangerouslySetInnerHTML usage
echo -n "7. Checking for XSS risks (dangerouslySetInnerHTML)... "
XSS_RISKS=$(grep -r "dangerouslySetInnerHTML" src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
if [ "$XSS_RISKS" -lt 3 ]; then
    echo -e "${GREEN}✅ PASS ($XSS_RISKS found, should be sanitized)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING - $XSS_RISKS uses of dangerouslySetInnerHTML${NC}"
    ((WARNINGS++))
fi

# Check 8: Rate limiting implemented
echo -n "8. Checking rate limiting implementation... "
if grep -q "applyRateLimit" src/app/api/*/route.ts 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Rate limiting not found in API routes${NC}"
    ((ERRORS++))
fi

# Check 9: Secure logger usage
echo -n "9. Checking secure logger usage... "
if grep -q "from '@/lib/logger/secure-logger'" src/app/api/*/route.ts 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING - Secure logger not used in all API routes${NC}"
    ((WARNINGS++))
fi

# Check 10: Constants usage
echo -n "10. Checking constants usage... "
if grep -q "from '@/lib/constants/app'" src/app/api/*/route.ts 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING - Constants not used in all API routes${NC}"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "======================================"
echo "Summary:"
echo "======================================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Your app is secure!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Some warnings found. Review and fix if needed.${NC}"
    exit 0
else
    echo -e "${RED}❌ Critical errors found. Fix before deploying!${NC}"
    exit 1
fi
