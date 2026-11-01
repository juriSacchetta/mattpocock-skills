# Pi distribution

This directory adapts Matt Pocock's workflows for Pi and @tintinweb/pi-subagents. Keep upstream skills, plugin manifests and their catalog unchanged. Pi skills belong here and are documented in pi/README.md, not in the upstream ask-matt router.

Pi loads skill instructions from files with its read tool. Do not invent a Skill tool. Preserve explicit-only invocation for the adapted build and planning entrypoints, matching the upstream workflows. Shared references and review/research disciplines remain model-invocable.

Before editing comments or preparing a commit, consult comment-discipline. Never add AI attribution to commits. Start delegated work with fresh conversation context. Do not publish credentials, local session logs or private project artifacts in this repository.

Run npm run test:pi for changes in this directory. Use an isolated Pi agent directory for integration checks. The tests must inspect terminal results, not just accepted launches.
