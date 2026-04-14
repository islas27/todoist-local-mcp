import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const GetLabelsSchema = z.object({});

export async function handleGetLabels(
  _input: z.infer<typeof GetLabelsSchema>,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const labels = await client.getLabels();

  if (labels.length === 0) {
    return { content: [{ type: "text", text: "No labels found." }] };
  }

  const lines = labels.map((l, i) => {
    const suffix = l.is_favorite ? " ★" : "";
    return `${i + 1}. ${l.name}${suffix}`;
  });

  return { content: [{ type: "text", text: lines.join("\n") }] };
}
