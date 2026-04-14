import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const UpdateTaskSchema = z.object({
  task_id: z.string(),
  content: z.string().optional(),
  section_id: z.string().optional(),
  description: z.string().optional(),
  due_string: z.string().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  labels: z.array(z.string()).optional(),
});

export async function handleUpdateTask(
  input: z.infer<typeof UpdateTaskSchema>,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const { task_id, ...params } = input;
  const result = await client.updateTask(task_id, params);

  return {
    content: [
      {
        type: "text",
        text: `Updated task: ${result.content} (ID: ${result.id})`,
      },
    ],
  };
}
