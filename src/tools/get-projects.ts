import { z } from "zod";
import type { TodoistClient } from "../todoist-client.js";

export const GetProjectsSchema = z.object({});

export async function handleGetProjects(
  _input: z.infer<typeof GetProjectsSchema>,
  client: TodoistClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const projects = await client.getProjects();

  if (projects.length === 0) {
    return { content: [{ type: "text", text: "No projects found." }] };
  }

  const lines = projects.map((p, i) => {
    const markers: string[] = [];
    if (p.inbox_project) markers.push("[inbox]");
    if (p.is_favorite) markers.push("★");
    const suffix = markers.length > 0 ? ` ${markers.join(" ")}` : "";
    return `${i + 1}. ${p.name} (ID: ${p.id})${suffix}`;
  });

  return { content: [{ type: "text", text: lines.join("\n") }] };
}
