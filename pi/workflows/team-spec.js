export const meta = {
  name: "team-spec",
  description: "Implement a ticket graph in isolated worktrees and integrate each completed frontier",
  phases: [{ title: "Preflight" }, { title: "Implement" }, { title: "Integrate" }],
};

// A tool call may hand args over as a JSON string rather than an object.
if (typeof args === "string") {
  try { args = JSON.parse(args); } catch { throw new Error("args arrived as a string that is not JSON"); }
}
if (!args || args.localIntegrationAuthorized !== true) throw new Error("Local preservation commits and integration merges must be authorized");
for (const key of ["spec", "integrationBranch", "validationCommand"]) {
  if (typeof args[key] !== "string" || !args[key].trim()) throw new Error(`${key} is required`);
}
if (!Array.isArray(args.tickets) || !args.tickets.length) throw new Error("tickets must be a non-empty array");
const tickets = new Map();
for (const ticket of args.tickets) {
  if (!ticket || typeof ticket.id !== "string" || !ticket.id.trim() || typeof ticket.task !== "string" || !ticket.task.trim()
      || !Array.isArray(ticket.dependsOn) || ticket.dependsOn.some(id => typeof id !== "string" || !id.trim())) {
    throw new Error("Each ticket needs id, task and a dependsOn string array");
  }
  for (const field of ["acceptanceChecks", "invariants"]) {
    const value = ticket[field];
    if (value !== undefined && (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim()))) {
      throw new Error(`Ticket ${ticket.id} ${field} must be a non-empty string array`);
    }
  }
  if (tickets.has(ticket.id)) throw new Error(`Duplicate ticket ${ticket.id}`);
  tickets.set(ticket.id, ticket);
}
for (const ticket of tickets.values()) {
  for (const dependency of ticket.dependsOn) {
    if (!tickets.has(dependency)) throw new Error(`Unknown dependency ${dependency} in ${ticket.id}`);
  }
}
const validated = new Set();
while (validated.size < tickets.size) {
  const ready = [...tickets.values()].filter(ticket => !validated.has(ticket.id) && ticket.dependsOn.every(id => validated.has(id)));
  if (!ready.length) throw new Error("Ticket dependency cycle");
  for (const ticket of ready) validated.add(ticket.id);
}
const preflightSchema = {
  type: "object",
  properties: { status: { type: "string", enum: ["ready", "blocked"] }, head: { type: "string" }, reason: { type: "string" } },
  required: ["status", "head", "reason"], additionalProperties: false,
};
phase("Preflight");
const preflight = await agent(`Read-only preflight: verify the current checkout is on branch ${JSON.stringify(args.integrationBranch)}, has an existing commit and is completely clean. Read spec ${JSON.stringify(args.spec)} and verify the proposed validation command is appropriate: ${JSON.stringify(args.validationCommand)}. Do not edit, reset, stash, commit or switch branches. Report ready only after verifying these conditions; otherwise blocked with the actual state.`, {
  agentType: "integrator", label: "preflight", schema: preflightSchema,
});
if (!preflight || preflight.status !== "ready" || !/^[a-f0-9]{40,64}$/.test(preflight.head)) {
  throw new Error(`Integration preflight did not pass: ${JSON.stringify(preflight)}`);
}
const integrationSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["integrated", "blocked"] },
    tickets: { type: "array", items: { type: "string" } },
    head: { type: "string" },
    checks: { type: "string" },
    pinMismatch: { type: "array", items: { type: "string" } },
  },
  required: ["status", "tickets", "head", "checks", "pinMismatch"], additionalProperties: false,
};
const completed = new Set();
const integrations = [];
while (completed.size < tickets.size) {
  const ready = [...tickets.values()].filter(ticket => !completed.has(ticket.id) && ticket.dependsOn.every(id => completed.has(id)));
  phase("Implement");
  const pinStep = ticket => {
    const checks = ticket.acceptanceChecks ?? [];
    if (!checks.length) return "";
    const invariants = (ticket.invariants ?? []).length ? ` Cover these invariants as property tests over generated inputs, not as example tables: ${JSON.stringify(ticket.invariants)}.` : "";
    const pins = checks.map(name => `--pin ${JSON.stringify(name)}`).join(" ");
    return ` Before any source edit, write the acceptance checks the ticket names (${JSON.stringify(checks)}) from its criteria.${invariants} Add those new files to the index first (git add -N), or the snapshot refuses an empty diff. Then pin them with the team-review snapshot script: python3 <team-review skill directory>/scripts/review_snapshot.py --repo . --working ${pins}. Report the receipt path on its own line exactly as "PIN-RECEIPT: <path>". Never modify a pinned check afterwards; a correction needs a new pin and the parent told why.`;
  };
  const results = await parallel(ready.map(ticket => () => agent(`Implement only this ticket in your isolated worktree: ${JSON.stringify(ticket)}. Spec: ${JSON.stringify(args.spec)}.${pinStep(ticket)} The worktree must start from integration commit ${integrations.length ? integrations[integrations.length - 1].head : preflight.head}; verify HEAD before editing and report blocked if it differs. Stay in this worktree. Use focused tests; the required validation command is ${JSON.stringify(args.validationCommand)}. Do not create branches, merge, reset, push or modify the integration checkout. Leave changes for the host to preserve. Report actual changes, tests and unresolved issues.`, {
    agentType: "implementer", label: ticket.id, isolation: "worktree", gate: args.validationCommand,
  })));
  if (results.some(result => !result)) {
    throw new Error(`Frontier incomplete; no dependent tickets launched. Retain and inspect all sibling handoffs: ${JSON.stringify(ready.map((ticket, index) => ({ id: ticket.id, result: results[index] })))}`);
  }
  const pinReceipts = ready.map((_ticket, index) => /PIN-RECEIPT:\s*(\S+)/.exec(String(results[index] ?? ""))?.[1] ?? null);
  const missingPins = ready.filter((ticket, index) => (ticket.acceptanceChecks ?? []).length && !pinReceipts[index]).map(ticket => ticket.id);
  if (missingPins.length) throw new Error(`Pinned acceptance checks were not reported for: ${JSON.stringify(missingPins)}. Retain every sibling handoff and worktree for inspection.`);
  phase("Integrate");
  const integration = await agent(`Integrate this completed frontier into branch ${JSON.stringify(args.integrationBranch)}. Verify the current checkout is clean and still at expected HEAD ${integrations.length ? integrations[integrations.length - 1].head : preflight.head}. Host completion receipts: ${JSON.stringify(ready.map((ticket, index) => ({ id: ticket.id, receipt: results[index], pinReceipt: pinReceipts[index] })))}. Extract branch names only from host preservation notes, verify the refs and changes, and merge sequentially into the designated integration checkout. check each ticket's pinned acceptance checks against its branch before merging it: python3 <team-review skill directory>/scripts/review_snapshot.py --repo . --verify-pins <pinReceipt> --ref <branch>. A ticket whose pinned checks changed or went missing is not merged: list those paths in pinMismatch and report blocked. A no-change receipt needs verification against the ticket. Do not accept a partial/blocked implementation. Resolve conflicts only from spec ${JSON.stringify(args.spec)} and tests; stop without discarding state if unresolved. Run ${JSON.stringify(args.validationCommand)} on the combined result and report integrated only if it passes. Do not push or update remote tickets.`, {
    agentType: "integrator", label: `integrate:${ready.map(ticket => ticket.id).join(",")}`, schema: integrationSchema, gate: args.validationCommand,
  });
  const expected = new Set(ready.map(ticket => ticket.id));
  if (!integration || integration.status !== "integrated" || !/^[a-f0-9]{40,64}$/.test(integration.head)
      || !Array.isArray(integration.tickets) || integration.tickets.length !== expected.size
      || new Set(integration.tickets).size !== expected.size || integration.tickets.some(id => !expected.has(id))
      || !Array.isArray(integration.pinMismatch) || integration.pinMismatch.length) {
    throw new Error(`Integration incomplete; dependent tickets remain blocked. Preserve branches and inspect checkout: ${JSON.stringify(integration)}`);
  }
  integrations.push(integration);
  for (const ticket of ready) completed.add(ticket.id);
}
return { status: "integrated", branch: args.integrationBranch, head: integrations[integrations.length - 1].head, tickets: [...completed], integrations, reviewRequired: true,
  // The test harness runs this body without the runtime's `budget` global.
  usage: { outputTokens: typeof budget === "undefined" ? null : budget.spent() } };
