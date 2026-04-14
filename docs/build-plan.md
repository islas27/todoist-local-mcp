# Build Plan — Local Todoist MCP Server

**Date:** April 13, 2026
**Owner:** Jonathan
**Status:** Ready for execution

---

## Overview

A local MCP server exposing five Todoist tools via stdio transport, backed by the Todoist unified API v1. Designed for Claude Desktop / Claude Code to keep Todoist in sync with session-agreed action items.

**Key design constraint:** Claude always surfaces a diff/proposal before mutating tasks. The approval step before any mutation is non-negotiable.

---

## API & SDK Targets

| Dependency | Version | Notes |
|---|---|---|
| Todoist API | **v1** (`api.todoist.com/api/v1/`) | REST v2 is deprecated; v1 is the current unified API |
| MCP SDK | `@modelcontextprotocol/sdk` v1.x | v2 is pre-alpha; v1.x is production-stable |
| Runtime | Node.js 18+ | Required by MCP SDK |
| Schema validation | `zod@3` | Used by MCP SDK for tool input schemas |
| Transport | stdio | Local server spawned by Claude Desktop/Code |

---

## Project Structure

```
todoist-mcp/
├── package.json
├── tsconfig.json
├── .env.example              # TODOIST_TOKEN=
├── scripts/
│   └── validate-task.sh      # Post-task validation gate
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── todoist-client.ts     # Thin HTTP wrapper for Todoist API v1
│   ├── types.ts              # Todoist data types (Task, Due, etc.)
│   └── tools/
│       ├── get-tasks.ts      # get_tasks tool definition + handler
│       ├── create-task.ts    # create_task tool definition + handler
│       ├── update-task.ts    # update_task tool definition + handler
│       ├── complete-task.ts  # complete_task tool definition + handler
│       └── delete-task.ts    # delete_task tool definition + handler
├── tests/
│   ├── todoist-client.test.ts
│   ├── tools/
│   │   ├── get-tasks.test.ts
│   │   ├── create-task.test.ts
│   │   ├── update-task.test.ts
│   │   ├── complete-task.test.ts
│   │   └── delete-task.test.ts
│   └── integration/
│       └── server.test.ts
└── README.md
```

---

## Micro-Tasks

Each task is scoped for independent execution and validation. Tasks are ordered by dependency — each builds on the outputs of previous phases.

### Phase 0 — Validation Infrastructure

#### Task 0.1: Task validation script
**Assignable to:** Sonnet
**Input:** This build plan (file structure, export signatures, dependency graph)
**Output:** `scripts/validate-task.sh`
**Details:**
- Bash script that takes a task ID as argument: `./scripts/validate-task.sh 2.1`
- Runs a validation pipeline appropriate to the task:
  1. **File existence check** — verifies the expected output file(s) exist per the build plan
  2. **TypeScript compilation** — `npx tsc --noEmit` (hard gate, fails the script)
  3. **Export contract check** — greps for expected named exports in the produced file (e.g., `GetTasksSchema`, `handleGetTasks`). Uses a lookup table keyed by task ID.
  4. **Test execution** — if tests exist for the module (`tests/<path>.test.ts`), runs `npx vitest run <path>` and reports pass/fail
  5. **Import hygiene** — verifies relative imports use `.js` extensions (ESM requirement)
