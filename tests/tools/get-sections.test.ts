import { describe, it, expect, vi } from "vitest";
import { handleGetSections, GetSectionsSchema } from "../../src/tools/get-sections.js";
import type { TodoistClient } from "../../src/todoist-client.js";
import type { TodoistSection } from "../../src/types.js";

function makeSection(overrides: Partial<TodoistSection> = {}): TodoistSection {
  return {
    id: "s1",
    name: "Uncategorized",
    project_id: "p1",
    section_order: 1,
    is_archived: false,
    is_deleted: false,
    ...overrides,
  };
}

function makeClient(sections: TodoistSection[] = []): TodoistClient {
  return {
    getSections: vi.fn().mockResolvedValue(sections),
  } as unknown as TodoistClient;
}

describe("handleGetSections", () => {
  it("returns 'No sections found.' when result is empty", async () => {
    const client = makeClient([]);
    const result = await handleGetSections({}, client);
    expect(result.content[0].text).toBe("No sections found.");
  });

  it("includes section name and ID in output", async () => {
    const client = makeClient([makeSection({ id: "s42", name: "Home Lab" })]);
    const result = await handleGetSections({}, client);
    expect(result.content[0].text).toContain("Home Lab (ID: s42)");
  });

  it("calls getSections with project_id when provided", async () => {
    const client = makeClient([]);
    await handleGetSections({ project_id: "p99" }, client);
    expect(client.getSections).toHaveBeenCalledWith("p99");
  });

  it("calls getSections without argument when project_id omitted", async () => {
    const client = makeClient([]);
    await handleGetSections({}, client);
    expect(client.getSections).toHaveBeenCalledWith(undefined);
  });

  it("numbers sections in order", async () => {
    const client = makeClient([
      makeSection({ id: "s1", name: "Grimoji" }),
      makeSection({ id: "s2", name: "Home Lab" }),
    ]);
    const result = await handleGetSections({}, client);
    const text = result.content[0].text;
    expect(text).toContain("1. Grimoji");
    expect(text).toContain("2. Home Lab");
  });
});

describe("GetSectionsSchema", () => {
  it("accepts empty input", () => {
    expect(() => GetSectionsSchema.parse({})).not.toThrow();
  });

  it("accepts project_id", () => {
    expect(() => GetSectionsSchema.parse({ project_id: "p1" })).not.toThrow();
  });
});
