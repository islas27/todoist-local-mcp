import { describe, it, expect, vi } from "vitest";
import { handleCreateTask, CreateTaskSchema } from "../../src/tools/create-task.js";
import type { TodoistClient } from "../../src/todoist-client.js";
import type { TodoistTask } from "../../src/types.js";

function makeTask(overrides: Partial<TodoistTask> = {}): TodoistTask {
  return {
    id: "42",
    content: "Buy milk",
    description: "",
    project_id: "p1",
    labels: [],
    priority: 1,
    is_completed: false,
    created_at: "2024-01-01T00:00:00Z",
    url: "https://todoist.com/task/42",
    ...overrides,
  };
}

function makeClient(task: TodoistTask): TodoistClient {
  return {
    createTask: vi.fn().mockResolvedValue(task),
  } as unknown as TodoistClient;
}

describe("handleCreateTask", () => {
  it("creates a task with minimal input and returns confirmation", async () => {
    const task = makeTask({ id: "42", content: "Buy milk" });
    const client = makeClient(task);
    const result = await handleCreateTask({ content: "Buy milk" }, client);
    expect(client.createTask).toHaveBeenCalledWith({ content: "Buy milk" });
    expect(result.content[0].text).toBe("Created task: Buy milk (ID: 42)");
  });

  it("forwards all optional params to the client", async () => {
    const task = makeTask({ id: "99", content: "Full task" });
    const client = makeClient(task);
    const input = {
      content: "Full task",
      project_id: "p1",
      description: "desc",
      due_string: "tomorrow",
      priority: 3 as const,
      labels: ["work"],
    };
    await handleCreateTask(input, client);
    expect(client.createTask).toHaveBeenCalledWith(input);
  });

  it("response text includes created task content and ID", async () => {
    const task = makeTask({ id: "7", content: "Walk the dog" });
    const client = makeClient(task);
    const result = await handleCreateTask({ content: "Walk the dog" }, client);
    expect(result.content[0].text).toContain("Walk the dog");
    expect(result.content[0].text).toContain("ID: 7");
  });

  it("forwards section_id to client when provided", async () => {
    const task = makeTask({ id: "10", content: "Home Lab task" });
    const client = makeClient(task);
    await handleCreateTask({ content: "Home Lab task", section_id: "s42" }, client);
    expect(client.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ section_id: "s42" })
    );
  });
});

describe("CreateTaskSchema", () => {
  it("accepts content-only input", () => {
    expect(() => CreateTaskSchema.parse({ content: "Test" })).not.toThrow();
  });

  it("accepts full valid input", () => {
    expect(() =>
      CreateTaskSchema.parse({
        content: "Test",
        project_id: "p1",
        description: "desc",
        due_string: "tomorrow",
        priority: 1,
        labels: ["work"],
      })
    ).not.toThrow();
  });

  it("rejects input missing required content field", () => {
    expect(() => CreateTaskSchema.parse({})).toThrow();
  });

  it("rejects invalid priority value", () => {
    expect(() => CreateTaskSchema.parse({ content: "Test", priority: 5 })).toThrow();
  });
});
