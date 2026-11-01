import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("the usage ledger records each subagent message by role", async t => {
  const scratch = mkdtempSync(path.join(tmpdir(), "pi-team-usage-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  process.env.PI_PERMISSION_TMPDIR = scratch;
  const { default: factory } = await import(new URL("../extensions/team-usage.ts", import.meta.url));
  const handlers = new Map();
  factory({ on: (name, handler) => handlers.set(name, handler), events: { on: (name, handler) => handlers.set(name, handler) } });
  handlers.get("before_agent_start")({ systemPrompt: "an ordinary prompt" });
  handlers.get("subagents:usage")({ id: "a1", type: "standards-reviewer", model: "openrouter/anthropic/claude-sonnet-5.5", usage: { output: 120, cost: { total: 0.0123 } } });
  handlers.get("subagents:usage")({ id: "a1", type: "standards-reviewer", usage: { output: 0, cost: { total: 0 } } });
  handlers.get("agent_settled")({ type: "agent_settled" }, { ui: { notify: () => {} } });
  const directory = path.join(scratch, "team-usage");
  const lines = readFileSync(path.join(directory, readdirSync(directory)[0]), "utf8").trim().split("\n").map(line => JSON.parse(line));
  assert.equal(lines.length, 2);
  assert.equal(lines[0].event, "usage"); assert.equal(lines[0].role, "standards-reviewer"); assert.equal(lines[0].cost, 0.0123); assert.equal(lines[0].model, "openrouter/anthropic/claude-sonnet-5.5");
  assert.equal(lines[1].event, "round"); assert.match(lines[1].summary, /standards-reviewer \$0\.0123 \(120 out, 1 msg\)/);
});

test("a subagent session records spend but emits no round summary", async t => {
  const scratch = mkdtempSync(path.join(tmpdir(), "pi-team-usage-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  process.env.PI_PERMISSION_TMPDIR = scratch;
  const { default: factory } = await import(new URL("../extensions/team-usage.ts?child", import.meta.url));
  const handlers = new Map();
  factory({ on: (name, handler) => handlers.set(name, handler), events: { on: (name, handler) => handlers.set(name, handler) } });
  handlers.get("before_agent_start")({ systemPrompt: '<active_agent name="implementer"/>\nYou implement exactly one ticket.' });
  handlers.get("subagents:usage")({ id: "a2", type: "spec-reviewer", usage: { output: 40, cost: { total: 0.004 } } });
  handlers.get("agent_settled")({}, { ui: { notify: () => { throw new Error("a child session has no UI to notify"); } } });
  const directory = path.join(scratch, "team-usage");
  const lines = readFileSync(path.join(directory, readdirSync(directory)[0]), "utf8").trim().split("\n").map(line => JSON.parse(line));
  assert.deepEqual(lines.map(line => line.event), ["usage"]);
});
