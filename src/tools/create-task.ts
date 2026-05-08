import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const CreateTaskSchema = z.object({
  content: z.string(),
  project_id: z.string().optional(),
  section_id: z.string().optional(),
  parent_id: z.string().optional().describe(
    "ID of the parent task. Set this to create a subtask under an existing task."
  ),
  description: z.string().optional(),
  due_string: z.string().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional().describe(
    "Task priority. Scale is inverted from typical convention: 4 = P1 (critical/red), 3 = P2 (orange), 2 = P3 (blue), 1 = P4 (lowest/no flag)."
  ),
  labels: z.array(z.string()).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export async function handleCreateTask(
  input: CreateTaskInput,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const task = await client.createTask(input);
  return {
    content: [
      {
        type: "text",
        text: `Created task: ${task.content} (ID: ${task.id})`,
      },
    ],
  };
}
