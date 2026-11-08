---
name: implement-spec
description: "Implement the result of /to-spec and /to-tickets in code."
disable-model-invocation: true
---

You have been provided a spec. This spec should have tickets associated with it, describing how to implement the spec.

The issue tracker should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`.

The goal is the entire spec implemented on a single **integration branch**, with every ticket resolved the way the issue tracker closes work.

The tickets are not a list of steps. They are a **task graph** with blocking relationships between them. This means there is always a **frontier** of tickets which are ready to be grabbed.

## Coordinator and harness

The coordinator owns scheduling, the integration branch, and the completion ledger. Delegate code exploration, implementation, merge conflict resolution, test output inspection, and review to subagents. Keep diffs, full ticket bodies, source files, and command logs in their contexts or in files; return only the result and a pointer to the evidence.

Start every subagent with a fresh context window:

- **Claude Code:** use its subagent tool (Agent or Task, as exposed), in the background where supported. Give each implementer an isolated worktree.
- **Codex:** use `spawn_agent` with `fork_turns: "none"` when that parameter is exposed. Pass the working directory and task inputs explicitly. Agent isolation does not imply filesystem isolation: create each implementer's worktree before dispatch and require every command and edit to use it.
- If the available tool has different parameters, use its documented equivalent for a fresh context. If isolated subagents are unavailable, report the limitation before proceeding; do not silently run the whole build inside the coordinator.

If an agreed input exists only in this conversation, save it once in the shared run directory before dispatch. Use absolute paths for shared files and assigned worktrees.

Give each worker only its role, spec and ticket pointers, tracker configuration pointer, integration branch, assigned worktree, relevant shared notes, and required skill locations. Resolve skill locations and any plugin-qualified names from the installed skill catalog. In Claude Code, load a named skill through the Skill tool. In Codex, read that skill's `SKILL.md` at its installed location and follow it, reading supporting files only when needed. Pass this loading instruction to workers as part of their brief.

Workers write detailed findings and validation evidence to a shared run directory outside the repo. Each return is at most 200 words: ticket, terminal status (`complete`, `blocked`, or `failed`), branch and commit, validation result, blockers, and evidence path. A queued worker or accepted task is still running. Check its terminal result before advancing the ledger.

Keep a compact ledger in that directory: ticket IDs, blocking edges, worker IDs, worktree and branch paths, status, merged commits, and evidence paths, plus the integration branch and pre-run base commit. Update it after each terminal result and merge. Compute the frontier from successful merges into the integration branch, since tracker closure may wait until the final PR merges. When context is compacted or a coordinator is replaced, reload this ledger instead of worker transcripts.

Dispatch ready tickets up to the harness's available worker slots. When slots are full, wait for a completion. After collecting a terminal result, release the worker using the harness's close or release operation when available; start the next role in a fresh agent rather than reusing an implementation conversation. When capacity permits, keep one slot available for a merger while implementers are running; with only one worker slot, finish and release the implementer before starting the merger.

## Steps

1. Create the shared run directory and record the integration branch and pre-run base commit. Use a fresh planning subagent to read the spec, tracker configuration, and tickets and write the task graph to the ledger. The coordinator reads the compact graph and blockers, fetching ticket details only when a scheduling decision requires them.

2. (optional) Use an **exploration subagent** to conduct any exploration required by the tickets - relevant codebase files or external documentation. Ensure the exploration subagent can save files - it should save its markdown notes in a directory outside the repo, accessible by all future subagents. This lets **implementer subagents** focus on implementation rather than exploration.

3. Create the integration branch. If the issue tracker closes work through PRs, or the user asks for one, open a draft PR after the first merge in step 5 (a branch with no commits ahead of main can't open one), marked as closing the spec and tickets.

4. Use a fresh **implementer subagent** for each ticket, each in its own worktree on its own branch. Each implementer subagent:
   - confirms its assigned worktree is based on the integration branch before starting; if it contains unexpected changes, reports the blocker rather than resetting them;
   - loads `tdd` using the harness-specific method above to build the ticket;
   - merges the integration branch tip into its own branch before reporting done;
   - commits the ticket and returns the compact result with evidence pointers.

5. Once an **implementer subagent** completes successfully, merge its work to the integration branch with a fresh **merger subagent**. Serialize integration merges. The merger checks the current integration tip, resolves conflicts and runs the relevant checks in its own context, then returns the merged commit and evidence path. Only a successful merge advances the ledger.

6. If this changes the **frontier** of available tickets, kick off more **implementer subagents** to work on the new tickets. This allows for maximum concurrency.

7. Once all tickets have merged, use a fresh **review subagent** to load `code-review` using the harness-specific method above. Give it the pre-run base commit, integration branch, spec, tracker configuration, and shared run directory. It runs the two-axis review in its own context, saves the full findings, and returns the compact result. Fix the findings in a single fresh **implementer subagent**, merge the fix through step 5, and run focused checks for those findings. Delegate the final integration checks to a fresh worker and inspect its terminal result. If checks fail, keep the run incomplete and resolve or report the blocker.

8. Only after every ticket has merged and final checks have succeeded, close out the run. If a draft PR exists, mark it ready for review. Otherwise, resolve each ticket the way the issue tracker closes work, and report the integration branch.

9. Clean up all **implementer subagent** worktrees.
