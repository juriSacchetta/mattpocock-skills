# Pi Agent Team

Matt Pocock's engineering workflows adapted to Pi and `@tintinweb/pi-subagents`. Upstream skills and plugin catalogs remain in their original locations. This distribution exposes the Pi skills, agent definitions and shared prompt extension under `pi/`.

## Requirements and installation

Tested target: Pi 1.4.0, @tintinweb/pi-subagents 0.22.1, pi-permission-modes 2.7.2, @czottmann/pi-automode 1.17.0, pi-web-access 0.46.0 and pi-lens 4.4.7. Git and Python 3 are required. These existing host packages supply tools and hooks; this package adds no runtime dependency or scheduler.

Install the subagent/guard/web/diagnostic packages first, then `pi install git:github.com/juriSacchetta/pi-agent-team@pi-team`. For local development use `pi install /path/to/pi-agent-team`. Pin a tested commit for a stable deployment. A local install reads the checkout directly.

Open a new Pi session. `/agents` shows the team. `maxConcurrent`, `maxConcurrentForeground` and `maxSubagentDepth` remain operator configuration in `~/.pi/agent/subagents.json`; installation never overwrites them. For the prepared setup these are 10 background agents, unlimited foreground agents, and depth 2. Nested/workflow fanout has its own limits.

Package agents have lower priority than same-name global or project agents. Inspect `/agents` before assuming a role policy is active. During migration, back up conflicting definitions and remove only those being replaced. Model choices are inherited; the package does not select paid models.

## Team

| Role | Work | Source writes |
| --- | --- | --- |
| planner | Requirements, decisions and ticket graph | No |
| explorer | Code facts and relevant tests | No |
| researcher | Cited primary-source facts | No |
| implementer | One ticket, its tests and the review handoff | Assigned checkout |
| standards-reviewer | Conventions, correctness and maintainability | No |
| spec-reviewer | Requirements and scope | No |
| integrator | Local branch integration and combined validation | Integration checkout only |

Each role's file is its system prompt (`prompt_mode: replace`): the job plus the rules of the flow step it owns — the red-green loop for the implementer, the smell baseline and the standards sources for the standards reviewer, the merge discipline for the integrator. Long references stay in skills, read on demand; ordering that must not depend on the model lives in the workflow scripts. A standalone prompt does not inherit AGENTS.md, so the write roles read the repository's own instruction files themselves.

The implementer's handoff is not optional: it runs the ticket's validation command, freezes the diff with the team-review snapshot script and spawns both reviewers itself. It cannot reach past its allowlist — a nested planner or integrator is refused with the allowed list.

Both reviewers pin `model: openrouter/deepseek/deepseek-v4.1-flash`, the cheap model the rest of the team runs on. The pin started as `claude-sonnet-5.5`, which an OpenRouter in-flight budget wall (402 `in_flight_budget_exhausted`) killed mid-review at an inherited `thinking: max`: ~$0.82 spent across both axes with no verdict. A pinned model runs even when the host scopes models more tightly (`scopeModels`), at the cost of a warning at spawn, and `subagents.json` has no per-agent model override, so these two lines are the only place the choice can live. Sharing the implementation's model family costs the reviewers their family independence — self-preference stays unmitigated by that route, while the two axes remain independent agents on fresh context, which is the load-bearing part. To buy capability back, edit these two `model:` lines (for example `openrouter/anthropic/claude-sonnet-5.5`, ~$0.35–0.50 per axis) and keep the balance above the in-flight reservation.

A small prompt extension supplies [team-context](skills/team-context/SKILL.md) once to the main session and children. This bypasses the current subagent preloader limitation for package-owned skills. Nested delegation is allowed through role-specific allowlists. The researcher executes delegated research directly and can delegate only distinct code lookups, preventing research-to-research recursion.

Read-only roles expose no shell, write or edit tool. Reviewers read frozen diff files instead of running Git; those snapshots live under the shared scratch base (`/tmp/pi`, or `PI_PERMISSION_TMPDIR`), which must stay writable for bash and readable for reviewers.

The checks a ticket is judged by are pinned before implementation and verified before merge. The implementer writes them first, hashes them with `review_snapshot.py --pin`, and reports the receipt; the integrator re-hashes them against the ticket branch and refuses to merge a ticket whose pinned check changed or went missing, because a weakened test is the one failure a green gate cannot see. A fix loop stops on evidence rather than patience: the review returns `newFindingKeys`, and a round that adds no new location ends the loop. Spend is accounted per role: the `team-usage` extension writes every subagent message's tokens and cost to `$SCRATCH/team-usage/<date>.jsonl` with a per-round summary, workflows return `usage.outputTokens`, and the implementer reports the host's own usage line for each review child. The researcher selects the installed web package's `dist` tool namespace; changing that package's entry path requires a compatibility check. Write roles retain the host's permission and automode extensions. Tool scope, worktrees and prompt restrictions do not replace OS sandboxing. Validate child guards and worktree boundaries on the target host.

## Flows

User-invoked:

- [team-plan](skills/team-plan/SKILL.md): clarify, specify and split work into dependent tickets.
- [team-build](skills/team-build/SKILL.md): one intervention, or a parallel ticket graph integrated onto a local branch.
- [team-handoff](skills/team-handoff/SKILL.md): continue in a fresh session.

Model- or user-invoked:

- [team-review](skills/team-review/SKILL.md): independent Standards and Spec axes over an immutable diff.
- [team-research](skills/team-research/SKILL.md): primary-source investigation with an explicit recursion boundary.
- [team-context](skills/team-context/SKILL.md): task, handoff and permission contracts.

Pi commands use `/skill:team-plan`, `/skill:team-build`, `/skill:team-review`, `/skill:team-research` and `/skill:team-handoff`. There is no Skill tool to call. The review and spec skills explain arguments for saved `team-review` and `team-spec` workflows, which run through `SubagentWorkflow`.

The spec flow uses a clean dedicated integration checkout and host-managed worktrees. Its implementers leave changes for host preservation; the integrator validates the host's branch receipts and merges each frontier before dependents start. Local preservation commits and merges require authorization; pushes, PRs and remote ticket changes are separate actions. A failed frontier stops dependent work and retains successful sibling branches.

A single-change flow preserves existing user edits, has one writer and at most one review/fix/review cycle. It does not commit by default.

## Validation and upstream

Run `npm run test:pi`. This checks real Git snapshots and workflow behavior, including failures and dependency ordering. Host integration checks must additionally exercise package discovery, role tool scope, actual nested completion and worktree shell/file boundaries. Simulated agents do not prove reasoning quality or real-model task success.

Adapted from upstream commit `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`. Keep the root MIT license and Matt Pocock's copyright. Pull upstream with `git fetch upstream` and merge explicitly, then rerun tests and inspect changed source workflows before updating the Pi adapters. Do not mechanically copy new prompt instructions into the adapters.