- Exit code: 0 = all checks pass, 1 = any check fails
- Human-readable output: prints each check with ✓/✗ and a summary line
- Lookup table structure (embedded in script or a companion JSON):
```bash
# Task ID → expected file, expected exports
declare -A TASK_FILES=(
  ["1.2"]="src/types.ts"
  ["1.3"]="src/todoist-client.ts"
  ["2.1"]="src/tools/get-tasks.ts"
  ["2.2"]="src/tools/create-task.ts"
  ["2.3"]="src/tools/update-task.ts"
  ["2.4"]="src/tools/complete-task.ts"
  ["2.5"]="src/tools/delete-task.ts"
  ["3.1"]="src/index.ts"
  ["4.1"]="tests/todoist-client.test.ts"
  ["4.2"]="tests/tools/"
  ["4.3"]="tests/integration/server.test.ts"
  ["5.1"]="README.md"
)

declare -A TASK_EXPORTS=(
  ["1.2"]="TodoistTask,TodoistDue,CreateTaskParams,UpdateTaskParams,GetTasksParams"
  ["1.3"]="TodoistClient"
  ["2.1"]="GetTasksSchema,handleGetTasks"
  ["2.2"]="CreateTaskSchema,handleCreateTask"
  ["2.3"]="UpdateTaskSchema,handleUpdateTask"
  ["2.4"]="CompleteTaskSchema,handleCompleteTask"
  ["2.5"]="DeleteTaskSchema,handleDeleteTask"
)
```
- Should be extensible: the lookup tables are the only part that changes per project. Future projects can swap in their own tables.
**Validation:** Script runs without error when given a task ID that hasn't been started yet (reports file missing, exits 1). After Task 1.2 is complete, `./scripts/validate-task.sh 1.2` should pass.

---

### Phase 1 — Scaffolding (no Todoist calls)

#### Task 1.1: Project initialization
**Assignable to:** Haiku / local LLM
**Input:** This build plan (structure + dependency versions)
**Output:** `package.json`, `tsconfig.json`, `.env.example`, empty `src/` and `tests/` dirs
**Details:**
- `package.json`: `type: "module"`, `bin.todoist-mcp: "./build/index.js"`, scripts for `build` (tsc) and `test` (vitest)
- Dependencies: `@modelcontextprotocol/sdk`, `zod@3`
- Dev dependencies: `typescript`, `@types/node`, `vitest`, `tsx`
- `tsconfig.json`: target ES2022, module Node16, moduleResolution Node16, strict, outDir `./build`, rootDir `./src`
- `.env.example`: single line `TODOIST_TOKEN=your_token_here`
**Validation:** `npm install` succeeds, `npx tsc --noEmit` succeeds on empty project

#### Task 1.2: Todoist type definitions
**Assignable to:** Haiku / local LLM
**Input:** Todoist API v1 task object shape (provided below)
**Output:** `src/types.ts`
**Details:**
```typescript
// Core types to define:
interface TodoistDue {
  date: string;          // "2026-04-15"
  string: string;        // "tomorrow" — the human-readable form
  datetime?: string;     // "2026-04-15T14:00:00Z" (only if time set)
  is_recurring: boolean;
  timezone?: string;
}

interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  labels: string[];
  priority: 1 | 2 | 3 | 4;  // 1=normal, 4=urgent
  due?: TodoistDue;
  is_completed: boolean;
  created_at: string;
  url: string;
}

// Also define: CreateTaskParams, UpdateTaskParams, GetTasksParams
```
**Validation:** `npx tsc --noEmit` passes

#### Task 1.3: Todoist HTTP client
**Assignable to:** Sonnet / capable local LLM
**Input:** Types from 1.2, Todoist API v1 endpoint reference
**Output:** `src/todoist-client.ts`
**Details:**
- Class `TodoistClient` constructed with `token: string`
- Uses native `fetch` (Node 18+, no axios needed)
- Methods map 1:1 to API endpoints:
  - `getTasks(params?: GetTasksParams): Promise<TodoistTask[]>` → `GET /api/v1/tasks`
  - `getTask(id: string): Promise<TodoistTask>` → `GET /api/v1/tasks/{id}`
  - `createTask(params: CreateTaskParams): Promise<TodoistTask>` → `POST /api/v1/tasks`
  - `updateTask(id: string, params: UpdateTaskParams): Promise<TodoistTask>` → `POST /api/v1/tasks/{id}`
  - `closeTask(id: string): Promise<void>` → `POST /api/v1/tasks/{id}/close`
  - `deleteTask(id: string): Promise<void>` → `DELETE /api/v1/tasks/{id}`
