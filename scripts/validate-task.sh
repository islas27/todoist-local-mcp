#!/usr/bin/env bash
# validate-task.sh — Post-task validation gate for todoist-local-mcp build plan
# Usage: ./scripts/validate-task.sh <task-id>
# Exit code: 0 = all checks pass, 1 = any check fails

set -uo pipefail

TASK_ID="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ─── Lookup helpers (bash 3 compatible) ───────────────────────────────────────

task_file() {
  case "$1" in
    "1.2") echo "src/types.ts" ;;
    "1.3") echo "src/todoist-client.ts" ;;
    "2.1") echo "src/tools/get-tasks.ts" ;;
    "2.2") echo "src/tools/create-task.ts" ;;
    "2.3") echo "src/tools/update-task.ts" ;;
    "2.4") echo "src/tools/complete-task.ts" ;;
    "2.5") echo "src/tools/delete-task.ts" ;;
    "3.1") echo "src/index.ts" ;;
    "4.1") echo "tests/todoist-client.test.ts" ;;
    "4.2") echo "tests/tools/" ;;
    "4.3") echo "tests/integration/server.test.ts" ;;
    "5.1") echo "README.md" ;;
    *)     echo "" ;;
  esac
}

task_exports() {
  case "$1" in
    "1.2") echo "TodoistTask,TodoistDue,CreateTaskParams,UpdateTaskParams,GetTasksParams" ;;
    "1.3") echo "TodoistClient" ;;
    "2.1") echo "GetTasksSchema,handleGetTasks" ;;
    "2.2") echo "CreateTaskSchema,handleCreateTask" ;;
    "2.3") echo "UpdateTaskSchema,handleUpdateTask" ;;
    "2.4") echo "CompleteTaskSchema,handleCompleteTask" ;;
    "2.5") echo "DeleteTaskSchema,handleDeleteTask" ;;
    *)     echo "" ;;
  esac
}

task_test() {
  case "$1" in
    "1.3") echo "tests/todoist-client.test.ts" ;;
    "2.1") echo "tests/tools/get-tasks.test.ts" ;;
    "2.2") echo "tests/tools/create-task.test.ts" ;;
    "2.3") echo "tests/tools/update-task.test.ts" ;;
    "2.4") echo "tests/tools/complete-task.test.ts" ;;
    "2.5") echo "tests/tools/delete-task.test.ts" ;;
    "4.1") echo "tests/todoist-client.test.ts" ;;
    "4.2") echo "tests/tools/" ;;
    "4.3") echo "tests/integration/server.test.ts" ;;
    *)     echo "" ;;
  esac
}

known_task_ids() {
  echo "1.2 1.3 2.1 2.2 2.3 2.4 2.5 3.1 4.1 4.2 4.3 5.1"
}

# ─── Helpers ──────────────────────────────────────────────────────────────────
PASS="✓"
FAIL="✗"
SKIP="-"
FAILURES=0

pass() { echo "  ${PASS} $1"; }
fail() { echo "  ${FAIL} $1"; FAILURES=$((FAILURES + 1)); }
skip() { echo "  ${SKIP} $1 (skipped)"; }

# ─── Usage guard ──────────────────────────────────────────────────────────────
if [[ -z "${TASK_ID}" ]]; then
  echo "Usage: $0 <task-id>  (e.g. $0 2.1)"
  exit 1
fi

TARGET_FILE="$(task_file "${TASK_ID}")"
if [[ -z "${TARGET_FILE}" ]]; then
  echo "Unknown task ID: ${TASK_ID}"
  echo "Known IDs: $(known_task_ids)"
  exit 1
fi

echo ""
echo "━━━ Validating Task ${TASK_ID} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "${PROJECT_ROOT}"

# ─── Check 1: File existence ──────────────────────────────────────────────────
echo ""
echo "1. File existence"
if [[ -e "${TARGET_FILE}" ]]; then
  pass "${TARGET_FILE} exists"
else
  fail "${TARGET_FILE} not found"
  echo ""
  echo "Summary: FAILED (file not yet created — task not started)"
  exit 1
