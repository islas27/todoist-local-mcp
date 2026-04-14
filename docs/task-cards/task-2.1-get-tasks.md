# Task Card 2.1 — get_tasks Tool

## Complexity rating
Low — straightforward data formatting, no branching logic beyond empty check.

## Context
You are writing one tool file for `todoist-mcp`, a local TypeScript MCP server that wraps the Todoist API v1. The server exposes 5 tools to Claude via stdio. Each tool file exports a Zod input schema and an async handler function. This file handles the `get_tasks` tool.

## Input files

### `src/types.ts`
```typescript
export interface TodoistDue {
  date: string;
  string: string;
  time?: string;
  is_recurring: boolean;
  timezone?: string;
}

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  labels: string[];
  priority: 1 | 2 | 3 | 4;
  due?: TodoistDue;
  is_completed: boolean;
  created_at: string;
  url: string;
}

export interface GetTasksParams {
  project_id?: string;
  label?: string;
  filter?: string;
}
```

### `src/todoist-client.ts` (relevant signatures only)
```typescript
export class TodoistClient {
  getTasks(params?: GetTasksParams): Promise<TodoistTask[]>;
}
```

## Your task

Create `src/tools/get-tasks.ts` that exports:

### `GetTasksSchema`
A Zod object schema:
```typescript
export const GetTasksSchema = z.object({
  project_id: z.string().optional(),
  label: z.string().optional(),
  filter: z.string().optional(),
});
```

### `handleGetTasks`
```typescript
export async function handleGetTasks(
  input: { project_id?: string; label?: string; filter?: string },
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }>
```

**Behavior:**
- Call `client.getTasks(input)`
- If the result is empty, return `{ content: [{ type: "text", text: "No tasks found." }] }`
- Otherwise, format tasks as a numbered list. For each task:
  - First line: `{n}. [{priority}] {content}` where priority maps as: `1 → P4`, `2 → P3`, `3 → P2`, `4 → P1`
  - If `task.due` exists, next line (2-space indent): `  Due: {task.due.date}`
  - If `task.labels` is non-empty, next line (2-space indent): `  Labels: {labels joined with ", "}`
- Join all lines with `"\n"` and return as a single text content item

## Constraints
- TypeScript strict mode, ES2022, Node16 module resolution
- All relative imports must use `.js` extensions (ESM requirement)
- No `console.log` — use `console.error` if any debug logging is needed
- Only allowed imports: `zod`, `../todoist-client.js`

## Definition of done
- `npx tsc --noEmit` passes with zero errors
- File exports `GetTasksSchema` and `handleGetTasks`

## Output format
Respond with only the contents of `src/tools/get-tasks.ts`. No explanation, no markdown fences — just the raw TypeScript file content.
