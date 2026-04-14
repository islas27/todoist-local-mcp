# Task Card 4.3 — Integration Test

## Complexity rating
High — requires spawning a child process over stdio, speaking JSON-RPC 2.0, and handling async message framing.

## Context
You are writing an integration test for `todoist-mcp`, a local MCP server that communicates over stdio using JSON-RPC 2.0. The test spawns the built server as a child process, sends MCP protocol messages over stdin, and reads responses from stdout. The Todoist HTTP client is NOT mocked at the module level — instead the test sets a fake `TODOIST_TOKEN` and intercepts `global.fetch` inside the server process by injecting a mock module. Because that is complex, this test focuses on protocol-level correctness: it tests that the server speaks MCP correctly, not that it returns real Todoist data.

## Built server location
`build/index.js` (produced by `npm run build` / `npx tsc`)

## MCP protocol primer (stdio transport)

Messages are newline-delimited JSON. Each message is a complete JSON-RPC 2.0 object on a single line.

**Client → Server (initialize):**
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0"}}}
```

**Server → Client (initialize response):**
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{...},"serverInfo":{"name":"todoist-mcp","version":"0.1.0"}}}
```

**Client → Server (initialized notification, no response expected):**
```json
{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
```

**Client → Server (tools/list):**
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

**Server → Client (tools/list response):**
```json
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"get_tasks",...},...]}}
```

## Your task

Create `tests/integration/server.test.ts` with the following tests:

### Setup
- Before all tests: run `npm run build` to ensure `build/index.js` is current (use `execSync` from `node:child_process`)
- Spawn the server: `spawn("node", ["build/index.js"], { env: { ...process.env, TODOIST_TOKEN: "test-token" } })`
- Write a helper `sendMessage(proc, message)` that writes `JSON.stringify(message) + "\n"` to `proc.stdin`
- Write a helper `readMessage(proc): Promise<unknown>` that reads one line from `proc.stdout` and parses it as JSON. Buffer partial lines.
- After all tests: kill the server process

### Test 1: initialize handshake
- Send the `initialize` request (id: 1)
- Assert the response has `result.serverInfo.name === "todoist-mcp"`
- Assert `result.protocolVersion` is a non-empty string
- Send the `notifications/initialized` notification

### Test 2: tools/list returns 5 tools
- Send the `tools/list` request (id: 2)
- Assert the response has `result.tools` as an array of length 5
- Assert tool names are exactly: `["get_tasks", "create_task", "update_task", "complete_task", "delete_task"]` (order does not matter)

### Test 3: server starts without crashing
- This is satisfied by tests 1 and 2 succeeding — no additional assertions needed

### Test 4: missing token exits with code 1
- Spawn a second server instance with `TODOIST_TOKEN` unset (omit it from env entirely)
- Assert the process exits with code 1 within 2 seconds

## Constraints
- Use vitest with a `timeout` of 15000ms on the describe block: `describe("...", { timeout: 15000 }, () => { ... })`
- Use `node:child_process` for `spawn` and `execSync`
- Import from `"node:..."` for all Node built-ins
- All relative imports must use `.js` extensions
- Do NOT mock `fetch` at the module level — the initialize/tools/list tests do not call Todoist at all
- Tests must pass with `npx vitest run tests/integration/server.test.ts`

## Definition of done
- File exists at `tests/integration/server.test.ts`
- `npx tsc --noEmit` passes
- `npx vitest run tests/integration/server.test.ts` passes (requires `npm run build` to have been run first)

## Output format
Respond with only the contents of `tests/integration/server.test.ts`. No explanation, no markdown fences — just the raw TypeScript file content.
