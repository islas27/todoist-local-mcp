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
      const text = await response.text();
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = text;
      }
      throw new TodoistClientError(
        response.status,
        errorBody,
        `Todoist API error ${response.status}: ${path}`
      );
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async getTasks(params?: GetTasksParams): Promise<TodoistTask[]> {
    const query = new URLSearchParams();
    if (params?.project_id) query.set("project_id", params.project_id);
    if (params?.label) query.set("label", params.label);
    if (params?.filter) query.set("filter", params.filter);
    const qs = query.toString();
    const response = await this.request<{ results: TodoistTask[] }>(
      "GET",
      `/tasks${qs ? `?${qs}` : ""}`
    );
    return response.results;
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
