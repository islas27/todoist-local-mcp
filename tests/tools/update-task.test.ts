import { describe, it, expect, vi } from "vitest";
import { handleUpdateTask, UpdateTaskSchema } from "../../src/tools/update-task.js";
import type { TodoistClient } from "../../src/todoist-client.js";
import type { TodoistTask } from "../../src/types.js";

function makeTask(overrides: Partial<TodoistTask> = {}): TodoistTask {
  return {
    id: "123",
    content: "Original content",
    description: "",
    project_id: "p1",
    labels: [],
    priority: 1,
    is_completed: false,
    created_at: "2024-01-01T00:00:00Z",
    url: "https://todoist.com/task/123",
    ...overrides,
  };
}

function makeClient(task: TodoistTask): TodoistClient {
  return {
    updateTask: vi.fn().mockResolvedValue(task),
  } as unknown as TodoistClient;
}

describe("handleUpdateTask", () => {
  it("calls updateTask with task_id stripped from params and returns summary", async () => {
    const task = makeTask({ id: "123", content: "New content" });
    const client = makeClient(task);
    const result = await handleUpdateTask({ task_id: "123", content: "New content" }, client);
    expect(client.updateTask).toHaveBeenCalledWith("123", { content: "New content" });
    expect(result.content[0].text).toBe("Updated task: New content (ID: 123)");
  });

  it("forwards due_string update to client", async () => {
    const task = makeTask({ id: "123" });
    const client = makeClient(task);
    await handleUpdateTask({ task_id: "123", due_string: "tomorrow" }, client);
    expect(client.updateTask).toHaveBeenCalledWith("123", { due_string: "tomorrow" });
  });

  it("calls client with empty update body when only task_id provided", async () => {
    const task = makeTask({ id: "123" });
    const client = makeClient(task);
    await handleUpdateTask({ task_id: "123" }, client);
    expect(client.updateTask).toHaveBeenCalledWith("123", {});
  });

  it("response text includes updated content and ID", async () => {
    const task = makeTask({ id: "55", content: "Updated task" });
    const client = makeClient(task);
    const result = await handleUpdateTask({ task_id: "55", content: "Updated task" }, client);
    expect(result.content[0].text).toContain("Updated task");
    expect(result.content[0].text).toContain("ID: 55");
  });

  it("forwards section_id to client when provided", async () => {
    const task = makeTask({ id: "123" });
    const client = makeClient(task);
    await handleUpdateTask({ task_id: "123", section_id: "s99" }, client);
    expect(client.updateTask).toHaveBeenCalledWith("123", { section_id: "s99" });
  });
});

describe("UpdateTaskSchema", () => {
  it("accepts task_id only", () => {
    expect(() => UpdateTaskSchema.parse({ task_id: "123" })).not.toThrow();
  });

  it("accepts task_id with update fields", () => {
    expect(() =>
      UpdateTaskSchema.parse({
        task_id: "123",
        content: "new",
        description: "desc",
        due_string: "tomorrow",
        priority: 2,
        labels: ["home"],
      })
    ).not.toThrow();
  });

  it("rejects input missing task_id", () => {
    expect(() => UpdateTaskSchema.parse({ content: "new" })).toThrow();
  });
});
