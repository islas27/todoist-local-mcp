import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const GetTasksSchema = z.object({
  project_id: z.string().optional(),
  label: z.string().optional(),
  filter: z.string().optional(),
});

export async function handleGetTasks(
  input: { project_id?: string; label?: string; filter?: string },
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const tasks = await client.getTasks(input);

  if (tasks.length === 0) {
    return {
      content: [{ type: "text", text: "No tasks found." }],
    };
  }

  const priorityMap: Record<number, string> = {
    1: "P4",
    2: "P3",
    3: "P2",
    4: "P1",
  };

  const taskLines: string[] = [];

  tasks.forEach((task, index) => {
    const taskNumber = index + 1;
    const priority = priorityMap[task.priority] || "P4";
    const firstLine = `${taskNumber}. [${priority}] ${task.content} (id: ${task.id})`;
    taskLines.push(firstLine);

    if (task.due) {
      taskLines.push(`  Due: ${task.due.date}`);
    }

    if (task.labels && task.labels.length > 0) {
      taskLines.push(`  Labels: ${task.labels.join(", ")}`);
    }
  });

  const text = taskLines.join("\n");

  return {
    content: [{ type: "text", text }],
  };
}
