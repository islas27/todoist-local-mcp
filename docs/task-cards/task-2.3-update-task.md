# Task Card 2.3 — update_task Tool

## Complexity rating
Low — one extra step vs. create: destructure `task_id` before passing params to client.

## Context
You are writing one tool file for `todoist-mcp`, a local TypeScript MCP server that wraps the Todoist API v1. Each tool file exports a Zod input schema and an async handler function. This file handles the `update_task` tool.

## Input files

### `src/types.ts` (relevant parts)
```typescript
export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  labels: string[];
  priority: 1 | 2 | 3 | 4;
  is_completed: boolean;
  created_at: string;
  url: string;
}

export interface UpdateTaskParams {
  content?: string;
  description?: string;
  due_string?: string;
  priority?: 1 | 2 | 3 | 4;
  labels?: string[];
}
```

### `src/todoist-client.ts` (relevant signatures only)
```typescript
export class TodoistClient {
  updateTask(id: string, params: UpdateTaskParams): Promise<TodoistTask>;
}
```

## Your task

Create `src/tools/update-task.ts` that exports:

### `UpdateTaskSchema`
A Zod object schema:
- `task_id`: required string (the ID of the task to update)
- `content`: optional string
- `description`: optional string
- `due_string`: optional string
- `priority`: optional numeric literals `1 | 2 | 3 | 4`
- `labels`: optional array of strings

### `handleUpdateTask`
```typescript
export async function handleUpdateTask(
  input: z.infer<typeof UpdateTaskSchema>,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }>
```

**Behavior:**
- Destructure `task_id` from `input`, spread the rest as `params`
- Call `client.updateTask(task_id, params)`
- Return: `{ content: [{ type: "text", text: "Updated task: {result.content} (ID: {result.id})" }] }`

**Important:** `task_id` is part of the Zod schema (so Claude can provide it) but must NOT be forwarded to `client.updateTask` as part of `params` — the client takes it as a separate first argument.

## Constraints
- TypeScript strict mode, ES2022, Node16 module resolution
- All relative imports must use `.js` extensions (ESM requirement)
- `priority` in the Zod schema must be numeric literals, not string enum
- Only allowed imports: `zod`, `../todoist-client.js`

## Definition of done
- `npx tsc --noEmit` passes with zero errors
- File exports `UpdateTaskSchema` and `handleUpdateTask`

## Output format
Respond with only the contents of `src/tools/update-task.ts`. No explanation, no markdown fences — just the raw TypeScript file content.
