# Task Card 5.1 — README

## Complexity rating
Low — documentation only, no code.

## Context
You are writing the README for `todoist-mcp`, a local MCP server that lets Claude Desktop and Claude Code manage Todoist tasks. It uses stdio transport (spawned as a child process), a personal API token, and the Todoist unified API v1.

## Project facts

| Item | Value |
|---|---|
| Package name | `todoist-mcp` |
| Node minimum | 18+ |
| Transport | stdio (spawned by Claude) |
| Auth | Personal token via `TODOIST_TOKEN` env var |
| Todoist API | v1 (`https://api.todoist.com/api/v1/`) |
| Build output | `build/index.js` |
| Build command | `npm run build` |
| Test command | `npm test` |

## Available tools

| Tool | Description |
|---|---|
| `get_tasks` | List tasks, optionally filtered by `project_id`, `label`, or Todoist filter string |
| `create_task` | Create a new task (content required; project, due date, priority, labels optional) |
| `update_task` | Update an existing task by ID |
| `complete_task` | Mark a task as complete by ID |
| `delete_task` | Permanently delete a task by ID |

## Your task

Write `README.md` with the following sections (in this order):

1. **Title + one-sentence description**

2. **Prerequisites**
   - Node.js 18+
   - A Todoist account with an API token (Settings → Integrations → Developer)

3. **Setup**
   ```bash
   git clone <repo>
   cd todoist-mcp
   npm install
   cp .env.example .env
   # Edit .env and add your TODOIST_TOKEN
   npm run build
   ```

4. **Claude Desktop configuration**
   Explain that the user adds this to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):
   ```json
   {
     "mcpServers": {
       "todoist": {
         "command": "node",
         "args": ["/absolute/path/to/todoist-mcp/build/index.js"],
         "env": {
           "TODOIST_TOKEN": "your_token_here"
         }
       }
     }
   }
   ```
   Note: replace `/absolute/path/to/todoist-mcp` with the actual path on disk.

5. **Claude Code configuration**
   Explain that the user runs this from within the project directory:
   ```bash
   claude mcp add todoist node build/index.js
   ```
   Then sets the token:
   ```bash
   export TODOIST_TOKEN=your_token_here
   ```
   Or adds it to `~/.zshrc` / `~/.bashrc` for persistence.

6. **Available tools** — table from the facts section above

7. **Development**
   ```bash
   npm run build    # compile TypeScript
   npm test         # run vitest suite
   npx tsc --noEmit # type check only
   ```
   Smoke test with the MCP Inspector:
   ```bash
   npx @modelcontextprotocol/inspector node build/index.js
   ```

8. **Security note** — one short paragraph: the TODOIST_TOKEN grants full account access; never commit it to source control; `.env` is gitignored.

## Constraints
- Plain GitHub-flavored Markdown
- No emojis
- Keep it concise — this is a personal tool README, not marketing copy
- Do not invent features or capabilities not listed above

## Definition of done
- File exists at `README.md`
- Human review (no automated check)

## Output format
Respond with only the contents of `README.md`. No explanation — just the raw Markdown content.
