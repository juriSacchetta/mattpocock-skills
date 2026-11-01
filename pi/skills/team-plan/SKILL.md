---
name: team-plan
description: Clarify an engineering change and prepare its specification, acceptance checks and dependent tickets with the Pi team.
disable-model-invocation: true
---

Read ../team-context/SKILL.md. Adapted from Matt Pocock's grill-with-docs, domain-modeling, to-spec and to-tickets workflows.

Inspect existing project docs, issue tracker instructions and current code before asking questions. Delegate bounded code lookups to explorer and external facts to researcher, with fresh context. Use planner to identify missing decisions, candidate acceptance criteria and ticket boundaries. The main session asks the user only questions it cannot resolve from available evidence.

Write the agreed spec where the project keeps such docs. Record newly agreed domain terms in its glossary and material architectural tradeoffs in its ADR convention. Do not create documentation that adds no useful decision or vocabulary.

Produce tickets as vertical behavior slices. Each needs id, task, acceptance checks and dependsOn ids. Validate unique ids, existing dependencies and an acyclic graph. Identify shared files and runtime/setup requirements. Keep tickets locally unless the user requested remote issue creation; use an existing configured tracker when authorized.

Hand off the spec path, tickets and validation command. For a single bounded change use team-build's change mode; for a dependent ticket graph use its spec mode. Do not start implementation while requirements or authorization remain unresolved.
