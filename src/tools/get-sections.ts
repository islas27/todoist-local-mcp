import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const GetSectionsSchema = z.object({
  project_id: z.string().optional(),
});

export async function handleGetSections(
  input: z.infer<typeof GetSectionsSchema>,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const sections = await client.getSections(input.project_id);

  if (sections.length === 0) {
    return { content: [{ type: "text", text: "No sections found." }] };
  }

  const lines = sections.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.id})`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}
