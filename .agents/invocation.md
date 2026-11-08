# Model-invoked vs user-invoked

Every `SKILL.md` in this repo is a skill. The one axis that splits them is **invocation**, who can reach it:

- **User-invoked**: reachable **only by the human typing its name**. Set `disable-model-invocation: true` in the frontmatter (Claude Code) and `policy.allow_implicit_invocation: false` in `agents/openai.yaml` (Codex). The `description` is **human-facing**: a one-line summary read by a person browsing slash-commands. Strip trigger lists ("Use when the user says…").
- **Model-invoked**: reachable by **model or user**. The default: omit `disable-model-invocation` and the `policy` block from `agents/openai.yaml`. The `description` is **model-facing** and keeps rich trigger phrasing ("Use when the user wants…, mentions…, asks for…") so auto-invocation fires. The test for whether a skill should stay model-invoked: _could the model usefully reach for this autonomously?_ (Reuse is the reason to extract a skill, not the test.)

Each harness excludes a user-invoked skill from the model's reach in its own way, so nothing but the human can fire it: no other skill can. A user-invoked skill may invoke model-invoked skills, but it can never reach another user-invoked skill.

Every skill also carries an `agents/openai.yaml` beside its `SKILL.md`. It holds Codex UI metadata: `interface.display_name` and `interface.short_description` for the skill picker, and, for user-invoked skills, the `policy.allow_implicit_invocation: false` that pairs with `disable-model-invocation`. Keep the two in sync: a skill is user-invoked in both harnesses or neither.

Bucket `README.md`s and the top-level `README.md` group entries into **User-invoked** and **Model-invoked**.

## Dependencies between them

Dependencies explicitly tell the agent to **load and follow** each named skill. Resolve its location from the installed skill catalog rather than assuming a checkout layout or linking across skill folders.

- **Claude Code:** invoke the Skill tool once per named skill.
- **Codex:** read the named skill's `SKILL.md` at its installed location and follow it. Read supporting references only when the workflow needs them.

A skill must carry the loading instruction it needs: this contributor guide is not automatically available when a skill is installed elsewhere. For example: "Load `tdd`: use the Skill tool in Claude Code; in Codex, read its installed `SKILL.md` and follow it."

Shared reference docs live inside the skill that owns them. Other skills load that skill rather than linking across folders. Router prose that names skills for a human to pick from (`ask-matt`, bucket `README.md`s) is not invoking anything and can keep `/skill` labels. For human instructions, Claude Code uses `/skill-name`; Codex uses `$skill-name` or its skill picker.

Only **model-invoked** skills can be dependencies. When a step needs a user-invoked skill such as `setup-matt-pocock-skills`, tell the human to invoke it in their harness.

Every subagent dispatch must request a fresh context through the available harness tool, not just describe it as fresh. In Codex, set `fork_turns: "none"` when exposed. Give workers explicit task and skill pointers, since they do not inherit the conversation. Filesystem isolation is separate: assign worktrees when concurrent workers edit code.

## Passive vs active domain work

Merely _reading_ `GLOSSARY.md` for vocabulary is a one-line prose pointer, not the `domain-modeling` skill. Only the active build/sharpen discipline (challenge terms, edge-case scenarios, write ADRs, update `GLOSSARY.md` inline) is `domain-modeling`.
