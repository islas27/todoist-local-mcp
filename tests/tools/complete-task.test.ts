import { describe, it, expect, vi } from "vitest";
import { handleCompleteTask, CompleteTaskSchema } from "../../src/tools/complete-task.js";
import type { TodoistClient } from "../../src/todoist-client.js";

function makeClient(rejects?: Error): TodoistClient {
  const closeTask = rejects
    ? vi.fn().mockRejectedValue(rejects)
    : vi.fn().mockResolvedValue(undefined);
  return { closeTask } as unknown as TodoistClient;
}

describe("handleCompleteTask", () => {
  it("calls closeTask with the given task_id", async () => {
    const client = makeClient();
    await handleCompleteTask({ task_id: "123" }, client);
    expect(client.closeTask).toHaveBeenCalledWith("123");
  });

  it("returns confirmation message with task_id", async () => {
    const client = makeClient();
    const result = await handleCompleteTask({ task_id: "123" }, client);
    expect(result.content[0].text).toBe("Task 123 marked as complete.");
  });

  it("propagates errors thrown by the client", async () => {
    const client = makeClient(new Error("Not found"));
    await expect(handleCompleteTask({ task_id: "999" }, client)).rejects.toThrow("Not found");
  });
});

describe("CompleteTaskSchema", () => {
  it("accepts a valid task_id", () => {
    expect(() => CompleteTaskSchema.parse({ task_id: "abc" })).not.toThrow();
  });

  it("rejects input missing task_id", () => {
    expect(() => CompleteTaskSchema.parse({})).toThrow();
  });
});
