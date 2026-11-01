---
name: team-research
description: Delegate a bounded primary-source investigation and return a cited brief, optionally saved by the main session.
---

Read ../team-context/SKILL.md. Adapted from Matt Pocock's research workflow.

If already executing a delegated research assignment, do the reading directly. Do not spawn another researcher or re-invoke this workflow for the same question.

Otherwise call Agent with subagent_type researcher, a fresh context and a specific question, expected sources and output. Let it run in the background while the main session continues independent work. Collect its terminal result and inspect citations. Missing sources or a failed/stopped child mean incomplete research, not an answer.

The researcher has no project write tools. The main session writes the cited brief only when the user requested a saved artifact, following the project's location convention. Preserve the date and uncertainty of time-sensitive findings.
