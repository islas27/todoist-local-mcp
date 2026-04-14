# Task Card 2.5 — delete_task Tool

## Complexity rating
Low — identical structure to complete_task, different client method and response text.

## Context
You are writing one tool file for `todoist-mcp`, a local TypeScript MCP server that wraps the Todoist API v1. Each tool file exports a Zod input schema and an async handler function. This file handles the `delete_task` tool.

## Input files

### `src/todoist-client.ts` (relevant signatures only)
```typescript
export class TodoistClient {
  deleteTask(id: string): Promise<void>;
}
```

## Your task

Create `src/tools/delete-task.ts` that exports:

### `DeleteTaskSchema`
```typescript
export const DeleteTaskSchema = z.object({
  task_id: z.string(),
});
```

### `handleDeleteTask`
```typescript
export async function handleDeleteTask(
  input: { task_id: string },
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }>
```

**Behavior:**
- Call `client.deleteTask(input.task_id)`
- Return: `{ content: [{ type: "text", text: "Task {input.task_id} deleted." }] }`

## Constraints
- TypeScript strict mode, ES2022, Node16 module resolution
- All relative imports must use `.js` extensions (ESM requirement)
- Only allowed imports: `zod`, `../todoist-client.js`

## Definition of done
- `npx tsc --noEmit` passes with zero errors
- File exports `DeleteTaskSchema` and `handleDeleteTask`

## Output format
Respond with only the contents of `src/tools/delete-task.ts`. No explanation, no markdown fences — just the raw TypeScript file content.
