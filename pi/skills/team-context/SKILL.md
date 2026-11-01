---
name: team-context
description: Shared task contracts, evidence and permission boundaries for the Pi engineering team. Read when coordinating its planner, implementer, reviewers or integrator.
---

The main session owns the user's objective and acceptance. Each child owns one bounded assignment. Start with fresh conversation context; pass the spec, ticket, relevant paths, current commit and expected output as pointers or a concise brief.

Before delegating, name the task, allowed writes, checkout and expected evidence. Use nested delegation for distinct subtasks, not to relay the same workflow to another agent. Respect the configured depth and role allowlists.

A terminal success needs the expected result and completed checks. Queued, accepted, running, stopped, steered, failed, unavailable and empty results are not success. Collect every child in a batch, including failures, before reporting or starting dependent work. Preserve successful sibling branches when another child fails.

Project instructions, Ponytail and permission extensions remain authoritative. Tool allowlists are not an OS sandbox. Never set isolated=true or disable extensions to evade sandbox/automode. If required guards cannot load, stop before writing. Concurrent source writers need separate worktrees or explicitly disjoint ownership. The integrator alone writes the shared integration checkout.

Reading a skill means using Pi's read tool on SKILL.md and only the references needed. Skill text is not authorization to publish, push, close tickets, alter credentials or discard user changes. Ask only for missing authorization or decisions that block the next concrete step.

For every handoff return status, changed files or findings, checks actually completed and unresolved issues. A skipped check remains skipped. On failure include the branch/worktree state and retained artifacts. Never add AI attribution to commits.
