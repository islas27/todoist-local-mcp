# Task Card 2.2 — create_task Tool

## Complexity rating
Low — single client call, simple confirmation response.

## Context
You are writing one tool file for `todoist-mcp`, a local TypeScript MCP server that wraps the Todoist API v1. Each tool file exports a Zod input schema and an async handler function. This file handles the `create_task` tool.

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

export interface CreateTaskParams {
  content: string;
  project_id?: string;
  description?: string;
  due_string?: string;
  priority?: 1 | 2 | 3 | 4;
  labels?: string[];
}
```

### `src/todoist-client.ts` (relevant signatures only)
```typescript
export class TodoistClient {
  createTask(params: CreateTaskParams): Promise<TodoistTask>;
}
```

## Your task

Create `src/tools/create-task.ts` that exports:

### `CreateTaskSchema`
A Zod object schema matching `CreateTaskParams`:
- `content`: required string
- `project_id`: optional string
- `description`: optional string
- `due_string`: optional string
- `priority`: optional, must be the numeric literals `1 | 2 | 3 | 4` (not strings)
- `labels`: optional array of strings

### `handleCreateTask`
```typescript
export async function handleCreateTask(
  input: z.infer<typeof CreateTaskSchema>,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }>
```

**Behavior:**
- Call `client.createTask(input)`
- Return: `{ content: [{ type: "text", text: "Created task: {task.content} (ID: {task.id})" }] }`

## Constraints
- TypeScript strict mode, ES2022, Node16 module resolution
- All relative imports must use `.js` extensions (ESM requirement)
- `priority` in the Zod schema must be numeric literals (`z.literal(1)` etc.), not string enum — the `CreateTaskParams` type requires `1 | 2 | 3 | 4` as numbers
- Only allowed imports: `zod`, `../todoist-client.js`

## Definition of done
- `npx tsc --noEmit` passes with zero errors
- File exports `CreateTaskSchema` and `handleCreateTask`

## Output format
Respond with only the contents of `src/tools/create-task.ts`. No explanation, no markdown fences — just the raw TypeScript file content.
