#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TodoistClient } from "./todoist-client.js";
import { GetTasksSchema, handleGetTasks } from "./tools/get-tasks.js";
import { CreateTaskSchema, handleCreateTask } from "./tools/create-task.js";
import { UpdateTaskSchema, handleUpdateTask } from "./tools/update-task.js";
import { CompleteTaskSchema, handleCompleteTask } from "./tools/complete-task.js";
import { DeleteTaskSchema, handleDeleteTask } from "./tools/delete-task.js";
import { GetProjectsSchema, handleGetProjects } from "./tools/get-projects.js";
import { GetLabelsSchema, handleGetLabels } from "./tools/get-labels.js";
import { GetSectionsSchema, handleGetSections } from "./tools/get-sections.js";

const token = process.env.TODOIST_TOKEN;
if (!token) {
  console.error("Error: TODOIST_TOKEN environment variable is required.");
  process.exit(1);
}

const client = new TodoistClient(token);

const server = new McpServer({
  name: "todoist-mcp",
  version: "0.1.0",
});

server.tool(
  "get_tasks",
  "Retrieve tasks from Todoist, optionally filtered by project, label, or filter string.",
  GetTasksSchema.shape,
  async (input) => handleGetTasks(input, client)
);

server.tool(
  "create_task",
  "Create a new task in Todoist.",
  CreateTaskSchema.shape,
  async (input) => handleCreateTask(input, client)
);

server.tool(
  "update_task",
  "Update an existing Todoist task by ID.",
  UpdateTaskSchema.shape,
  async (input) => handleUpdateTask(input, client)
);

server.tool(
  "complete_task",
  "Mark a Todoist task as complete by ID.",
  CompleteTaskSchema.shape,
  async (input) => handleCompleteTask(input, client)
);

server.tool(
  "delete_task",
  "Delete a Todoist task by ID.",
  DeleteTaskSchema.shape,
  async (input) => handleDeleteTask(input, client)
);

server.tool(
  "get_projects",
  "List all Todoist projects with their IDs.",
  GetProjectsSchema.shape,
  async (input) => handleGetProjects(input, client)
);

server.tool(
  "get_labels",
  "List all personal Todoist labels.",
  GetLabelsSchema.shape,
  async (input) => handleGetLabels(input, client)
);

server.tool(
  "get_sections",
  "List sections within a Todoist project (board columns). Pass project_id to filter.",
  GetSectionsSchema.shape,
  async (input) => handleGetSections(input, client)
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("todoist-mcp server running on stdio");
