# Test Plan — Local Todoist MCP Server

**Date:** April 13, 2026
**Framework:** Vitest
**Strategy:** Unit tests with mocked HTTP, integration test with spawned server process

---

## Test Infrastructure

| Tool | Purpose |
|---|---|
| `vitest` | Test runner, assertions, mocking |
| `vi.fn()` / `vi.spyOn()` | Mock `global.fetch` and `TodoistClient` methods |
| `child_process.spawn` | Integration test — spawn server, send MCP messages over stdio |

No external test doubles library needed. Vitest's built-in mocking covers fetch and class methods.

---

## 0. Task Validation Gate (`scripts/validate-task.sh`)

Runs after every agent-produced task, before merging to dev. Not a test suite — a structural contract check.

| # | Check | Fails on |
|---|---|---|
| 0.1 | File existence | Expected output file missing |
| 0.2 | TypeScript compilation (`tsc --noEmit`) | Any type error anywhere in project |
| 0.3 | Export contract | Expected named exports not found in produced file |
| 0.4 | Import hygiene | Relative imports missing `.js` extension (ESM) |
| 0.5 | Test execution (if tests exist) | Any test failure for the module |

Usage: `./scripts/validate-task.sh 2.1` → runs all checks for Task 2.1's output (`src/tools/get-tasks.ts`).

---

## 1. Todoist Client Tests (`tests/todoist-client.test.ts`)

Tests the HTTP wrapper in isolation. All `fetch` calls are mocked.

### 1.1 Authentication
| # | Test case | Input | Expected |
|---|---|---|---|
| 1.1.1 | Bearer token sent on every request | Any method call | `Authorization: Bearer <token>` header present |
| 1.1.2 | Different tokens produce different headers | Two client instances with different tokens | Each sends its own token |

### 1.2 getTasks
| # | Test case | Input | Expected |
|---|---|---|---|
| 1.2.1 | No filters — fetches all tasks | `getTasks()` | `GET /api/v1/tasks`, no query params |
| 1.2.2 | Filter by project_id | `getTasks({ project_id: "abc" })` | Query string includes `project_id=abc` |
| 1.2.3 | Filter by label | `getTasks({ label: "work" })` | Query string includes `label=work` |
| 1.2.4 | Filter by filter string | `getTasks({ filter: "today" })` | Query string includes `filter=today` |
| 1.2.5 | Returns parsed TodoistTask[] | Valid JSON response | Array of typed task objects |
| 1.2.6 | Empty result set | `[]` response | Returns empty array, no error |

### 1.3 getTask
| # | Test case | Input | Expected |
|---|---|---|---|
| 1.3.1 | Fetches single task by ID | `getTask("123")` | `GET /api/v1/tasks/123` |
| 1.3.2 | 404 response | Task doesn't exist | Throws error with status 404 |

### 1.4 createTask
| # | Test case | Input | Expected |
|---|---|---|---|
| 1.4.1 | Minimal creation | `{ content: "Buy milk" }` | `POST /api/v1/tasks`, body has `content` |
| 1.4.2 | Full params | `{ content, project_id, due_string, priority, labels, description }` | All fields in POST body |
| 1.4.3 | X-Request-Id header present | Any create call | UUID in `X-Request-Id` header |
| 1.4.4 | Returns created task | 200 response with task JSON | Parsed TodoistTask object |

### 1.5 updateTask
| # | Test case | Input | Expected |
|---|---|---|---|
| 1.5.1 | Update content | `updateTask("123", { content: "new" })` | `POST /api/v1/tasks/123`, body `{ content: "new" }` |
| 1.5.2 | Update due date | `updateTask("123", { due_string: "tomorrow" })` | Body has `due_string` |
| 1.5.3 | X-Request-Id header present | Any update call | UUID in `X-Request-Id` header |
| 1.5.4 | 404 on nonexistent task | Invalid ID | Throws error with status 404 |

### 1.6 closeTask
| # | Test case | Input | Expected |
|---|---|---|---|
| 1.6.1 | Closes task | `closeTask("123")` | `POST /api/v1/tasks/123/close` |
| 1.6.2 | Returns void on success | 204 response | Resolves without error |
| 1.6.3 | 404 on nonexistent task | Invalid ID | Throws error with status 404 |

### 1.7 deleteTask
| # | Test case | Input | Expected |
|---|---|---|---|
| 1.7.1 | Deletes task | `deleteTask("123")` | `DELETE /api/v1/tasks/123` |
| 1.7.2 | Returns void on success | 204 response | Resolves without error |
| 1.7.3 | 404 on nonexistent task | Invalid ID | Throws error with status 404 |

