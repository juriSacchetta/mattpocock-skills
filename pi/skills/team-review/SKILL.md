---
name: team-review
description: Review committed or working changes with independent Standards and Spec reviewers. Use when a diff needs checking against project conventions and requested behavior.
---

Read ../team-context/SKILL.md. This adapts Matt Pocock's code-review workflow to Pi and includes working changes explicitly.

Freeze the review input with the bundled script, using the actual package path resolved from this skill:

- Committed changes: python3 ../../scripts/review_snapshot.py --repo <repository> --base <reference>
- Staged and unstaged tracked changes: python3 ../../scripts/review_snapshot.py --repo <repository> --working

The output is a JSON receipt naming the immutable diff file, repository, commit and omitted untracked paths. Read it. Untracked files are listed but never silently included; report missing coverage or create a separate user-authorized snapshot of selected files. Empty or unresolved comparisons stop before any reviewer starts.

Locate a spec and the repository's coding standards. If the spec is absent, the Spec axis must report not-applicable. Call SubagentWorkflow with name team-review and args containing snapshot (diff file path), spec (path or null), standards (paths or a concise description) and repo. The two reviewers receive fresh contexts and the same frozen diff. They return independent findings; keep the axes separate.

For a single change, the implementer that produced it spawns both reviewers directly with the Agent tool on the same inputs. The workflow is for a whole branch, or any diff that no implementer handoff produced.

Wait for the workflow's terminal state in /agents or its terminal notification, then inspect its final result. A launch receipt is not a review. If it failed or either axis is blocked, report incomplete coverage. Do not edit files unless fixes were requested. Before applying a review, take a new snapshot in the same mode and compare its head and sha256 with the original receipt. A changed HEAD or diff invalidates the review for the current tree, even when working changes left HEAD unchanged.
