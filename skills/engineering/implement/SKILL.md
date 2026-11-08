---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

To load a named skill, use the Skill tool in Claude Code. In Codex, read its `SKILL.md` at the location in the installed skill catalog and follow it; read supporting files only when needed. Use the exact installed name when the catalog qualifies it with a plugin namespace.

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Load and follow `tdd` where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, load and follow `code-review` to review the work.

Commit your work to the current branch.