### 1.8 Error handling (shared across methods)
| # | Test case | Input | Expected |
|---|---|---|---|
| 1.8.1 | 401 Unauthorized | Bad token | Throws with status 401 and error message |
| 1.8.2 | 500 Server Error | Server down | Throws with status 500 |
| 1.8.3 | Network failure | fetch rejects | Throws with descriptive error |
| 1.8.4 | Non-JSON error body | HTML error page | Throws with status code, doesn't crash on parse |

---

## 2. Tool Handler Tests (`tests/tools/*.test.ts`)

Each tool handler is tested with a mocked `TodoistClient`. Tests verify: correct client method called, correct params passed, correct MCP response shape returned.

### 2.1 get_tasks handler
| # | Test case | Expected |
|---|---|---|
| 2.1.1 | No params → calls `getTasks()` with no filters | Returns formatted task list |
| 2.1.2 | With project_id → passes to client | Client receives `{ project_id }` |
| 2.1.3 | Empty result → returns "No tasks found" message | MCP text content with message |
| 2.1.4 | Multiple tasks → formatted numbered list | Each task shows content, due, priority |
| 2.1.5 | Task with no due date → omits due field gracefully | No crash, clean formatting |

### 2.2 create_task handler
| # | Test case | Expected |
|---|---|---|
| 2.2.1 | Minimal input → creates task | Returns confirmation with task ID and content |
| 2.2.2 | Full input → all params forwarded | Client receives all fields |
| 2.2.3 | Missing required `content` → Zod rejects | Schema validation error |

### 2.3 update_task handler
| # | Test case | Expected |
|---|---|---|
| 2.3.1 | Update content → forwards to client | Returns updated task summary |
| 2.3.2 | Update due_string → forwards to client | Client receives `{ due_string }` |
| 2.3.3 | Missing task_id → Zod rejects | Schema validation error |
| 2.3.4 | No update fields provided → still valid call | Client called with empty update body |

### 2.4 complete_task handler
| # | Test case | Expected |
|---|---|---|
| 2.4.1 | Valid task_id → closes task | Returns confirmation message |
| 2.4.2 | Missing task_id → Zod rejects | Schema validation error |
| 2.4.3 | Client throws 404 → handler propagates error | Error surfaced in MCP response |

### 2.5 delete_task handler
| # | Test case | Expected |
|---|---|---|
| 2.5.1 | Valid task_id → deletes task | Returns confirmation message |
| 2.5.2 | Missing task_id → Zod rejects | Schema validation error |
| 2.5.3 | Client throws 404 → handler propagates error | Error surfaced in MCP response |

---

## 3. Integration Tests (`tests/integration/server.test.ts`)

Spawns the built server as a child process and communicates over stdin/stdout using MCP JSON-RPC protocol.

| # | Test case | Details |
|---|---|---|
| 3.1 | Server starts without error | Spawn process, assert no stderr crash, assert MCP `initialize` response |
| 3.2 | `tools/list` returns 5 tools | Send `tools/list`, assert names: `get_tasks`, `create_task`, `update_task`, `complete_task`, `delete_task` |
| 3.3 | `tools/call` get_tasks succeeds | Mock TODOIST_TOKEN to a test value, send `tools/call` for `get_tasks` — assert response structure (will fail on HTTP since token is fake, but server won't crash) |
| 3.4 | Missing TODOIST_TOKEN → server exits with error | Spawn without env var, assert process exits with non-zero code and stderr message |
| 3.5 | Server shuts down cleanly on stdin close | Close stdin, assert process exits with code 0 |

---

## 4. Manual Smoke Tests (Post-Build)

These are run once by Jonathan after all automated tests pass. All live tests use the **"Test MCP integration"** project (`6gP77C6vM2cRm2rg`).

| # | Test | How |
|---|---|---|
| 4.1 | MCP Inspector connection | `npx @modelcontextprotocol/inspector node build/index.js` — verify tools list |
| 4.2 | Claude Desktop integration | Add to `claude_desktop_config.json`, restart, verify tools appear |
| 4.3 | Live get_tasks | Ask Claude to list tasks from project `6gP77C6vM2cRm2rg` |
| 4.4 | Live create_task | Ask Claude to create a test task in project `6gP77C6vM2cRm2rg`, verify it appears in Todoist app |
| 4.5 | Live complete + delete | Complete and delete the test task, verify in Todoist app |
| 4.6 | Error case — bad token | Set invalid token, verify server returns clear error, doesn't crash |

---

## Coverage Targets

| Layer | Target | Rationale |
|---|---|---|
| `todoist-client.ts` | 100% line coverage | It's the only HTTP boundary; every path must be tested |
| `tools/*.ts` | 100% line coverage | Small files with simple logic; full coverage is trivial |
| `index.ts` | Covered by integration test | Wiring code, not worth unit testing in isolation |
| Overall | >90% | Achievable given the small surface area |
