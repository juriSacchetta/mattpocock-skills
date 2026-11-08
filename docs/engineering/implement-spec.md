## What it does

`implement-spec` takes a [spec](https://www.aihero.dev/ai-coding-dictionary/spec) and its [tickets](https://www.aihero.dev/ai-coding-dictionary/ticket) and lands the whole thing in one run. The orchestrating [agent](https://www.aihero.dev/ai-coding-dictionary/agent) hands each ticket to an implementer [subagent](https://www.aihero.dev/ai-coding-dictionary/subagent) working in its own git worktree, merges each finished branch into a single **integration branch**, runs [code-review](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/code-review.md) over the result, and resolves the tickets.

It reads the tickets as a **task graph**, not a list. Blocking edges decide what can start, so at any moment there is a **frontier** of tickets whose blockers have all landed, and ready tickets run up to the available worker capacity. That is the difference from working the tickets one by one. The graph's shape sets the pace, not the tickets' order on the tracker.

## When to reach for it

Plugin installs may qualify skill names, for example `juri-skills:implement-spec`. Use the installed name shown in your skill picker.

You invoke this by typing `/implement-spec` in Claude Code or `$implement-spec` in Codex, and the agent won't reach for it on its own.

| Your situation | Reach for |
| --- | --- |
| A spec, split into tickets with blocking edges, that you want landed in one run | `/implement-spec` |
| One ticket at a time, in your own [context window](https://www.aihero.dev/ai-coding-dictionary/context-window), [clearing](https://www.aihero.dev/ai-coding-dictionary/clearing) between tickets | [implement](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/implement.md) |
| A spec that isn't split into tickets yet | [to-tickets](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/to-tickets.md) first |
| A small piece of work with no real graph to it | [implement](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/implement.md) directly |

## Prerequisites

- **An issue tracker.** The skill reads the tickets from, and resolves them on, the tracker [setup-matt-pocock-skills](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/setup-matt-pocock-skills.md) configured. If none has been configured, it stops and tells you to run that first rather than guessing.
- **Tickets with blocking edges**, as [to-tickets](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/to-tickets.md) writes them. Without edges the graph is flat and every ticket starts at once.
- **A [harness](https://www.aihero.dev/ai-coding-dictionary/harness) with isolated subagents and git worktree support.** The skill exists to run tickets at the same time, so on a harness that runs subagents one at a time, it is only a slower `implement`.

## The integration branch

Everything lands on one branch. Each implementer:

1. confirms its worktree is based on the integration branch before it starts,
2. builds its ticket with [tdd](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/tdd.md), red-green one slice at a time,
3. merges the integration branch tip into its own branch before reporting done. A merger checks the latest tip again because another ticket may have landed meanwhile.

The tracker decides whether a pull request exists at all. If your tracker closes work through PRs, or you ask for one, the skill opens a draft PR after the first merge and marks it ready at the end. Otherwise the run stops on the integration branch with every ticket resolved the way your tracker closes work, which works fully offline against a local markdown tracker.

Implementers talk to the orchestrator through [context pointers](https://www.aihero.dev/ai-coding-dictionary/context-pointer) (the spec, the ticket, shared exploration notes, earlier commits) rather than pasted summaries. This keeps each subagent's prompt small and leaves room in the orchestrator's window for the graph.

## Common questions

**Why does the coordinator fill its context in Codex?**

A worker that inherits the coordinator's conversation carries the existing context into every task. Delegating work also saves little coordinator space if workers return full diffs and logs, or if review runs in the coordinator. The skill explicitly requests fresh Codex workers without conversation inheritance, assigns each implementer a worktree, and keeps exploration and review inside workers. Claude Code uses its native subagent tool for the same roles.

The coordinator reads a compact ledger of tickets, blockers, worker status, and merged commits. Workers save detailed evidence outside the repo and return at most 200 words with pointers. This reduces context growth; a long run can still need compaction, after which the coordinator reloads the ledger. Queued work counts as complete only after a successful terminal result and integration merge.

**How is this different from running `/implement` on each ticket myself?**

This is the question the skill exists to answer. Before it shipped, people kept building their own versions, and one user described the need: they wanted "subagents implement the tickets" instead of having "to individually create new session and tell them to implement a ticket one by one, when a spec may contain over 5 tickets." With `implement` you are the dispatcher: one [session](https://www.aihero.dev/ai-coding-dictionary/session) per ticket, clearing in between, and keeping track yourself of which tickets are unblocked. `implement-spec` hands that job to one orchestrating session. The price is that you no longer read each ticket's work as it lands; you review the integration branch at the end. To start a run, clear the context and type `/implement-spec` with a pointer to the spec (an issue number or a file path). For a small change with no real graph, skip it and use `implement` directly.

**Does it need GitHub? I want it to stop at the branch.**

No, not any more. One user who liked the in-progress version had exactly this complaint: "it creates a PR at the end, which requires an online repository like GitHub. I wish it could do the same work offline and stop at the branch where all the work is merged." The run now ends on the integration branch. A PR opens only when the configured tracker closes work through PRs or you ask for one, so on a local markdown tracker the run ends with every ticket resolved and the work merged on the branch.

**Its review and fix loop ran for hours, or kept "fixing" tickets that hadn't been built yet.**

Both happen when `code-review` runs anywhere other than the one point the skill gives it. It compares the code against the whole spec, so it only makes sense once every ticket has landed. If it runs mid-run, every unbuilt ticket reads as a failure. The agent then builds that ticket, and that triggers another review. At the end, the skill runs `code-review` in a fresh review subagent and sends every finding to one fix subagent. After merging the fixes, it runs focused checks and final integration checks rather than starting another broad review. One user reported a five-ticket feature where "the review and fix loop took roughly four hours". If you see a second broad review start, tell it to run focused checks for the fixed findings and stop. Expect that first review to find real problems. The run's output is a draft that the review completes, not something to ship on its own.

**Does it drive tdd like implement does?**

It does now, though it didn't at first. Users running the in-progress version noticed that "the implementer subagents don't inherit the /tdd directive", so red-green stopped as soon as they scaled up from one ticket to a whole spec. Each implementer now builds its ticket with `tdd`. There is still no step where you agree seams interactively, as there is in an `implement` session, so name the seams in the spec or the tickets if you want them pinned.

**Two implementers running in parallel collided on the same file, or picked different names for the same thing.**

Worktrees don't remove collisions; they postpone them to merge time. A blocking edge written from ticket text is a guess about which files each ticket will touch, and two tickets on "different parts of the codebase" still share a message catalogue, a config registry, or a type. Each implementer sees only its own ticket and the shared notes, never the other's work in progress, so one user's web and mobile tickets added the same string as `blockedSince` and `blockedOn`. When two frontier tickets touch one shared file, either add a blocking edge between them so they run one after the other, or have the exploration notes fix the exact names each ticket adds.

**Blocked tickets never start, even after their blocker has merged.**

This is a known problem on GitHub. The tracker's blocked-by count only drops when a blocker *closes*, and tickets typically close when the PR merges, which is the end of the run. The tracker is the right source for the starting graph but a stale one mid-run. The orchestrator now records successful integration merges in its ledger and computes the frontier from those, rather than waiting for tracker closure.

**Does this replace Sandcastle or an AFK script?**

No. People ask because the skills now reach into implementation: "is Sandcastle still relevant? Your skills now seem to be able to handle implementation as well." `implement-spec` puts an agent in charge of orchestration inside one harness session, which needs no infrastructure and lets you watch and steer. For work that is truly [AFK](https://www.aihero.dev/ai-coding-dictionary/afk), a deterministic loop ([Sandcastle](https://github.com/mattpocock/sandcastle), a shell script, a CI job) is faster, cheaper, and more reliable, because no agent makes the orchestration decisions.

**A ticket's key test was skipped inside its worktree, and it reported green.**

A worktree holds only what git tracks. Tests that read gitignored fixtures, local databases, or credentials can silently skip there. For a ticket whose verification depends on untracked material, tell the orchestrator to run it in the main checkout instead.

## It's working if

- Several implementers are running at once whenever the graph allows, not one after another.
- A ticket starts as soon as its last blocker lands on the integration branch, not when the whole run ends.
- Every ticket's trace shows `tdd` running, with a failing test before the code.
- Merge conflicts and test logs stay in worker contexts; the coordinator receives compact results and evidence pointers.
- The coordinator can recover the frontier from its on-disk ledger after compaction.
- The run ends on one branch with every ticket resolved, and a PR only if your tracker wanted one.

## Where it fits

`implement-spec` is the build step of the main chain, as the parallel alternative to running [implement](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/implement.md) once per ticket:

```txt
grill-with-docs → to-spec → to-tickets → implement-spec → retro
```

Its neighbours are [to-tickets](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/to-tickets.md), which declares the blocking edges it reads as a task graph, and [code-review](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/code-review.md), which it runs over the integration branch before closing out. [ask-matt](https://github.com/juriSacchetta/mattpocock-skills/blob/main/docs/engineering/ask-matt.md) is the router over the whole set when you are not sure which flow you are in.
