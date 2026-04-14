# Task Card 4.1 — Todoist Client Unit Tests

## Complexity rating
Medium — requires knowledge of vitest mocking patterns and HTTP testing.

## Context
You are writing unit tests for `TodoistClient`, the HTTP wrapper in a local TypeScript MCP server that talks to the Todoist API v1. Tests mock `global.fetch` — no real network calls are made.

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

## Your task

Create `tests/todoist-client.test.ts` using vitest. Cover the following:

### Helper to mock fetch
Write a helper `mockFetch(status, body)` that sets `global.fetch` to a `vi.fn()` returning a Response-like object. Use `beforeEach` / `afterEach` to restore the original fetch.

### Test cases required

**getTasks**
- Calls `GET https://api.todoist.com/api/v1/tasks` with `Authorization: Bearer test-token`
- When `project_id` is provided, appends `?project_id=abc` to the URL
- Returns parsed JSON array

**getTask**
- Calls `GET .../tasks/123`
- Returns the parsed task object

**createTask**
- Calls `POST .../tasks` with `Content-Type: application/json` and JSON body
- Sends an `X-Request-Id` header (value must be a non-empty string)
- Returns the created task

**updateTask**
- Calls `POST .../tasks/123` with JSON body
- Sends an `X-Request-Id` header

**closeTask**
- Calls `POST .../tasks/123/close`
- Sends an `X-Request-Id` header
- Returns `undefined` (204 response)

**deleteTask**
- Calls `DELETE .../tasks/123`
- Sends an `X-Request-Id` header
- Returns `undefined` (204 response)

**Error handling**
- A 401 response throws `TodoistClientError` with `status === 401`
- A 404 response throws `TodoistClientError` with `status === 404`
- A 500 response throws `TodoistClientError` with `status === 500`

### Sample task fixture (use this in tests)
```typescript
const sampleTask: TodoistTask = {
  id: "123",
  content: "Buy milk",
  description: "",
  project_id: "proj1",
  labels: [],
  priority: 1,
  is_completed: false,
  created_at: "2026-04-14T00:00:00Z",
  url: "https://todoist.com/app/task/123",
};
```

## Constraints
- Use vitest (`import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"`)
- Import from `"../src/todoist-client.js"` and `"../src/types.js"`
- All relative imports must use `.js` extensions (ESM requirement)
- Mock only `global.fetch` — do not mock the module itself
- Tests must pass with `npx vitest run tests/todoist-client.test.ts`

## Definition of done
- File exists at `tests/todoist-client.test.ts`
- `npx tsc --noEmit` passes
- `npx vitest run tests/todoist-client.test.ts` passes with all tests green

## Output format
Respond with only the contents of `tests/todoist-client.test.ts`. No explanation, no markdown fences — just the raw TypeScript file content.
