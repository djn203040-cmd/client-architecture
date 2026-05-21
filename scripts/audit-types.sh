#!/usr/bin/env bash
# 06-PLAN.md §1.1 — type-safety audit.
# Fails on:
#   - `: any` parameter or return types in production code (test files exempt)
#   - `@ts-ignore` or `@ts-expect-error` without an inline `// reason:` justification
#   - `eslint-disable` without an inline justification comment
#   - Duplicate type names exported from BOTH packages/shared and apps/web

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILURES=0

scan_paths=(
  "$ROOT/apps/web"
  "$ROOT/packages"
)

# Glob exclusions
EXCLUDE='\(tests/\|\.test\.\|\.spec\.\|node_modules\|\.next\|dist/\|coverage/\)'

# --- Rule 1: unjustified `any` --------------------------------------------------
echo "==> [1/4] scanning for unjustified ': any' types..."
ANY_HITS=$(
  grep -rEn ':\s*any(\s|;|,|\)|\]|\|)' \
    --include='*.ts' --include='*.tsx' \
    "${scan_paths[@]}" 2>/dev/null \
  | grep -v "$EXCLUDE" \
  | grep -v 'any-ok:' \
  || true
)
if [ -n "$ANY_HITS" ]; then
  echo "FAIL: unjustified ': any' found (add '// any-ok: <reason>' to exempt):"
  echo "$ANY_HITS"
  FAILURES=$((FAILURES + 1))
fi

# --- Rule 2: @ts-ignore / @ts-expect-error without reason ----------------------
echo "==> [2/4] scanning for unjustified @ts-ignore / @ts-expect-error..."
TS_HITS=$(
  grep -rEn '(@ts-ignore|@ts-expect-error)' \
    --include='*.ts' --include='*.tsx' \
    "${scan_paths[@]}" 2>/dev/null \
  | grep -v "$EXCLUDE" \
  | grep -v 'reason:' \
  || true
)
if [ -n "$TS_HITS" ]; then
  echo "FAIL: @ts-ignore / @ts-expect-error without 'reason:' justification:"
  echo "$TS_HITS"
  FAILURES=$((FAILURES + 1))
fi

# --- Rule 3: eslint-disable without justification ------------------------------
echo "==> [3/4] scanning for unjustified eslint-disable..."
ESL_HITS=$(
  grep -rEn 'eslint-disable' \
    --include='*.ts' --include='*.tsx' \
    "${scan_paths[@]}" 2>/dev/null \
  | grep -v "$EXCLUDE" \
  | grep -vE 'eslint-disable[a-z-]*\s+[a-z-]+\s+--' \
  | grep -v 'reason:' \
  || true
)
if [ -n "$ESL_HITS" ]; then
  echo "FAIL: eslint-disable without justification ('-- reason' suffix or 'reason:' comment):"
  echo "$ESL_HITS"
  FAILURES=$((FAILURES + 1))
fi

# --- Rule 4: duplicate type names across packages/shared and apps/web ----------
echo "==> [4/4] scanning for duplicate exported type names across workspaces..."
SHARED_TYPES=$(
  grep -rEh '^\s*export\s+(type|interface)\s+[A-Z][A-Za-z0-9_]*' \
    --include='*.ts' \
    "$ROOT/packages/shared/src/" 2>/dev/null \
  | sed -E 's/.*export\s+(type|interface)\s+([A-Z][A-Za-z0-9_]*).*/\2/' \
  | sort -u || true
)
WEB_TYPES=$(
  grep -rEh '^\s*export\s+(type|interface)\s+[A-Z][A-Za-z0-9_]*' \
    --include='*.ts' --include='*.tsx' \
    "$ROOT/apps/web/" 2>/dev/null \
  | grep -v "$EXCLUDE" \
  | sed -E 's/.*export\s+(type|interface)\s+([A-Z][A-Za-z0-9_]*).*/\2/' \
  | sort -u || true
)
DUPLICATES=$(comm -12 <(echo "$SHARED_TYPES") <(echo "$WEB_TYPES") || true)
if [ -n "$DUPLICATES" ]; then
  echo "FAIL: duplicate type names exported from BOTH packages/shared and apps/web:"
  echo "$DUPLICATES"
  echo "→ consolidate into packages/shared/ and re-export from apps/web if needed"
  FAILURES=$((FAILURES + 1))
fi

if [ $FAILURES -gt 0 ]; then
  echo ""
  echo "❌ audit-types.sh: $FAILURES rule(s) failed"
  exit 1
fi

echo "✅ audit-types.sh: all type-safety rules pass"
