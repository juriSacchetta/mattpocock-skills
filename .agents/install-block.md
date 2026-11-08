# The canonical install block

One install story, one wording. `README.md`, `.changeset/*`, and every page under `docs/` must say **this** and nothing else. Change it here first, then propagate.

## Managed installs first

Lead with installs that update themselves. Fall back to skills.sh, labelled "manual updates", only for agents that have no such install. Call a route managed only if it updates without the user running a command. Put any one-time opt-in beside its install command. Never promise "instant".

Claude Code and Codex install this fork from its own marketplace, `jurisacchetta`, in `juriSacchetta/mattpocock-skills`. The plugin is named `juri-skills`, separate from the upstream `mattpocock-skills` plugin. Enable auto-update for this third-party marketplace in Claude Code; it is off by default. Versioned updates follow `plugin.json`, kept in sync with `package.json` by `npm run version`. Merging the release PR publishes the next plugin version. Monitoring upstream releases is a separate workflow.

| Agent | Route | Updates itself? |
| --- | --- | --- |
| Claude Code | `@jurisacchetta` marketplace | After enabling marketplace auto-update |
| Codex | `@jurisacchetta` marketplace | At startup, by default |
| Copilot CLI | `@jurisacchetta` marketplace | After a one-time `autoUpdate: true` |
| VS Code | Chat: Install Plugin From Source | Daily, by default |
| Gemini CLI | `gemini skills install` (copies) | No |
| Everyone else | skills.sh | No, run update and re-run add for new skills |

Sources (2026-10-08): Codex `core-plugins/src/manager.rs`; Copilot [cli-config-dir-reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference); VS Code `pluginAutoUpdate.ts`; Gemini `skillLoader.ts`.

Nobody has run Auggie, Droid, Qwen or Goose against this repo, so they stay on skills.sh until someone does.

## Claude Code

<canonical-block name="claude-code">

```bash
claude plugin marketplace add juriSacchetta/mattpocock-skills
claude plugin install juri-skills@jurisacchetta
```

In Claude Code, open `/plugin`, select **Marketplaces → jurisacchetta → Enable auto-update**. Restart the session after installation.

</canonical-block>

## Codex

<canonical-block name="codex">

```bash
codex plugin marketplace add juriSacchetta/mattpocock-skills
codex plugin add juri-skills@jurisacchetta
```

Updates itself at startup.

</canonical-block>

## GitHub Copilot (CLI and VS Code)

Use the marketplace, not `copilot plugin install juriSacchetta/mattpocock-skills`. Copilot has deprecated direct repo installs, and they can't auto-update. The `extraKnownMarketplaces` entry follows the documented schema, but nobody has run it yet.

<canonical-block name="copilot">

```bash
copilot plugin marketplace add juriSacchetta/mattpocock-skills
copilot plugin install juri-skills@jurisacchetta
```

Then, once, add to `~/.copilot/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "jurisacchetta": { "source": { "source": "github", "repo": "juriSacchetta/mattpocock-skills" }, "autoUpdate": true }
  }
}
```

In VS Code, run **Chat: Install Plugin From Source** and enter `https://github.com/juriSacchetta/mattpocock-skills`. It updates daily.

</canonical-block>

## Gemini CLI

Gemini doesn't read `.claude-plugin`, and `--path` takes one bucket. One install per promoted bucket gives exactly the promoted set (27 skills, verified 2026-10-07).

<canonical-block name="gemini">

```bash
gemini skills install https://github.com/juriSacchetta/mattpocock-skills.git --path skills/engineering
gemini skills install https://github.com/juriSacchetta/mattpocock-skills.git --path skills/productivity
```

Re-run both commands to update.

</canonical-block>

## Every other agent, or editable files (skills.sh)

`-a` preselects the agent. Each agent in the comment was run on 2026-10-07. Prefer skills.sh to an agent's own repo installer, such as `amp skill add` or `pi install git:…`, because those also pull in `misc/` and `in-progress/`. `npx skills update` skips skills added upstream since `add`, so the block tells users to re-run `add`.

<canonical-block name="other-agents">

```bash
npx skills@latest add juriSacchetta/mattpocock-skills -a <agent>  # cursor, opencode, devin, windsurf, amp, pi; omit -a to choose
```

When the installer asks which skills to take, include `setup-matt-pocock-skills`. To update, run `npx skills@latest update`, and re-run `add` to pick up new skills.

</canonical-block>

Use the single-skill form wherever one skill is named on its own. `docs/` pages don't use this block, because ai-hero renders the install widget above the page body. See [writing-docs.md](./writing-docs.md).

<canonical-block name="skills-sh-one-skill">

```bash
npx skills@latest add juriSacchetta/mattpocock-skills --skill=<name>
```

```bash
npx skills@latest update <name>
```

</canonical-block>

`skills@latest` is the pinned spelling everywhere.

## The two routes are exclusive

The plugin is a managed, read-only bundle you subscribe to. skills.sh writes files you own and edit. Installing both leaves the user with every skill twice: always say "pick one".