- All methods set `Authorization: Bearer ${token}` and `Content-Type: application/json`
- Error handling: throw typed error with status code + Todoist error body
- Optional `X-Request-Id` header on mutations (UUID per request for idempotency)
**Validation:** `npx tsc --noEmit` passes; unit tests in Task 4.1

---

### Phase 2 — Tool Definitions (one file per tool)

Each tool file exports two things: a Zod schema for the input and a handler function. The handler receives parsed input + a `TodoistClient` instance and returns the MCP tool response.

#### Task 2.1: get_tasks tool
**Assignable to:** Haiku / local LLM
**Input:** Types from 1.2, client from 1.3
**Output:** `src/tools/get-tasks.ts`
**Details:**
- Zod input schema: `{ project_id?: string, label?: string, filter?: string }`
- Handler calls `client.getTasks(params)`, returns tasks as formatted text content
- Response format: numbered list with task content, due date, priority, labels
**Validation:** Types check; tested in Phase 4

#### Task 2.2: create_task tool
**Assignable to:** Haiku / local LLM
**Input:** Types from 1.2, client from 1.3
**Output:** `src/tools/create-task.ts`
**Details:**
- Zod input schema: `{ content: string, project_id?: string, description?: string, due_string?: string, priority?: 1|2|3|4, labels?: string[] }`
- Handler calls `client.createTask(params)`, returns created task summary
**Validation:** Types check; tested in Phase 4

#### Task 2.3: update_task tool
**Assignable to:** Haiku / local LLM
**Input:** Types from 1.2, client from 1.3
**Output:** `src/tools/update-task.ts`
**Details:**
- Zod input schema: `{ task_id: string, content?: string, description?: string, due_string?: string, priority?: 1|2|3|4, labels?: string[] }`
- Handler calls `client.updateTask(id, params)`, returns updated task summary
**Validation:** Types check; tested in Phase 4

#### Task 2.4: complete_task tool
**Assignable to:** Haiku / local LLM
**Input:** Client from 1.3
**Output:** `src/tools/complete-task.ts`
**Details:**
- Zod input schema: `{ task_id: string }`
- Handler calls `client.closeTask(id)`, returns confirmation message
**Validation:** Types check; tested in Phase 4

#### Task 2.5: delete_task tool
**Assignable to:** Haiku / local LLM
**Input:** Client from 1.3
**Output:** `src/tools/delete-task.ts`
**Details:**
- Zod input schema: `{ task_id: string }`
- Handler calls `client.deleteTask(id)`, returns confirmation message
**Validation:** Types check; tested in Phase 4

---

### Phase 3 — Server Wiring

#### Task 3.1: MCP server entry point
**Assignable to:** Sonnet
**Input:** All tool files from Phase 2, MCP SDK patterns
**Output:** `src/index.ts`
**Details:**
- Reads `TODOIST_TOKEN` from `process.env` (fail fast if missing)
- Creates `TodoistClient` instance
- Creates `McpServer` with name `"todoist-mcp"`, version from package.json
- Registers all 5 tools using `server.tool(name, description, schema, handler)`
- Connects via `StdioServerTransport`
- Shebang line: `#!/usr/bin/env node`
- All logging via `console.error` (stdout is reserved for MCP protocol)
**Validation:** `npm run build` succeeds; server starts and responds to MCP Inspector

---

### Phase 4 — Tests

#### Task 4.1: Todoist client unit tests
**Assignable to:** Sonnet
**Input:** Client from 1.3
**Output:** `tests/todoist-client.test.ts`
**Details:**
- Mock `global.fetch` to return canned Todoist responses
- Test each method: correct URL, correct headers, correct body parsing
- Test error handling: 401 (bad token), 404 (task not found), 500
- Test `X-Request-Id` header present on mutations
**Validation:** `npm test` passes

