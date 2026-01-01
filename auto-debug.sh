#!/bin/bash
# Auto-Debug Script for Lead Builder Frontend
# Run: ./auto-debug.sh

set -e

echo "========================================"
echo "  Lead Builder Frontend - Debug Check"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${NC} $1"; }
fail() { echo -e "${RED}✗ FAIL${NC} $1"; }
warn() { echo -e "${YELLOW}! WARN${NC} $1"; }

# 1. Node.js Check
echo "=== 1. Node.js ==="
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    pass "Node.js $NODE_VERSION"
else
    fail "Node.js not installed"
fi

# 2. Dependencies Check
echo ""
echo "=== 2. Dependencies ==="
if [ -d "node_modules" ]; then
    pass "node_modules exists"
else
    warn "node_modules missing - run: npm install"
fi

if [ -f "package-lock.json" ]; then
    pass "package-lock.json exists"
else
    warn "package-lock.json missing"
fi

# 3. Build Check
echo ""
echo "=== 3. Build ==="
if [ -d ".next" ]; then
    pass ".next build folder exists"
else
    warn ".next missing - run: npm run build"
fi

# 4. TypeScript Check
echo ""
echo "=== 4. TypeScript ==="
if npx tsc --noEmit 2>/dev/null; then
    pass "No TypeScript errors"
else
    fail "TypeScript errors found - run: npx tsc --noEmit"
fi

# 5. Environment Check
echo ""
echo "=== 5. Environment ==="
if [ -f ".env.local" ] || [ -f ".env" ]; then
    pass "Environment file exists"
else
    warn "No .env file - using defaults"
fi

if [ -f ".env.example" ]; then
    pass ".env.example exists"
else
    warn ".env.example missing"
fi

# 6. ESLint Check
echo ""
echo "=== 6. ESLint ==="
if npm run lint 2>/dev/null; then
    pass "No ESLint errors"
else
    warn "ESLint issues found - run: npm run lint"
fi

# 7. Test Files Check
echo ""
echo "=== 7. Tests ==="
E2E_COUNT=$(find tests -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$E2E_COUNT" -gt 0 ]; then
    pass "$E2E_COUNT E2E test file(s) found"
else
    warn "No E2E tests found in tests/"
fi

UNIT_COUNT=$(find src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$UNIT_COUNT" -gt 0 ]; then
    pass "$UNIT_COUNT Unit test file(s) found"
else
    warn "No unit tests found in src/"
fi

# 8. Git Status
echo ""
echo "=== 8. Git Status ==="
if git status --porcelain | grep -q .; then
    CHANGES=$(git status --porcelain | wc -l | tr -d ' ')
    warn "$CHANGES uncommitted changes"
else
    pass "Working tree clean"
fi

# Summary
echo ""
echo "========================================"
echo "  Debug Check Complete"
echo "========================================"
echo ""
echo "Quick Commands:"
echo "  npm run dev      - Start dev server"
echo "  npm run build    - Production build"
echo "  npm run lint     - Check linting"
echo "  npm run test:e2e - Run E2E tests"
echo ""
