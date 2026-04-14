# Task Card 4.2 — Tool Handler Unit Tests

## Complexity rating
Low — highly repetitive pattern, 5 files following the same template.

## Context
You are writing unit tests for the 5 MCP tool handlers in `todoist-mcp`, a local TypeScript MCP server. Each test file mocks `TodoistClient` and verifies the handler calls the right method with the right arguments and returns well-formed MCP text content.

## Input files

### `src/tools/get-tasks.ts`
```typescript
import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const GetTasksSchema = z.object({
  project_id: z.string().optional(),
  label: z.string().optional(),
  filter: z.string().optional(),
});

export async function handleGetTasks(
  input: { project_id?: string; label?: string; filter?: string },
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const tasks = await client.getTasks(input);
  if (tasks.length === 0) {
    return { content: [{ type: "text", text: "No tasks found." }] };
  }
  const priorityMap: Record<number, string> = { 1: "P4", 2: "P3", 3: "P2", 4: "P1" };
  const taskLines: string[] = [];
  tasks.forEach((task, index) => {
    taskLines.push(`${index + 1}. [${priorityMap[task.priority] || "P4"}] ${task.content}`);
    if (task.due) taskLines.push(`  Due: ${task.due.date}`);
    if (task.labels?.length) taskLines.push(`  Labels: ${task.labels.join(", ")}`);
  });
  return { content: [{ type: "text", text: taskLines.join("\n") }] };
}
```

### `src/tools/create-task.ts`
```typescript
import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const CreateTaskSchema = z.object({
  content: z.string(),
  project_id: z.string().optional(),
  description: z.string().optional(),
  due_string: z.string().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  labels: z.array(z.string()).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export async function handleCreateTask(
  input: CreateTaskInput,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const task = await client.createTask(input);
  return { content: [{ type: "text", text: `Created task: ${task.content} (ID: ${task.id})` }] };
}
```

### `src/tools/update-task.ts`
```typescript
import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const UpdateTaskSchema = z.object({
  task_id: z.string(),
  content: z.string().optional(),
  description: z.string().optional(),
  due_string: z.string().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  labels: z.array(z.string()).optional(),
});

export async function handleUpdateTask(
  input: z.infer<typeof UpdateTaskSchema>,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const { task_id, ...params } = input;
  const result = await client.updateTask(task_id, params);
  return { content: [{ type: "text", text: `Updated task: ${result.content} (ID: ${result.id})` }] };
}
```

### `src/tools/complete-task.ts`
```typescript
import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const CompleteTaskSchema = z.object({ task_id: z.string() });

export async function handleCompleteTask(
  input: { task_id: string },
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  await client.closeTask(input.task_id);
  return { content: [{ type: "text", text: `Task ${input.task_id} marked as complete.` }] };
}
```

### `src/tools/delete-task.ts`
```typescript
import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const DeleteTaskSchema = z.object({ task_id: z.string() });

export async function handleDeleteTask(
  input: { task_id: string },
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  await client.deleteTask(input.task_id);
  return { content: [{ type: "text", text: `Task ${input.task_id} deleted.` }] };
}
```

## Your task

Create **5 test files**, one per tool. Each file mocks `TodoistClient` with `vi.fn()` stubs — do NOT mock the module, instantiate a partial mock object directly.

### Pattern to follow for each file

```typescript
import { describe, it, expect, vi } from "vitest";
import { handle<ToolName> } from "../../src/tools/<tool-file>.js";
import type { TodoistClient } from "../../src/todoist-client.js";

const mockClient = {
  <relevantMethod>: vi.fn(),
} as unknown as TodoistClient;
```

---

### `tests/tools/get-tasks.test.ts`

Tests for `handleGetTasks`:
- When `client.getTasks` resolves with an empty array → result text is `"No tasks found."`
- When `client.getTasks` resolves with one task (priority 4, no due, no labels) → result text is `"1. [P1] Buy milk"`
- When task has a due date → result includes `"  Due: 2026-04-15"` on the next line
- When task has labels → result includes `"  Labels: work, urgent"` on the next line
- `client.getTasks` is called with the input passed to the handler

---

### `tests/tools/create-task.test.ts`

Tests for `handleCreateTask`:
- `client.createTask` is called with the full input object
- Result text matches `"Created task: Buy milk (ID: 123)"`

---

### `tests/tools/update-task.test.ts`

Tests for `handleUpdateTask`:
- `client.updateTask` is called with `task_id` as first arg and the remaining fields as second arg (i.e. `task_id` is NOT in the params object)
- Result text matches `"Updated task: Buy milk (ID: 123)"`

---

### `tests/tools/complete-task.test.ts`

Tests for `handleCompleteTask`:
- `client.closeTask` is called with the `task_id` string
- Result text matches `"Task 123 marked as complete."`

---

### `tests/tools/delete-task.test.ts`

Tests for `handleDeleteTask`:
- `client.deleteTask` is called with the `task_id` string
- Result text matches `"Task 123 deleted."`

---

### Sample task fixture (reuse across files)
```typescript
const sampleTask = {
  id: "123",
  content: "Buy milk",
  description: "",
  project_id: "proj1",
  labels: [],
  priority: 4 as const,
  is_completed: false,
  created_at: "2026-04-14T00:00:00Z",
  url: "https://todoist.com/app/task/123",
};
```

## Constraints
- Use vitest (`import { describe, it, expect, vi } from "vitest"`)
- All relative imports must use `.js` extensions (ESM requirement)
- Do not import from `zod` in tests — you are testing the handler, not the schema
- Each file is self-contained (no shared test utilities)
- Tests must pass with `npx vitest run tests/tools/`

## Definition of done
- 5 files exist: `tests/tools/get-tasks.test.ts`, `create-task.test.ts`, `update-task.test.ts`, `complete-task.test.ts`, `delete-task.test.ts`
- `npx tsc --noEmit` passes
- `npx vitest run tests/tools/` passes with all tests green

## Output format
Respond with all 5 files. For each file, output a line with the filename followed by the file contents. No markdown fences — use this separator format:

```
=== tests/tools/get-tasks.test.ts ===
<file content>

=== tests/tools/create-task.test.ts ===
<file content>
```
(and so on for all 5 files)
