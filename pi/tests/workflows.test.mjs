import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function run(name, args, agent) {
  const source = await readFile(new URL(`../workflows/${name}.js`, import.meta.url), "utf8");
  const body = source.replace(/export const meta = \{[\s\S]*?\n\};/, "");
  return new AsyncFunction("args", "agent", "parallel", "phase", body)(args, agent,
    jobs => Promise.all(jobs.map(job => Promise.resolve().then(job).catch(() => null))), () => {});
}
const pass = () => ({ status: "pass", findings: [], limitation: "" });
const hash = "a".repeat(40);
const graph = () => ({ spec: "/tmp/spec.md", integrationBranch: "integration", validationCommand: "npm test", localIntegrationAuthorized: true,
  tickets: [{ id: "A", task: "First independent slice", dependsOn: [] }, { id: "B", task: "Second independent slice", dependsOn: [] }, { id: "C", task: "Uses both slices", dependsOn: ["A", "B"] }] });
test("review keeps two independent axes", async () => {
  const labels = [];
  const result = await run("team-review", { snapshot: "/tmp/frozen.diff", spec: "/tmp/spec.md" }, async (_, options) => {
    labels.push(options.label);
    return options.label === "standards" ? pass() : { status: "findings", findings: [{ path: "app.js", line: 8, reason: "Missing case", evidence: "Spec 2" }], limitation: "" };
  });
  assert.deepEqual(labels.sort(), ["spec", "standards"]); assert.equal(result.status, "findings");
  assert.equal(result.standards.status, "pass"); assert.equal(result.spec.findings[0].evidence, "Spec 2");
});
test("missing spec is explicit; failed reviews wait for siblings and cannot pass", async () => {
  let calls = 0;
  const result = await run("team-review", { snapshot: "frozen.diff" }, async () => { calls++; return pass(); });
  assert.equal(calls, 1); assert.equal(result.spec.status, "not-applicable");
  let siblingFinished = false;
  await assert.rejects(run("team-review", { snapshot: "diff", spec: "spec" }, async (_, options) => {
    if (options.label === "standards") return null;
    await new Promise(resolve => setTimeout(resolve, 10)); siblingFinished = true; return pass();
  }), /did not complete/);
  assert.equal(siblingFinished, true);
  await assert.rejects(run("team-review", { snapshot: "diff" }, async () => ({ status: "pass", findings: [{}] })), /contradicts/);
});
test("invalid graphs and missing authorization launch no children", async () => {
  for (const mutate of [args => { args.localIntegrationAuthorized = false; }, args => { args.tickets[0].dependsOn = ["missing"]; },
    args => { args.tickets[0].dependsOn = ["C"]; }, args => { args.tickets.push(args.tickets[0]); }]) {
    const args = graph(); mutate(args); let calls = 0;
    await assert.rejects(run("team-spec", args, async () => { calls++; })); assert.equal(calls, 0);
  }
});
test("frontier runs concurrently and integrates before dependents start", async () => {
  const events = []; let active = 0; let peak = 0;
  const result = await run("team-spec", graph(), async (_, options) => {
    events.push(options.label);
    if (options.label === "preflight") return { status: "ready", head: hash, reason: "" };
    if (options.agentType === "implementer") {
      assert.equal(options.isolation, "worktree"); assert.equal(options.gate, "npm test");
      active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 10)); active--;
      return `Completed; host preserved branch pi-agent-${options.label}`;
    }
    assert.equal(active, 0); assert.equal(options.gate, "npm test");
    return { status: "integrated", tickets: options.label === "integrate:A,B" ? ["A", "B"] : ["C"], head: hash, checks: "npm test passed", pinMismatch: [] };
  });
  assert.equal(peak, 2); assert(events.indexOf("C") > events.indexOf("integrate:A,B"));
  assert.deepEqual(result.tickets, ["A", "B", "C"]); assert.equal(result.reviewRequired, true);
});
test("failed implementation retains sibling handoffs and blocks dependent work", async () => {
  const labels = []; let siblingFinished = false;
  await assert.rejects(run("team-spec", graph(), async (_, options) => {
    labels.push(options.label);
    if (options.label === "preflight") return { status: "ready", head: hash, reason: "" };
    if (options.label === "A") return null;
    await new Promise(resolve => setTimeout(resolve, 10)); siblingFinished = true; return "Preserved sibling branch";
  }), /Frontier incomplete/);
  assert.equal(siblingFinished, true); assert.deepEqual(labels, ["preflight", "A", "B"]);
});
test("a repeat review round reports no new locations and converges", async () => {
  const finding = { status: "findings", findings: [{ path: "./app.js", line: 8, reason: "Missing case", evidence: "Spec 2" }], limitation: "" };
  const first = await run("team-review", { snapshot: "diff", spec: null }, async () => finding);
  assert.deepEqual(first.findingKeys, ["app.js:8"]); assert.deepEqual(first.newFindingKeys, ["app.js:8"]);
  assert.equal(first.converged, false); assert.equal(first.usage.outputTokens, null);
  const second = await run("team-review", { snapshot: "diff", spec: null, knownFindings: ["app.js:8"] }, async () => finding);
  assert.deepEqual(second.newFindingKeys, []); assert.deepEqual(second.repeatedFindingKeys, ["app.js:8"]); assert.equal(second.converged, true);
  const clean = await run("team-review", { snapshot: "diff", spec: null, knownFindings: ["app.js:8"] }, async () => pass());
  assert.equal(clean.converged, true);
  await assert.rejects(run("team-review", { snapshot: "diff", knownFindings: [3] }, async () => pass()), /knownFindings/);
});
test("tickets declaring acceptance checks need a pin receipt before integration", async () => {
  const args = graph(); args.tickets[0].acceptanceChecks = ["tests/acceptance.spec.js"]; args.tickets[0].invariants = ["for any input, decoding inverts encoding"];
  const prompts = []; let integrations = 0;
  await assert.rejects(run("team-spec", args, async (prompt, options) => {
    prompts.push(prompt);
    if (options.label === "preflight") return { status: "ready", head: hash, reason: "" };
    if (options.agentType === "implementer") return options.label === "B" ? "Completed; branch pi-agent-B" : "Completed without a pin";
    integrations++; return { status: "integrated", tickets: ["A", "B"], head: hash, checks: "ok", pinMismatch: [] };
  }), /Pinned acceptance checks were not reported/);
  assert.equal(integrations, 0);
  assert(prompts.some(prompt => prompt.includes("--pin \"tests/acceptance.spec.js\"") && prompt.includes("decoding inverts encoding")));
});
test("a reported pin receipt reaches the integrator and a mismatch blocks the frontier", async () => {
  const args = graph(); args.tickets[1].acceptanceChecks = ["tests/acc.spec.js"];
  const prompts = [];
  const result = await run("team-spec", args, async (prompt, options) => {
    prompts.push(prompt);
    if (options.label === "preflight") return { status: "ready", head: hash, reason: "" };
    if (options.agentType === "implementer") return options.label === "B" ? "Done\nPIN-RECEIPT: /tmp/pi/team-review-x/receipt.json" : "Done";
    return { status: "integrated", tickets: options.label === "integrate:A,B" ? ["A", "B"] : ["C"], head: hash, checks: "ok", pinMismatch: [] };
  });
  assert(prompts.some(prompt => prompt.includes("--verify-pins") && prompt.includes("/tmp/pi/team-review-x/receipt.json")));
  assert.equal(result.tickets.length, 3);
  await assert.rejects(run("team-spec", graph(), async (_, options) => {
    if (options.label === "preflight") return { status: "ready", head: hash, reason: "" };
    if (options.agentType === "implementer") return "Done";
    return { status: "integrated", tickets: ["A", "B"], head: hash, checks: "ok", pinMismatch: ["tests/acc.spec.js"] };
  }), /Integration incomplete/);
});
test("malformed acceptance fields fail before any child starts", async () => {
  for (const mutate of [args => { args.tickets[0].acceptanceChecks = "tests/a.spec.js"; }, args => { args.tickets[0].invariants = [42]; }]) {
    const args = graph(); mutate(args); let calls = 0;
    await assert.rejects(run("team-spec", args, async () => { calls++; }), /string array/); assert.equal(calls, 0);
  }
});
test("incomplete integration and blocked preflight do not release work", async () => {
  const labels = [];
  await assert.rejects(run("team-spec", graph(), async (_, options) => {
    labels.push(options.label);
    if (options.label === "preflight") return { status: "ready", head: hash, reason: "" };
    if (options.agentType === "implementer") return "Host branch receipt";
    return { status: "integrated", tickets: ["A"], head: hash, checks: "Only one merged", pinMismatch: [] };
  }), /Integration incomplete/);
  assert(!labels.includes("C")); let calls = 0;
  await assert.rejects(run("team-spec", graph(), async () => { calls++; return { status: "blocked", head: hash, reason: "Dirty checkout" }; }), /preflight/);
  assert.equal(calls, 1);
});
