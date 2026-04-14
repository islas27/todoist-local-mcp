import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TodoistClient, TodoistClientError } from "../src/todoist-client.js";

const BASE_URL = "https://api.todoist.com/api/v1";
const TOKEN = "test-token-abc";

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function errResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function htmlError(status: number): Response {
  return new Response("<html>Internal Server Error</html>", {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

const mockFetch = vi.fn();

describe("TodoistClient", () => {
  let client: TodoistClient;

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
    client = new TodoistClient(TOKEN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── 1.1 Authentication ──────────────────────────────────────────────────

  describe("Authentication", () => {
    it("sends Bearer token on every request", async () => {
      mockFetch.mockResolvedValue(ok([]));
      await client.getTasks();
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
    });

    it("different client instances send their own token", async () => {
      const client2 = new TodoistClient("other-token");
      mockFetch.mockResolvedValue(ok([]));
      await client2.getTasks();
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer other-token");
    });
  });

  // ── 1.2 getTasks ────────────────────────────────────────────────────────

  describe("getTasks", () => {
    it("fetches all tasks with no query params when called bare", async () => {
      mockFetch.mockResolvedValue(ok([]));
      await client.getTasks();
      expect(mockFetch.mock.calls[0][0]).toBe(`${BASE_URL}/tasks`);
    });

    it("adds project_id to query string", async () => {
      mockFetch.mockResolvedValue(ok([]));
      await client.getTasks({ project_id: "abc" });
      expect(mockFetch.mock.calls[0][0]).toContain("project_id=abc");
    });

    it("adds label to query string", async () => {
      mockFetch.mockResolvedValue(ok([]));
      await client.getTasks({ label: "work" });
      expect(mockFetch.mock.calls[0][0]).toContain("label=work");
    });

    it("adds filter to query string", async () => {
      mockFetch.mockResolvedValue(ok([]));
      await client.getTasks({ filter: "today" });
      expect(mockFetch.mock.calls[0][0]).toContain("filter=today");
    });

    it("returns parsed TodoistTask array", async () => {
      const tasks = [{ id: "1", content: "Buy milk" }];
      mockFetch.mockResolvedValue(ok(tasks));
      const result = await client.getTasks();
      expect(result).toEqual(tasks);
    });

    it("returns empty array without error", async () => {
      mockFetch.mockResolvedValue(ok([]));
      const result = await client.getTasks();
      expect(result).toEqual([]);
    });
  });

  // ── 1.3 getTask ─────────────────────────────────────────────────────────

  describe("getTask", () => {
    it("GETs /tasks/:id", async () => {
      const task = { id: "123", content: "Test" };
      mockFetch.mockResolvedValue(ok(task));
      await client.getTask("123");
      expect(mockFetch.mock.calls[0][0]).toBe(`${BASE_URL}/tasks/123`);
    });

    it("returns the task object", async () => {
      const task = { id: "123", content: "Test" };
      mockFetch.mockResolvedValue(ok(task));
      const result = await client.getTask("123");
      expect(result).toEqual(task);
    });

    it("throws TodoistClientError with status 404 when task missing", async () => {
      mockFetch.mockResolvedValue(errResponse(404, { error: "Not found" }));
      const err = await client.getTask("999").catch((e) => e);
      expect(err).toBeInstanceOf(TodoistClientError);
      expect(err.status).toBe(404);
    });
  });

  // ── 1.4 createTask ──────────────────────────────────────────────────────

  describe("createTask", () => {
    it("POSTs to /tasks with content in body", async () => {
      const task = { id: "1", content: "Buy milk" };
      mockFetch.mockResolvedValue(ok(task));
      await client.createTask({ content: "Buy milk" });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tasks`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toMatchObject({ content: "Buy milk" });
    });

    it("forwards all optional params in the body", async () => {
      mockFetch.mockResolvedValue(ok({ id: "1", content: "Buy milk" }));
      const params = {
        content: "Buy milk",
        project_id: "p1",
        description: "desc",
        due_string: "tomorrow",
        priority: 2 as const,
        labels: ["work"],
      };
      await client.createTask(params);
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject(params);
    });

    it("includes X-Request-Id header as a UUID", async () => {
      mockFetch.mockResolvedValue(ok({ id: "1", content: "test" }));
      await client.createTask({ content: "test" });
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers["X-Request-Id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("returns the created task", async () => {
      const task = { id: "42", content: "Buy milk" };
      mockFetch.mockResolvedValue(ok(task));
      const result = await client.createTask({ content: "Buy milk" });
      expect(result).toEqual(task);
    });
  });

  // ── 1.5 updateTask ──────────────────────────────────────────────────────

  describe("updateTask", () => {
    it("POSTs to /tasks/:id with updated content", async () => {
      const task = { id: "123", content: "new content" };
      mockFetch.mockResolvedValue(ok(task));
      await client.updateTask("123", { content: "new content" });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tasks/123`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toMatchObject({ content: "new content" });
    });

    it("sends due_string in the request body", async () => {
      mockFetch.mockResolvedValue(ok({ id: "123", content: "task" }));
      await client.updateTask("123", { due_string: "tomorrow" });
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
        due_string: "tomorrow",
      });
    });

    it("includes X-Request-Id header as a UUID", async () => {
      mockFetch.mockResolvedValue(ok({ id: "123", content: "task" }));
      await client.updateTask("123", { content: "test" });
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers["X-Request-Id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("throws 404 for a nonexistent task", async () => {
      mockFetch.mockResolvedValue(errResponse(404, { error: "Not found" }));
      const err = await client.updateTask("999", { content: "x" }).catch((e) => e);
      expect(err).toBeInstanceOf(TodoistClientError);
      expect(err.status).toBe(404);
    });
  });

  // ── 1.6 closeTask ───────────────────────────────────────────────────────

  describe("closeTask", () => {
    it("POSTs to /tasks/:id/close", async () => {
      mockFetch.mockResolvedValue(noContent());
      await client.closeTask("123");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tasks/123/close`);
      expect(init.method).toBe("POST");
    });

    it("resolves to undefined on 204", async () => {
      mockFetch.mockResolvedValue(noContent());
      await expect(client.closeTask("123")).resolves.toBeUndefined();
    });

    it("throws 404 for a nonexistent task", async () => {
      mockFetch.mockResolvedValue(errResponse(404, { error: "Not found" }));
      const err = await client.closeTask("999").catch((e) => e);
      expect(err).toBeInstanceOf(TodoistClientError);
      expect(err.status).toBe(404);
    });
  });

  // ── 1.7 deleteTask ──────────────────────────────────────────────────────

  describe("deleteTask", () => {
    it("sends DELETE to /tasks/:id", async () => {
      mockFetch.mockResolvedValue(noContent());
      await client.deleteTask("123");
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tasks/123`);
      expect(init.method).toBe("DELETE");
    });

    it("resolves to undefined on 204", async () => {
      mockFetch.mockResolvedValue(noContent());
      await expect(client.deleteTask("123")).resolves.toBeUndefined();
    });

    it("throws 404 for a nonexistent task", async () => {
      mockFetch.mockResolvedValue(errResponse(404, { error: "Not found" }));
      const err = await client.deleteTask("999").catch((e) => e);
      expect(err).toBeInstanceOf(TodoistClientError);
      expect(err.status).toBe(404);
    });
  });

  // ── 1.8 Error handling ──────────────────────────────────────────────────

  describe("Error handling", () => {
    it("throws TodoistClientError with status 401 for bad token", async () => {
      mockFetch.mockResolvedValue(errResponse(401, { error: "Unauthorized" }));
      const err = await client.getTasks().catch((e) => e);
      expect(err).toBeInstanceOf(TodoistClientError);
      expect(err.status).toBe(401);
    });

    it("throws with status 500 on server error", async () => {
      mockFetch.mockResolvedValue(errResponse(500, { error: "Internal server error" }));
      const err = await client.getTasks().catch((e) => e);
      expect(err).toBeInstanceOf(TodoistClientError);
      expect(err.status).toBe(500);
    });

    it("propagates network failures from fetch rejection", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));
      await expect(client.getTasks()).rejects.toThrow("Network failure");
    });

    it("handles non-JSON error body without crashing", async () => {
      mockFetch.mockResolvedValue(htmlError(503));
      const err = await client.getTasks().catch((e) => e);
      expect(err).toBeInstanceOf(TodoistClientError);
      expect(err.status).toBe(503);
    });
  });
});
