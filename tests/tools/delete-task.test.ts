import { describe, it, expect, vi } from "vitest";
import { handleDeleteTask, DeleteTaskSchema } from "../../src/tools/delete-task.js";
import type { TodoistClient } from "../../src/todoist-client.js";

function makeClient(rejects?: Error): TodoistClient {
  const deleteTask = rejects
    ? vi.fn().mockRejectedValue(rejects)
    : vi.fn().mockResolvedValue(undefined);
  return { deleteTask } as unknown as TodoistClient;
}

describe("handleDeleteTask", () => {
  it("calls deleteTask with the given task_id", async () => {
    const client = makeClient();
    await handleDeleteTask({ task_id: "123" }, client);
    expect(client.deleteTask).toHaveBeenCalledWith("123");
  });

  it("returns confirmation message with task_id", async () => {
    const client = makeClient();
    const result = await handleDeleteTask({ task_id: "123" }, client);
    expect(result.content[0].text).toBe("Task 123 deleted.");
  });

  it("propagates errors thrown by the client", async () => {
    const client = makeClient(new Error("Not found"));
    await expect(handleDeleteTask({ task_id: "999" }, client)).rejects.toThrow("Not found");
  });
});

describe("DeleteTaskSchema", () => {
  it("accepts a valid task_id", () => {
    expect(() => DeleteTaskSchema.parse({ task_id: "abc" })).not.toThrow();
  });

  it("rejects input missing task_id", () => {
    expect(() => DeleteTaskSchema.parse({})).toThrow();
  });
});
