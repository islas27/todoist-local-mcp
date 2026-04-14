# Task: [ID from build plan]

## Context
You are writing a module for `todoist-mcp`, a TypeScript MCP server
that wraps the Todoist API v1. The server uses stdio transport and
the `@modelcontextprotocol/sdk` package.

## Input files
<paste actual file contents here>

## Your task
Create `src/tools/get-tasks.ts` that:
- Exports `GetTasksSchema` (Zod object: { project_id?: string, ... })
- Exports `handleGetTasks(input, client)` returning MCP tool response
- [specific behavioral requirements]

## Constraints
- TypeScript strict mode, ES2022 target, Node16 module resolution
- Use `.js` extensions in relative imports (ESM requirement)
- No console.log — use console.error for any debug logging
- No external dependencies beyond what's in package.json

## Definition of done
- `npx tsc --noEmit` passes
- File exports match the signatures above