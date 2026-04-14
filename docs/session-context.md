# Session Context — Todoist MCP Server Planning

**Date:** April 13, 2026
**Session type:** Architecture & planning (no code produced)

---

## What happened this session

Jonathan and Claude designed a complete build plan for a local Todoist MCP server. Three artifacts were produced: a **Build Plan**, a **Test Plan**, and an **ARD** (Architecture Reference Document). No code was written — artifacts are the deliverables.

---

## Key decisions made

### API version
- **Todoist REST v2 is deprecated.** Todoist launched a unified API v1 (`api.todoist.com/api/v1/`) in April 2025, merging REST v2 and Sync v9. REST v2 deprecation was targeted for late 2025/early 2026 and some endpoints already return `410 Gone`.
- The original spec targeted v2. **All plans now target v1.** Endpoint mapping is nearly identical: `/api/v1/tasks` instead of `/rest/v2/tasks`.

### Token verification
- Jonathan revoked his old Todoist token and generated a new one.
- Token is stored as `TODOIST_TOKEN` in `~/.zshrc`.
- Verified working via: `curl -s "https://api.todoist.com/api/v1/projects" -H "Authorization: Bearer $TODOIST_TOKEN" | python3 -m json.tool`
- API v1 confirmed live and responding.

### Test project
- Jonathan created a dedicated Todoist project: **"Test MCP integration"**
- Project ID: `6gP77C6vM2cRm2rg`
- All smoke tests and live validation target this project exclusively.

### Multi-agent execution strategy
- Tasks are sized as "micro-tasks" for delegation to Sonnet, Haiku, or local LLMs (qwen2.5:7b on Mac mini via Ollama).
- **No persistent "main chat"** — each agent gets a short-lived, purpose-specific chat with a task card.
- Task cards contain: Context (2 sentences), Input files (pasted literally), The ask (exact file path + export signatures), Constraints, Definition of done.
- Sonnet generates task cards from the build plan + produced files. Jonathan reviews before dispatching.
- Parallel execution for independent tasks (Phase 2: five tool files simultaneously).
- **Post-task validation gate:** `./scripts/validate-task.sh <task_id>` runs after every agent output, before merging to dev.

### Git strategy
- `main` untouched, `dev` is integration branch.
- Each task gets a branch off dev: `task/1.1-scaffold`, `task/2.3-update-tool`, etc.
- Merge to dev only after validation script passes.

### Task 0 — Validation infrastructure
- Added to the build plan as Phase 0 (runs before any real work).
- Produces `scripts/validate-task.sh` — a bash script that checks file existence, TypeScript compilation, export contracts, import hygiene (.js extensions), and test execution.
- Designed to be portable: swap the lookup tables for a new project.

### Filesystem MCP for Claude Desktop
- Configured `@modelcontextprotocol/server-filesystem` for Claude Desktop.
- Scoped per-project (not broad `/Development` access) for security — older projects may have hardcoded credentials.
- Config lives at `~/Library/Application Support/Claude/claude_desktop_config.json`.

---

## Artifacts produced (all saved to `docs/`)

1. **`docs/build-plan.md`** — Full micro-task breakdown across 6 phases (0–5), dependency graph, execution order, risk notes.
2. **`docs/test-plan.md`** — Unit tests (client + tools), integration test (spawned server), manual smoke tests, validation gate spec.
3. **`docs/ard.md`** — 7 architecture decisions (API v1, personal token, stdio, native fetch, one-file-per-tool, approval is Claude-side, idempotency headers), system context diagram, error handling strategy, security considerations, non-goals, future considerations.
4. **`docs/session-context.md`** — This file.

---

## What's next

1. Start a Sonnet chat in Claude Code → execute Task 0.1 (validation script).
2. Validate the script works (run against nonexistent file → exits 1).
3. Execute Tasks 1.1 → 1.2 → 1.3 sequentially (each in its own Sonnet chat).
4. Have Sonnet generate task cards for Phase 2 (2.1–2.5).
5. Fire off five parallel Haiku/local-LLM chats for Phase 2.
6. Continue through Phase 3 → 4 → 5 per the dependency graph.
7. **Model comparison:** Run Task 2.1 or 2.2 on Haiku, qwen2.5:7b, and deepseek-coder:6.7b with the same task card. Use `validate-task.sh` output as the benchmark.

---

## Reference IDs

| Item | Value |
|---|---|
| Todoist test project ID | `6gP77C6vM2cRm2rg` |
| Todoist test project name | Test MCP integration |
| Todoist home setup project ID | `6g7v72j25GF3W6R7` |
| Todoist Learning Backlog sub-project ID | `6gCFGcvqmMCvvHxV` |
| Token env var | `TODOIST_TOKEN` (in `~/.zshrc`) |
| MCP SDK version | `@modelcontextprotocol/sdk` v1.x (stable) |
| Todoist API base | `https://api.todoist.com/api/v1/` |
| Node.js minimum | 18+ |
| Project path | `/Users/islas/Development/todoist-local-mcp` |
