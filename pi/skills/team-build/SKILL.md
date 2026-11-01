---
name: team-build
description: Run a bounded implementation or a dependent multi-ticket specification through the Pi engineering team.
disable-model-invocation: true
---

Read ../team-context/SKILL.md. This adapts Matt Pocock's implement and implement-spec workflows to Pi.

## Change mode

For one bounded change, establish the spec/brief and validation command from the project. Use planner only for unresolved decisions and explorer only for missing code facts. Delegate implementation to one implementer in the assigned checkout, keeping any existing user changes intact. Do not permit another writer in that checkout concurrently.

Inspect its terminal handoff and actual check results. Use team-review to freeze the complete intended diff and run the two independent review axes. If changes are requested, one fresh implementer may fix the findings, followed by a new snapshot and both reviewers again. Further unresolved findings are a blocked outcome to discuss, not an unbounded correction loop. The main session verifies the final validation command and reports evidence. Commit/push only if requested.

## Spec mode

Use for a spec already split into tickets with explicit blocking dependencies. Establish the local integration branch and a clean dedicated checkout without committing, stashing or resetting unrelated user changes. The branch must have an existing commit and be checked out in the Pi session's working directory. Keep the main checkout stable while isolated implementers run.

Tell the user that worktree results are preserved by the subagent host as local commits/branches and merged locally into the integration branch. Starting this mode authorizes those local preservation commits and merges; it does not authorize a push, PR or remote ticket updates. Honor any narrower authorization already given.

Prepare args for the saved team-spec workflow: spec (absolute path), integrationBranch, validationCommand, tickets (array of id, task and dependsOn arrays), plus localIntegrationAuthorized=true once those local actions are authorized. The main session checks that the current branch equals integrationBranch and the checkout is clean before launching. Start SubagentWorkflow by name team-spec with those args.

The workflow validates the dependency graph before launching children. Every ready ticket gets its own implementer worktree. Each completed frontier is handed to one integrator; only its verified successful result releases dependent tickets. Partial or failed work stops the graph and preserves siblings for inspection. Never treat skipped/stopped children or a null result as completed tickets.

Collect the workflow's terminal result. After all tickets have landed, take a branch snapshot and run team-review once against the complete spec. At most one explicitly scoped fix cycle follows, then revalidate/review. The main session reports branch, commit, ticket outcomes and checks; marks local tickets complete only on evidence; and leaves remote publication to the user's instructions. Preserve conflicted or unmerged branches and report them.
