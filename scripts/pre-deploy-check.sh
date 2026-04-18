#!/bin/bash

# Pre-deployment verification script for RehearSync
# Run this before deploying to production

set -e

echo "🚀 RehearSync Pre-Deployment Check"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# 1. Check Node.js version
echo "1. Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    check_pass "Node.js version: $(node -v)"
else
    check_fail "Node.js version must be 18 or higher (current: $(node -v))"
fi
echo ""

# 2. Check dependencies installed
echo "2. Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"
else
    check_fail "node_modules not found. Run: npm install"
fi
echo ""

# 3. Run tests
echo "3. Running test suite..."
if npm test > /dev/null 2>&1; then
    check_pass "All tests passed"
else
    check_fail "Tests failed. Run: npm test"
fi
echo ""

# 4. Check build
echo "4. Checking build..."
if npm run build > /dev/null 2>&1; then
    check_pass "Build successful"
else
    check_fail "Build failed. Run: npm run build"
fi
echo ""

# 5. Check environment file
echo "5. Checking environment configuration..."
if [ -f ".env.local" ] || [ -f ".env" ]; then
    check_pass "Environment file exists"
else
    check_warn "No .env file found (expected for production)"
fi
echo ""

# 6. Check required environment variables in .env.example
echo "6. Verifying .env.example..."
REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env.example; then
        check_pass "$var documented in .env.example"
    else
        check_fail "$var missing from .env.example"
    fi
done
echo ""

# 7. Check Prisma schema
echo "7. Checking Prisma schema..."
if npx prisma validate > /dev/null 2>&1; then
    check_pass "Prisma schema is valid"
else
    check_fail "Prisma schema validation failed"
fi
echo ""

# 8. Check for console.logs (shouldn't be in production)
echo "8. Checking for debug statements..."
CONSOLE_LOGS=$(grep -r "console\.log" src --exclude-dir=node_modules --exclude-dir=.next --exclude="*.test.ts" | wc -l)
if [ "$CONSOLE_LOGS" -gt 10 ]; then
    check_warn "Found $CONSOLE_LOGS console.log statements (consider removing for production)"
else
    check_pass "Minimal console.log usage ($CONSOLE_LOGS found)"
fi
echo ""

# 9. Check for TODOs and FIXMEs
echo "9. Checking for TODOs/FIXMEs..."
TODOS=$(grep -r "TODO\|FIXME" src --exclude-dir=node_modules --exclude-dir=.next | wc -l)
if [ "$TODOS" -gt 0 ]; then
    check_warn "Found $TODOS TODO/FIXME comments"
else
    check_pass "No TODO/FIXME comments found"
fi
echo ""

# 10. Check package.json for required scripts
echo "10. Checking package.json scripts..."
REQUIRED_SCRIPTS=("dev" "build" "start" "test")
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if grep -q "\"$script\":" package.json; then
        check_pass "Script '$script' exists"
    else
        check_fail "Script '$script' missing from package.json"
    fi
done
echo ""

# Summary
echo "===================================="
echo "Summary:"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi
if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
fi
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}❌ Pre-deployment checks failed. Fix the issues above before deploying.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All critical checks passed! Ready for deployment.${NC}"
    if [ "$WARNINGS" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  There are $WARNINGS warnings. Review them before deploying.${NC}"
    fi
    exit 0
fi
