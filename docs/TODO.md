# TODO — Local Todoist MCP Server

Task completion is tracked here. After each delegated task, run `./scripts/validate-task.sh <task_id>` and mark it done once it passes.

---

## Phase 0 — Validation Infrastructure

- [x] **0.1** — Create `scripts/validate-task.sh` (post-task validation gate)

---

## Phase 1 — Scaffolding

- [x] **1.1** — Project initialization (`package.json`, `tsconfig.json`, `.env.example`, empty dirs, `npm install`)
- [x] **1.2** — Todoist type definitions (`src/types.ts`)
- [x] **1.3** — Todoist HTTP client (`src/todoist-client.ts`)

---

## Phase 2 — Tool Definitions

- [x] **2.1** — `get_tasks` tool (`src/tools/get-tasks.ts`)
- [x] **2.2** — `create_task` tool (`src/tools/create-task.ts`)
- [x] **2.3** — `update_task` tool (`src/tools/update-task.ts`)
- [x] **2.4** — `complete_task` tool (`src/tools/complete-task.ts`)
- [x] **2.5** — `delete_task` tool (`src/tools/delete-task.ts`)

---

## Phase 3 — Server Wiring

- [x] **3.1** — MCP server entry point (`src/index.ts`)

---

## Phase 4 — Tests

- [x] **4.1** — Todoist client unit tests (`tests/todoist-client.test.ts`)
- [x] **4.2** — Tool handler unit tests (`tests/tools/*.test.ts`)
- [x] **4.3** — Integration test (`tests/integration/server.test.ts`)

---

## Phase 5 — Documentation & Config

- [x] **5.1** — README (`README.md`)
- [x] **5.2** — Claude Desktop / Claude Code config snippets (part of README)

---

## Phase 6 — Project, Label & Section Discovery

- [x] **6.1** — Add `TodoistProject`, `TodoistLabel`, `TodoistSection` types; add `section_id` to task params (`src/types.ts`)
- [x] **6.2** — Add `getProjects()`, `getLabels()`, `getSections()` to `TodoistClient` (`src/todoist-client.ts`)
- [x] **6.3** — `get_projects` tool (`src/tools/get-projects.ts`)
- [x] **6.4** — `get_labels` tool (`src/tools/get-labels.ts`)
- [x] **6.5** — `get_sections` tool (`src/tools/get-sections.ts`)
- [x] **6.6** — Add `section_id` to `create_task` and `update_task` schemas
- [x] **6.7** — Wire tools in server entry point (`src/index.ts`)
- [x] **6.8** — Tests: client methods + tool handlers

---

## Execution Order

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

Tasks 2.1–2.5 can run in parallel once 1.3 is done.
Tasks 4.1 and 4.2 can run in parallel once their inputs exist.
