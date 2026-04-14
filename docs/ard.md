# Architecture Reference Document — Local Todoist MCP Server

**Date:** April 13, 2026
**Version:** 1.0
**Status:** Approved for build

---

## 1. Purpose

Replace the unreliable hosted Todoist MCP integration with a local, personal-token-based MCP server that Claude can use to keep Todoist in sync with session-agreed action items.

---

## 2. System Context

```
┌──────────────────────────────────┐
│  Claude Desktop / Claude Code    │
│  (MCP Client)                    │
│                                  │
│  Spawns server as child process  │
│  Communicates via stdin/stdout   │
└──────────┬───────────────────────┘
           │ stdio (JSON-RPC)
           ▼
┌──────────────────────────────────┐
│  todoist-mcp                     │
│  (MCP Server — Node.js)         │
│                                  │
│  ┌─────────────┐  ┌───────────┐ │
│  │ McpServer   │  │ Todoist   │ │
│  │ (SDK v1.x)  │──│ Client    │─┼──→ https://api.todoist.com/api/v1/
│  └─────────────┘  └───────────┘ │    (Todoist API v1)
│                                  │
│  Tools:                          │
│  • get_tasks                     │
│  • create_task                   │
│  • update_task                   │
│  • complete_task                 │
│  • delete_task                   │
└──────────────────────────────────┘
```

---

## 3. Key Architecture Decisions

### ADR-1: Todoist API v1, not REST v2
**Decision:** Target the unified Todoist API v1 at `api.todoist.com/api/v1/`.
**Context:** REST v2 was deprecated in April 2025. The v1 API merges the old REST and Sync APIs. Some v2 endpoints have already started returning `410 Gone`.
**Consequence:** Endpoint paths change from `/rest/v2/tasks` to `/api/v1/tasks`. Response shapes are nearly identical for task CRUD. Cursor-based pagination is available but deferred to post-MVP.

### ADR-2: Personal API token, not OAuth
**Decision:** Auth via `TODOIST_TOKEN` environment variable. No OAuth flow, no token refresh.
**Context:** This is a single-user, personal tool. OAuth complexity is unnecessary. The token is sourced from Todoist Settings → Integrations → Developer.
**Consequence:** The server cannot be used by other users without giving them access to the token. This is acceptable for the intended use case.

### ADR-3: stdio transport, not HTTP
**Decision:** Use MCP's stdio transport (StdioServerTransport).
**Context:** The server runs locally, spawned by Claude Desktop or Claude Code as a child process. No network exposure needed. stdio is simpler, has no auth/CORS concerns, and is the standard for local MCP servers.
**Consequence:** The server cannot be shared across machines. If remote access is needed later, Streamable HTTP transport can be added as a second transport option.

### ADR-4: Native fetch, no HTTP library
**Decision:** Use Node.js built-in `fetch` (available since Node 18) for Todoist API calls.
**Context:** The Todoist client makes simple JSON requests. No need for axios, got, or similar. Fewer dependencies = smaller attack surface, simpler for delegated agents to understand.
**Consequence:** Requires Node 18+. No automatic retry or request interceptors — these can be added later if needed.

### ADR-5: One file per tool
**Decision:** Each MCP tool lives in its own file under `src/tools/`, exporting a Zod schema and handler function.
**Context:** This project is designed for multi-agent execution. Each tool file is a self-contained unit that can be written, reviewed, and tested independently.
**Consequence:** The server entry point (`index.ts`) imports and registers all tools. Adding a new tool means creating one file and adding one import + registration call.

### ADR-6: Mutation approval is a Claude-side concern, not server-side
**Decision:** The MCP server does NOT enforce approval workflows. It executes tool calls as requested.
**Context:** The requirement that "Claude always surfaces a diff/proposal before mutating tasks" is a prompting/system-prompt concern, not a server concern. The server is a dumb pipe to Todoist. Claude's system prompt (or the MCP tool descriptions) should instruct Claude to always confirm before calling mutation tools.
**Consequence:** Tool descriptions for `create_task`, `update_task`, `complete_task`, and `delete_task` will include text like "Always confirm with the user before calling this tool." This is guidance for the LLM, not enforcement. A malicious or misconfigured client could still call mutations directly.

