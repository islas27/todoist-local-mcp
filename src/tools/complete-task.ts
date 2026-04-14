import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const CompleteTaskSchema = z.object({
  task_id: z.string(),
});

export async function handleCompleteTask(
  input: { task_id: string },
  client: TodoistClient,
): Promise<{ content: { type: "text"; text: string }[] }> {
  await client.closeTask(input.task_id);
  return {
    content: [
      {
        type: "text",
        text: `Task ${input.task_id} marked as complete.`,
      },
    ],
  };
}
