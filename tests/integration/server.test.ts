import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, execSync, ChildProcessWithoutNullStreams } from "node:child_process";
import * as path from "node:path";
import * as readline from "node:readline";

const ROOT = path.resolve(import.meta.dirname, "../..");

function sendMessage(proc: ChildProcessWithoutNullStreams, message: unknown): void {
  proc.stdin.write(JSON.stringify(message) + "\n");
}

function readMessage(proc: ChildProcessWithoutNullStreams): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity });
    const onLine = (line: string) => {
      rl.close();
      try {
        resolve(JSON.parse(line));
      } catch (e) {
        reject(new Error(`Failed to parse JSON: ${line}`));
      }
    };
    const onError = (err: Error) => {
      rl.close();
      reject(err);
    };
    rl.once("line", onLine);
    rl.once("error", onError);
  });
}

describe("MCP server integration", { timeout: 15000 }, () => {
  let proc: ChildProcessWithoutNullStreams;

  beforeAll(() => {
    execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
    proc = spawn("node", ["build/index.js"], {
      cwd: ROOT,
      env: { ...process.env, TODOIST_TOKEN: "test-token" },
    }) as ChildProcessWithoutNullStreams;
  });

  afterAll(() => {
    proc.kill();
  });

  it("Test 1: initialize handshake", async () => {
    sendMessage(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0" },
      },
    });

    const response = (await readMessage(proc)) as {
      jsonrpc: string;
      id: number;
      result: { protocolVersion: string; serverInfo: { name: string } };
    };

    expect(response.result.serverInfo.name).toBe("todoist-mcp");
    expect(response.result.protocolVersion).toBeTruthy();

    // Send initialized notification (no response expected)
    sendMessage(proc, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    });
  });

  it("Test 2: tools/list returns 5 tools", async () => {
    sendMessage(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    const response = (await readMessage(proc)) as {
      result: { tools: Array<{ name: string }> };
    };

    const tools = response.result.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(8);

    const names = tools.map((t) => t.name);
    expect(names).toContain("get_tasks");
    expect(names).toContain("create_task");
    expect(names).toContain("update_task");
    expect(names).toContain("complete_task");
    expect(names).toContain("delete_task");
    expect(names).toContain("get_projects");
    expect(names).toContain("get_labels");
    expect(names).toContain("get_sections");
  });

  it("Test 4: missing token exits with code 1", async () => {
    const { TODOIST_TOKEN: _removed, ...envWithoutToken } = process.env as Record<string, string>;

    const noTokenProc = spawn("node", ["build/index.js"], {
      cwd: ROOT,
      env: envWithoutToken,
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      noTokenProc.on("close", (code) => resolve(code));
      setTimeout(() => {
        noTokenProc.kill();
        resolve(null);
      }, 2000);
    });

    expect(exitCode).toBe(1);
  });
});
