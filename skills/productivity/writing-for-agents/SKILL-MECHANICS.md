# Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md): what changes when the document is a skill (frontmatter, the invocation choice, and router skills). Everything else about writing it is the universal reference in `SKILL.md`.

## Invocation

Two choices, trading the two loads:

- A **model-invoked** skill is reachable by the model and the human. Omit `disable-model-invocation` from `SKILL.md` and leave `policy.allow_implicit_invocation` enabled (or absent) in `agents/openai.yaml`. Its description is a model-facing context pointer carrying the trigger branches. It can also own reference material another skill needs.
- A **user-invoked** skill is reached only when the human invokes it. Set `disable-model-invocation: true` for Claude Code and `policy.allow_implicit_invocation: false` in `agents/openai.yaml` for Codex. Keep the required description as a human-facing summary; strip automatic trigger lists. This opts out of automatic invocation, but the amount of metadata exposed in context depends on the harness.

Every skill keeps `name` and `description` in its frontmatter. Keep invocation policy in sync across both harnesses; the Claude Code frontmatter flag alone does not configure Codex. Humans invoke skills as `/skill-name` in Claude Code or `$skill-name` in Codex, or through the harness's picker.

Pick model-invocation when the agent must reach the skill on its own, or another skill must. Keep human-only workflows user-invoked. Dependencies load through the Skill tool in Claude Code or by reading the installed `SKILL.md` in Codex. A skill that depends on another must state this loading method itself, since it can be installed without this reference.

Shared reference that two user-invoked skills both need can live in neither as a callable dependency. Put it in a plain reference file, or in a model-invoked reference skill when independent discovery is useful.

## Splitting by invocation

The invocation cut of splitting (the sequence cut lives in `SKILL.md`): split off a model-invoked skill when you have a distinct leading word that should trigger it on its own (a trigger word you actually use in your prompts), or another skill must reach it. You pay context load for the new always-loaded description, so that independent reach has to be worth it.

## Router skills

When user-invoked skills multiply past what you can remember, that piled-up cognitive load is cured by a **router skill**: one user-invoked skill that names the others and when to reach for each, so the human has one skill to remember instead of many. It can only hint, never fire them: user-invoked skills retain their descriptions but are excluded from automatic invocation, so the router recommends them for the human to invoke.
