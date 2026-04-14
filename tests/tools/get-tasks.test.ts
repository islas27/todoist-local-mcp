import { describe, it, expect, vi } from "vitest";
import { handleGetTasks, GetTasksSchema } from "../../src/tools/get-tasks.js";
import type { TodoistClient } from "../../src/todoist-client.js";
import type { TodoistTask } from "../../src/types.js";

function makeTask(overrides: Partial<TodoistTask> = {}): TodoistTask {
  return {
    id: "1",
    content: "Default task",
    description: "",
    project_id: "p1",
    labels: [],
    priority: 1,
    is_completed: false,
    created_at: "2024-01-01T00:00:00Z",
    url: "https://todoist.com/task/1",
    ...overrides,
  };
}

function makeClient(tasks: TodoistTask[] = []): TodoistClient {
  return {
    getTasks: vi.fn().mockResolvedValue(tasks),
  } as unknown as TodoistClient;
}

describe("handleGetTasks", () => {
  it("calls getTasks with no filters when no params provided", async () => {
    const client = makeClient([]);
    await handleGetTasks({}, client);
    expect(client.getTasks).toHaveBeenCalledWith({});
  });

  it("passes project_id to client", async () => {
    const client = makeClient([]);
    await handleGetTasks({ project_id: "p123" }, client);
    expect(client.getTasks).toHaveBeenCalledWith({ project_id: "p123" });
  });

  it("returns 'No tasks found.' when result is empty", async () => {
    const client = makeClient([]);
    const result = await handleGetTasks({}, client);
    expect(result.content[0].text).toBe("No tasks found.");
  });

  it("formats tasks into a numbered list with priority", async () => {
    const client = makeClient([
      makeTask({ id: "1", content: "Buy milk", priority: 4 }),
      makeTask({ id: "2", content: "Write tests", priority: 2 }),
    ]);
    const result = await handleGetTasks({}, client);
    const text = result.content[0].text;
    expect(text).toContain("1. [P1] Buy milk");
    expect(text).toContain("2. [P3] Write tests");
  });

  it("includes due date in output when present", async () => {
    const client = makeClient([
      makeTask({
        due: { date: "2024-12-31", string: "Dec 31", is_recurring: false },
      }),
    ]);
    const result = await handleGetTasks({}, client);
    expect(result.content[0].text).toContain("Due: 2024-12-31");
  });

  it("omits due date field when task has no due date", async () => {
    const client = makeClient([makeTask({ due: undefined })]);
    const result = await handleGetTasks({}, client);
    expect(result.content[0].text).not.toContain("Due:");
  });

  it("includes labels in output when present", async () => {
    const client = makeClient([makeTask({ labels: ["work", "urgent"] })]);
    const result = await handleGetTasks({}, client);
    expect(result.content[0].text).toContain("Labels: work, urgent");
  });
});

describe("GetTasksSchema", () => {
  it("accepts empty input", () => {
    expect(() => GetTasksSchema.parse({})).not.toThrow();
  });

  it("accepts all optional fields", () => {
    expect(() =>
      GetTasksSchema.parse({ project_id: "p1", label: "work", filter: "today" })
    ).not.toThrow();
  });
});
