import { describe, it, expect, vi } from "vitest";
import { handleGetLabels, GetLabelsSchema } from "../../src/tools/get-labels.js";
import type { TodoistClient } from "../../src/todoist-client.js";
import type { TodoistLabel } from "../../src/types.js";

function makeLabel(overrides: Partial<TodoistLabel> = {}): TodoistLabel {
  return {
    id: "l1",
    name: "Home",
    color: "green",
    order: 1,
    is_favorite: false,
    ...overrides,
  };
}

function makeClient(labels: TodoistLabel[] = []): TodoistClient {
  return {
    getLabels: vi.fn().mockResolvedValue(labels),
  } as unknown as TodoistClient;
}

describe("handleGetLabels", () => {
  it("returns 'No labels found.' when result is empty", async () => {
    const client = makeClient([]);
    const result = await handleGetLabels({}, client);
    expect(result.content[0].text).toBe("No labels found.");
  });

  it("includes label name in output", async () => {
    const client = makeClient([makeLabel({ name: "Travel" })]);
    const result = await handleGetLabels({}, client);
    expect(result.content[0].text).toContain("Travel");
  });

  it("adds ★ marker when is_favorite is true", async () => {
    const client = makeClient([makeLabel({ name: "Study", is_favorite: true })]);
    const result = await handleGetLabels({}, client);
    expect(result.content[0].text).toContain("★");
  });

  it("omits ★ when is_favorite is false", async () => {
    const client = makeClient([makeLabel({ name: "Home", is_favorite: false })]);
    const result = await handleGetLabels({}, client);
    expect(result.content[0].text).not.toContain("★");
  });

  it("numbers labels in order", async () => {
    const client = makeClient([
      makeLabel({ name: "Home" }),
      makeLabel({ name: "Travel" }),
    ]);
    const result = await handleGetLabels({}, client);
    const text = result.content[0].text;
    expect(text).toContain("1. Home");
    expect(text).toContain("2. Travel");
  });
});

describe("GetLabelsSchema", () => {
  it("accepts empty input", () => {
    expect(() => GetLabelsSchema.parse({})).not.toThrow();
  });
});