fi

# ─── Check 2: TypeScript compilation ─────────────────────────────────────────
echo ""
echo "2. TypeScript compilation (npx tsc --noEmit)"
if [[ ! -f "tsconfig.json" ]]; then
  skip "tsconfig.json not found"
elif [[ ! -f "node_modules/.bin/tsc" ]]; then
  skip "tsc not installed (run npm install first)"
else
  TSC_OUT="$(npx tsc --noEmit 2>&1)" && TSC_EXIT=0 || TSC_EXIT=$?
  if [[ "${TSC_EXIT}" -eq 0 ]]; then
    pass "tsc --noEmit passed"
  else
    fail "tsc --noEmit failed"
    echo "${TSC_OUT}" | sed 's/^/    /'
  fi
fi

# ─── Check 3: Export contract ─────────────────────────────────────────────────
echo ""
echo "3. Export contract"
EXPORTS_LIST="$(task_exports "${TASK_ID}")"
if [[ -z "${EXPORTS_LIST}" ]]; then
  skip "No export contract defined for task ${TASK_ID}"
else
  # Split comma-separated exports
  IFS=',' read -ra EXPORTS <<< "${EXPORTS_LIST}"
  for RAW_EXPORT in "${EXPORTS[@]}"; do
    EXPORT_NAME="${RAW_EXPORT// /}"  # trim spaces
    if grep -qE "(export (const|class|interface|type|function|enum) ${EXPORT_NAME}[^a-zA-Z0-9_]|export \{[^}]*[[:space:]]${EXPORT_NAME}[[:space:],}])" "${TARGET_FILE}" 2>/dev/null; then
      pass "export '${EXPORT_NAME}' found"
    else
      fail "export '${EXPORT_NAME}' NOT found in ${TARGET_FILE}"
    fi
  done
fi

# ─── Check 4: Test execution ──────────────────────────────────────────────────
echo ""
echo "4. Test execution"
TEST_PATH="$(task_test "${TASK_ID}")"
if [[ -z "${TEST_PATH}" ]]; then
  skip "No tests defined for task ${TASK_ID}"
elif [[ ! -e "${TEST_PATH}" ]]; then
  skip "Test file/dir '${TEST_PATH}' not yet created"
elif [[ ! -f "node_modules/.bin/vitest" ]]; then
  skip "vitest not installed (run npm install first)"
else
  VITEST_OUT="$(npx vitest run "${TEST_PATH}" 2>&1)" && VITEST_EXIT=0 || VITEST_EXIT=$?
  if [[ "${VITEST_EXIT}" -eq 0 ]]; then
    pass "tests passed: ${TEST_PATH}"
  else
    fail "tests FAILED: ${TEST_PATH}"
    echo "${VITEST_OUT}" | tail -20 | sed 's/^/    /'
  fi
fi

# ─── Check 5: Import hygiene (.js extensions for ESM) ────────────────────────
echo ""
echo "5. Import hygiene (.js extensions for ESM relative imports)"
if [[ ! -f "${TARGET_FILE}" ]] || [[ "${TARGET_FILE}" != *.ts ]]; then
  skip "not a .ts file"
else
  BAD_IMPORTS="$(grep -nE "^import .+ from ['\"](\./|\.\./)[^'\"]+['\"]" "${TARGET_FILE}" | \
    grep -vE "from ['\"](\./|\.\./)[^'\"]+\.js['\"]" || true)"
  if [[ -z "${BAD_IMPORTS}" ]]; then
    pass "all relative imports use .js extensions"
  else
    fail "relative imports missing .js extension:"
    echo "${BAD_IMPORTS}" | sed 's/^/    /'
  fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "${FAILURES}" -eq 0 ]]; then
  echo "  PASSED — Task ${TASK_ID} validation complete"
  echo ""
  exit 0
else
  echo "  FAILED — ${FAILURES} check(s) failed for Task ${TASK_ID}"
  echo ""
  exit 1
fi
