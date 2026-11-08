---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Use the harness's subagent tool (Claude Code: Agent or Task; Codex: `spawn_agent`). In Codex, set `fork_turns: "none"` when exposed, or use the documented fresh-context equivalent. Pass the task, working directory, input and skill paths explicitly: a fresh worker does not inherit this conversation. Schedule within available worker capacity, collect terminal results before declaring completion, and release finished workers when the harness supports it. If subagents are unavailable, report that limitation rather than claiming delegation occurred.

Spin up a **background agent** to do the research, so you keep working while it reads. Start it with a fresh context window.

If this skill was loaded inside an already assigned research worker, do the research there instead of dispatching another worker. Save the full findings in the file and return its path, completion status, and a short summary.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
