import { describe, it, expect, vi } from "vitest";
import { handleGetProjects, GetProjectsSchema } from "../../src/tools/get-projects.js";
import type { TodoistClient } from "../../src/todoist-client.js";
import type { TodoistProject } from "../../src/types.js";

function makeProject(overrides: Partial<TodoistProject> = {}): TodoistProject {
  return {
    id: "p1",
    name: "My Project",
    color: "blue",
    parent_id: null,
    inbox_project: false,
    is_favorite: false,
    ...overrides,
  };
}

function makeClient(projects: TodoistProject[] = []): TodoistClient {
  return {
    getProjects: vi.fn().mockResolvedValue(projects),
  } as unknown as TodoistClient;
}

describe("handleGetProjects", () => {
  it("returns 'No projects found.' when result is empty", async () => {
    const client = makeClient([]);
    const result = await handleGetProjects({}, client);
    expect(result.content[0].text).toBe("No projects found.");
  });

  it("includes project name and ID in output", async () => {
    const client = makeClient([makeProject({ id: "abc123", name: "Home" })]);
    const result = await handleGetProjects({}, client);
    expect(result.content[0].text).toContain("Home (ID: abc123)");
  });

  it("adds [inbox] marker when inbox_project is true", async () => {
    const client = makeClient([makeProject({ name: "Inbox", inbox_project: true })]);
    const result = await handleGetProjects({}, client);
    expect(result.content[0].text).toContain("[inbox]");
  });

  it("adds ★ marker when is_favorite is true", async () => {
    const client = makeClient([makeProject({ name: "Work", is_favorite: true })]);
    const result = await handleGetProjects({}, client);
    expect(result.content[0].text).toContain("★");
  });

  it("omits markers when neither inbox nor favorite", async () => {
    const client = makeClient([makeProject({ name: "Plain", inbox_project: false, is_favorite: false })]);
    const result = await handleGetProjects({}, client);
    const text = result.content[0].text;
    expect(text).not.toContain("[inbox]");
    expect(text).not.toContain("★");
  });

  it("numbers projects in order", async () => {
    const client = makeClient([
      makeProject({ id: "p1", name: "First" }),
      makeProject({ id: "p2", name: "Second" }),
    ]);
    const result = await handleGetProjects({}, client);
    const text = result.content[0].text;
    expect(text).toContain("1. First");
    expect(text).toContain("2. Second");
  });
});

describe("GetProjectsSchema", () => {
  it("accepts empty input", () => {
    expect(() => GetProjectsSchema.parse({})).not.toThrow();
  });
});
