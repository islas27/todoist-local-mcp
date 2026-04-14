# Task Card 3.1 — MCP Server Entry Point

## Complexity rating
Medium — requires understanding MCP SDK wiring pattern, but logic is mechanical.

## Context
You are writing the entry point for `todoist-mcp`, a local TypeScript MCP server that exposes Todoist task management to Claude Desktop / Claude Code via stdio. All 5 tool files and the HTTP client already exist — this file just wires them together and starts the server.

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

export interface CreateTaskParams {
  content: string;
  project_id?: string;
  description?: string;
  due_string?: string;
  priority?: 1 | 2 | 3 | 4;
  labels?: string[];
}

export interface UpdateTaskParams {
  content?: string;
  description?: string;
  due_string?: string;
  priority?: 1 | 2 | 3 | 4;
  labels?: string[];
}
```

### `src/todoist-client.ts`
```typescript
import { randomUUID } from "node:crypto";
import type {
  TodoistTask,
  GetTasksParams,
  CreateTaskParams,
  UpdateTaskParams,
} from "./types.js";

const BASE_URL = "https://api.todoist.com/api/v1";

export class TodoistClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string
  ) {
    super(message);
    this.name = "TodoistClientError";
  }
}

export class TodoistClient {
  private readonly headers: Record<string, string>;

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    mutation = false
  ): Promise<T> {
    const headers: Record<string, string> = { ...this.headers };
    if (mutation) {
      headers["X-Request-Id"] = randomUUID();
    }
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      let errorBody: unknown;
      try { errorBody = await response.json(); }
      catch { errorBody = await response.text(); }
      throw new TodoistClientError(response.status, errorBody, `Todoist API error ${response.status}: ${path}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  getTasks(params?: GetTasksParams): Promise<TodoistTask[]> {
    const query = new URLSearchParams();
    if (params?.project_id) query.set("project_id", params.project_id);
    if (params?.label) query.set("label", params.label);
    if (params?.filter) query.set("filter", params.filter);
    const qs = query.toString();
    return this.request<TodoistTask[]>("GET", `/tasks${qs ? `?${qs}` : ""}`);
  }

  getTask(id: string): Promise<TodoistTask> {
    return this.request<TodoistTask>("GET", `/tasks/${id}`);
  }

  createTask(params: CreateTaskParams): Promise<TodoistTask> {
    return this.request<TodoistTask>("POST", "/tasks", params, true);
  }

  updateTask(id: string, params: UpdateTaskParams): Promise<TodoistTask> {
    return this.request<TodoistTask>("POST", `/tasks/${id}`, params, true);
  }

  closeTask(id: string): Promise<void> {
    return this.request<void>("POST", `/tasks/${id}/close`, undefined, true);
  }

  deleteTask(id: string): Promise<void> {
    return this.request<void>("DELETE", `/tasks/${id}`, undefined, true);
  }
}
```

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

### `package.json` (for version reference)
```json
{
  "name": "todoist-mcp",
  "version": "0.1.0",
  "type": "module"
}
```

## Your task

Create `src/index.ts` that:

1. Has a shebang on line 1: `#!/usr/bin/env node`
2. Reads `process.env.TODOIST_TOKEN` — if missing or empty, logs an error to `console.error` and calls `process.exit(1)`
3. Creates a `TodoistClient` instance with the token
4. Creates an `McpServer` instance:
   ```typescript
   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
   const server = new McpServer({ name: "todoist-mcp", version: "0.1.0" });
   ```
5. Registers all 5 tools using `server.tool(name, description, schema.shape, handler)`:
   - `"get_tasks"` — `"Get tasks from Todoist. Optionally filter by project_id, label, or filter string."` — `GetTasksSchema.shape` — `(input) => handleGetTasks(input, client)`
   - `"create_task"` — `"Create a new task in Todoist. Always confirm with the user before calling this tool."` — `CreateTaskSchema.shape` — `(input) => handleCreateTask(input, client)`
   - `"update_task"` — `"Update an existing Todoist task. Always confirm with the user before calling this tool."` — `UpdateTaskSchema.shape` — `(input) => handleUpdateTask(input, client)`
   - `"complete_task"` — `"Mark a Todoist task as complete. Always confirm with the user before calling this tool."` — `CompleteTaskSchema.shape` — `(input) => handleCompleteTask(input, client)`
   - `"delete_task"` — `"Delete a Todoist task permanently. Always confirm with the user before calling this tool."` — `DeleteTaskSchema.shape` — `(input) => handleDeleteTask(input, client)`
6. Connects via stdio transport:
   ```typescript
   import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
   const transport = new StdioServerTransport();
   await server.connect(transport);
   ```
7. All logging (startup, errors) uses `console.error` — never `console.log` (stdout is reserved for the MCP protocol)

## Constraints
- TypeScript strict mode, ES2022 target, Node16 module resolution
- All relative imports must use `.js` extensions (ESM requirement)
- No external dependencies beyond `@modelcontextprotocol/sdk` and the local files listed above

## Definition of done
- `npx tsc --noEmit` passes with zero errors
- File exists at `src/index.ts`

## Output format
Respond with only the contents of `src/index.ts`. No explanation, no markdown fences — just the raw TypeScript file content starting with the shebang line.