### ADR-7: Idempotency via X-Request-Id
**Decision:** All mutation requests (create, update, close, delete) include a `X-Request-Id` header with a random UUID.
**Context:** Todoist supports request deduplication via this header. If a network timeout causes a retry, the duplicate request is discarded.
**Consequence:** Requires `crypto.randomUUID()` (available in Node 18+). Minimal cost, prevents accidental duplicates.

---

## 4. Data Flow

### Read flow (get_tasks)
```
Claude → MCP tools/call → get_tasks handler → TodoistClient.getTasks()
       → HTTP GET /api/v1/tasks?project_id=X
       → Todoist API returns JSON array
       → Handler formats as numbered text list
       → MCP response → Claude
```

### Write flow (create_task)
```
Claude proposes task creation to user → User approves
       → MCP tools/call → create_task handler → TodoistClient.createTask()
       → HTTP POST /api/v1/tasks (with X-Request-Id)
       → Todoist API returns created task JSON
       → Handler returns confirmation text
       → MCP response → Claude reports to user
```

---

## 5. Error Handling Strategy

| Error source | Handling |
|---|---|
| Missing TODOIST_TOKEN | Server exits immediately with `console.error` message. Non-zero exit code. |
| Todoist 401 Unauthorized | Client throws typed error. Tool handler catches and returns MCP error text: "Authentication failed — check your TODOIST_TOKEN." |
| Todoist 404 Not Found | Client throws. Handler returns: "Task not found." |
| Todoist 429 Rate Limited | Client throws with rate limit info. Handler returns: "Rate limited — try again shortly." |
| Todoist 5xx | Client throws. Handler returns: "Todoist API error — please retry." |
| Network failure (fetch rejects) | Client throws. Handler returns: "Could not reach Todoist API — check network." |
| Invalid tool input | Zod schema rejects before handler runs. MCP SDK returns validation error automatically. |

All errors are non-fatal to the server process. Only a missing token at startup kills the process.

---

## 6. Security Considerations

| Concern | Mitigation |
|---|---|
| Token exposure | Stored in environment variable, never logged, never included in MCP responses. `.env` is gitignored. |
| Unauthorized access | stdio transport has no network surface. Only the process that spawned the server can communicate with it. |
| Malicious tool calls | Todoist token has full account access. Risk accepted — this is a personal tool on a personal machine. The approval workflow in Claude's system prompt is the guard. |
| Dependency supply chain | Minimal dependencies: MCP SDK, Zod, TypeScript (dev). All from well-known publishers. `npm audit` in CI. |

---

## 7. Non-Goals (Explicit)

These are intentionally out of scope for this version:

- **Pagination** — First-page results only. Most personal Todoist accounts have <100 active tasks per project.
- **Project/label/section CRUD** — Only task operations. Projects and labels are managed in the Todoist app.
- **Webhook/real-time sync** — Claude pulls on demand, not push-based.
- **Multi-user support** — Single token, single user.
- **REST v2 fallback** — v1 only. No fallback path.
- **Caching** — Every `get_tasks` call hits the API. Todoist's rate limits are generous enough.
- **Recurring task handling** — `close` on a recurring task creates the next occurrence automatically (Todoist's behavior). No special handling needed.

---

## 8. Future Considerations

| Enhancement | Trigger |
|---|---|
| Cursor-based pagination in get_tasks | If task lists are regularly truncated |
| Streamable HTTP transport | If remote access from MacBook → Mac mini is needed |
| Project listing tool | If Claude needs to discover project IDs dynamically |
| Batch operations (sync API) | If creating 10+ tasks per session becomes common |
| Structured tool responses | When MCP SDK v2 stabilizes and supports richer response types |
