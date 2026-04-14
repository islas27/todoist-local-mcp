# todoist-mcp

A local MCP (Model Context Protocol) server that exposes Todoist task management to Claude Desktop and Claude Code via five tools.

## Prerequisites

- Node.js 18+
- A Todoist account with a personal API token ([get one here](https://app.todoist.com/app/settings/integrations/developer))

## Setup

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd todoist-mcp
npm install

# 2. Create your .env file
cp .env.example .env

# 3. Add your Todoist API token to .env
#    TODOIST_TOKEN=your_token_here
```

## Build

```bash
npm run build
```

The compiled server lands in `build/index.js`.

## Available Tools

| Tool | Description |
|---|---|
| `get_tasks` | List tasks, optionally filtered by `project_id`, `label`, or a Todoist `filter` expression |
| `create_task` | Create a new task with content, optional due date, priority (1–4), labels, and project |
| `update_task` | Update an existing task's content, due date, priority, or labels by task ID |
| `complete_task` | Mark a task as complete by task ID |
| `delete_task` | Delete a task permanently by task ID |

Priority values follow Todoist's convention: `1` = normal (P4), `2` = medium (P3), `3` = high (P2), `4` = urgent (P1).

## Claude Desktop Configuration

Add the following to `~/.config/claude/claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

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

Replace `/absolute/path/to/todoist-mcp` with the actual path on your machine.

## Claude Code Configuration

Add to your project or global `settings.json` (via `claude config`):

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

Or run inline:

```bash
claude --mcp-server "todoist:node /absolute/path/to/todoist-mcp/build/index.js" \
  --env TODOIST_TOKEN=your_token_here
```

## Running Tests

```bash
npm test
```

Integration tests require `TODOIST_TOKEN` to be set and use a dedicated test project (`6gP77C6vM2cRm2rg`).

## Development

```bash
# Type check without building
npx tsc --noEmit

# Inspect the server interactively
npx @modelcontextprotocol/inspector node build/index.js
```
