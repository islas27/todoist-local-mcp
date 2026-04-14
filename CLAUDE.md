# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A local MCP (Model Context Protocol) server that exposes Todoist task management to Claude Desktop/Code via 5 tools: `get_tasks`, `create_task`, `update_task`, `complete_task`, `delete_task`.

**Status:** Planning phase — `docs/` contains the full build plan, ARD, and test plan. No production code exists yet.

## Commands

Once scaffolded (Phase 1 of build plan):

```bash
npm run build       # tsc → build/
npm test            # vitest
npx tsc --noEmit    # type check only (hard gate before every commit)
```

Post-build smoke test:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

Task validation gate (after each delegated task):
```bash
./scripts/validate-task.sh <task_id>
```

## Architecture

**Transport:** stdio (JSON-RPC 2.0) — no HTTP exposure.

**Stack:** TypeScript (ESM, Node16 module resolution), `@modelcontextprotocol/sdk`, `zod@3`, `vitest`.

**Structure:**
```
src/
  index.ts              # Entry point: reads TODOIST_TOKEN, creates McpServer, registers tools
  todoist-client.ts     # Thin HTTP wrapper for Todoist API v1 (native fetch, X-Request-Id idempotency)
  types.ts              # TodoistTask, TodoistDue, etc.
  tools/
    get-tasks.ts        # Zod schema + handler (one file per tool)
    create-task.ts
    update-task.ts
    complete-task.ts
    delete-task.ts
tests/
  todoist-client.test.ts
  tools/
    *.test.ts           # Tool handlers with mocked TodoistClient
  integration/
    server.test.ts      # Spawned server over stdio
scripts/
  validate-task.sh      # Post-task gate: checks file existence, tsc, exports, imports, tests
```

## Key Decisions (see `docs/ard.md` for full ADRs)

- **Todoist API v1** (`/api/v1/tasks`) — REST v2 is deprecated
- **Personal token** via `TODOIST_TOKEN` env var — no OAuth
- **Approval logic lives in Claude's system prompt**, not enforced server-side
- **Native `fetch`** (Node 18+) — no axios
- **One file per tool** — self-contained for delegated execution

## Environment

Requires `TODOIST_TOKEN` env var. Missing token → server exits immediately.

Test project ID for integration tests: `6gP77C6vM2cRm2rg`

## Build Plan Execution

Tasks are designed as delegated micro-tasks. Execution order:
1. Task 0.1 — create `scripts/validate-task.sh` (validation gate)
2. Phase 1 (sequential) — scaffolding: package.json/tsconfig → types → HTTP client
3. Phase 2 (parallelizable) — 5 tool files
4. Phase 3 — server entry point wiring
5. Phase 4 — unit + integration tests
6. Phase 5 — README + Claude Desktop config snippet

Full details: `docs/build-plan.md`, `docs/ard.md`, `docs/test-plan.md`
