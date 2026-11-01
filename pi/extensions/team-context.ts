import { readFileSync } from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const marker = "<pi-team-contract>";
const contract = readFileSync(new URL("../skills/team-context/SKILL.md", import.meta.url), "utf8")
  .replace(/^---\n[\s\S]*?\n---\n/, "").trim();

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", event => {
    if (event.systemPrompt.includes(marker)) return;
    return { systemPrompt: `${event.systemPrompt}\n\n${marker}\n${contract}\n</pi-team-contract>` };
  });
}