#### Task 4.2: Tool handler unit tests (one file per tool)
**Assignable to:** Haiku / local LLM (template-driven, repeat for each tool)
**Input:** Each tool file from Phase 2
**Output:** `tests/tools/get-tasks.test.ts`, etc.
**Details:**
- Mock `TodoistClient` methods
- Test that handler calls the right client method with the right params
- Test that handler returns well-formatted MCP text content
- Test input validation via Zod (invalid inputs rejected)
**Validation:** `npm test` passes

#### Task 4.3: Integration test
**Assignable to:** Sonnet
**Input:** Full server from Phase 3
**Output:** `tests/integration/server.test.ts`
**Details:**
- Spawn server as child process
- Send MCP `tools/list` request, assert 5 tools returned
- Send `tools/call` for `get_tasks` with mocked HTTP, assert response shape
- Verify server shuts down cleanly
**Validation:** `npm test` passes

---

### Phase 5 — Documentation & Config

#### Task 5.1: README
**Assignable to:** Haiku / local LLM
**Input:** This build plan
**Output:** `README.md`
**Details:**
- Project description, prerequisites (Node 18+, Todoist API token)
- Setup: clone, `npm install`, copy `.env.example` to `.env`, add token
- Build: `npm run build`
- Claude Desktop config snippet (JSON for `mcpServers`)
- Claude Code config snippet
- Available tools with brief descriptions
**Validation:** Human review

#### Task 5.2: Claude Desktop / Claude Code config
**Assignable to:** Haiku / local LLM
**Input:** Built server path
**Output:** Config snippets in README (from 5.1)
**Details:**
```json
// Claude Desktop (~/.config/claude/claude_desktop_config.json)
{
  "mcpServers": {
    "todoist": {
      "command": "node",
      "args": ["/absolute/path/to/todoist-mcp/build/index.js"],
      "env": {
        "TODOIST_TOKEN": "your_token_here"
      }
    }
  }
}
```
**Validation:** Claude Desktop connects and lists tools

---

## Execution Order & Dependencies

```
0.1 ──→ 1.1 ──→ 1.2 ──→ 1.3 ──→ 2.1 ─┐
                                  2.2 ─┤
                                  2.3 ─┼──→ 3.1 ──→ 4.3 ──→ 5.1
                                  2.4 ─┤              ↑        ↑
                                  2.5 ─┘              │        │
                                    │                 │        │
                                    └──→ 4.1, 4.2 ────┘        │
                                                               │
                                                       5.2 ────┘
```

Task 0.1 runs first — it produces the validation script used after every subsequent task.
Tasks 2.1–2.5 can run in parallel once 1.3 is done.
Tasks 4.1 and 4.2 can run in parallel once their inputs exist.
Task 4.3 depends on 3.1 (full server).
Phase 5 depends on everything.

**Post-task gate:** After every task, run `./scripts/validate-task.sh <ID>` before merging to dev.

---

## Risk Notes

1. **Todoist API v1 endpoint verification:** The curl examples from search results confirm `GET/POST /api/v1/tasks` and `POST /api/v1/tasks/{id}/close` work. If any endpoint returns unexpected shapes, the client tests (4.1) will catch it before tool integration.
2. **REST v2 fallback:** The ClawHub reference shows checking for `410 Gone` and falling back. We won't build fallback — v1 is the target. If v2 is somehow still live, we don't care; we're on v1.
3. **Pagination:** v1 uses cursor-based pagination. For MVP, `get_tasks` will fetch the first page only (default limit). Pagination can be added later if needed.
4. **Rate limits:** Todoist allows 1000 requests per 15 minutes per user. Not a concern for this use case.
5. **Test project ID:** `6gP77C6vM2cRm2rg` ("Test MCP integration") — use for all smoke tests and live validation. Do not run tests against production projects.
