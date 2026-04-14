import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const DeleteTaskSchema = z.object({
  task_id: z.string(),
});

export async function handleDeleteTask(
  input: { task_id: string },
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  await client.deleteTask(input.task_id);

  return {
    content: [
      {
        type: "text",
        text: `Task ${input.task_id} deleted.`,
      },
    ],
  };
}
