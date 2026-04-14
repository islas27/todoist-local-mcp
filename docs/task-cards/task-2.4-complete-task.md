# Task Card 2.4 — complete_task Tool

## Complexity rating
Low — minimal schema, single void client call.

## Context
You are writing one tool file for `todoist-mcp`, a local TypeScript MCP server that wraps the Todoist API v1. Each tool file exports a Zod input schema and an async handler function. This file handles the `complete_task` tool.

## Input files

### `src/todoist-client.ts` (relevant signatures only)
```typescript
export class TodoistClient {
  closeTask(id: string): Promise<void>;
}
```

## Your task

Create `src/tools/complete-task.ts` that exports:

### `CompleteTaskSchema`
```typescript
export const CompleteTaskSchema = z.object({
  task_id: z.string(),
});
```

### `handleCompleteTask`
```typescript
export async function handleCompleteTask(
  input: { task_id: string },
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }>
```

**Behavior:**
- Call `client.closeTask(input.task_id)` (note: the client method is `closeTask`, not `completeTask`)
- Return: `{ content: [{ type: "text", text: "Task {input.task_id} marked as complete." }] }`

## Constraints
- TypeScript strict mode, ES2022, Node16 module resolution
- All relative imports must use `.js` extensions (ESM requirement)
- Only allowed imports: `zod`, `../todoist-client.js`

## Definition of done
- `npx tsc --noEmit` passes with zero errors
- File exports `CompleteTaskSchema` and `handleCompleteTask`

## Output format
Respond with only the contents of `src/tools/complete-task.ts`. No explanation, no markdown fences — just the raw TypeScript file content.
