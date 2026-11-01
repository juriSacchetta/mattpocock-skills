export const meta = {
  name: "team-review",
  description: "Independent Standards and Spec reviews of one frozen diff",
  phases: [{ title: "Review" }],
};

if (!args || typeof args.snapshot !== "string" || !args.snapshot.trim()) {
  throw new Error("snapshot must name the frozen diff file");
}
if (args.spec != null && (typeof args.spec !== "string" || !args.spec.trim())) {
  throw new Error("spec must be a path or null");
}
if (args.knownFindings != null && (!Array.isArray(args.knownFindings) || args.knownFindings.some(key => typeof key !== "string" || !key.trim()))) {
  throw new Error("knownFindings must be an array of path:line keys from earlier rounds");
}
const schema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["pass", "findings", "blocked"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          line: { type: "integer", minimum: 0 },
          reason: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["path", "line", "reason", "evidence"],
        additionalProperties: false,
      },
    },
    limitation: { type: "string" },
  },
  required: ["status", "findings", "limitation"],
  additionalProperties: false,
};
const context = JSON.stringify({ snapshot: args.snapshot, repo: args.repo, spec: args.spec, standards: args.standards });
const jobs = [
  () => agent(`Review this frozen diff on the Standards axis. Read the named snapshot, then relevant project standards and code. Report bugs and documented-standard violations with evidence; distinguish design judgements. Do not change files or delegate this same review. Input: ${context}`, {
    agentType: "standards-reviewer", label: "standards", schema,
  }),
];
if (args.spec) {
  jobs.push(() => agent(`Independently review this frozen diff against the supplied spec. Cite missing, incorrect or unrequested behavior against specific requirements. Do not change files or delegate this same review. Input: ${context}`, {
    agentType: "spec-reviewer", label: "spec", schema,
  }));
}
phase("Review");
const results = await parallel(jobs);
for (let index = 0; index < results.length; index++) {
  const result = results[index];
  if (!result) throw new Error(`Review axis ${index === 0 ? "Standards" : "Spec"} did not complete; inspect its terminal record`);
  if (!["pass", "findings", "blocked"].includes(result.status) || !Array.isArray(result.findings)) {
    throw new Error("Reviewer returned an invalid result");
  }
  if ((result.status === "pass" && result.findings.length) || (result.status === "findings" && !result.findings.length)) {
    throw new Error("Reviewer status contradicts its findings");
  }
}
const standards = results[0];
const spec = args.spec ? results[1] : { status: "not-applicable", findings: [], limitation: "No spec supplied" };
const location = finding => `${String(finding.path).replace(/^\.\//, "")}:${finding.line}`;
const known = new Set(args.knownFindings ?? []);
const findings = [...standards.findings, ...spec.findings].map(location);
const fresh = findings.filter(key => !known.has(key));
return {
  status: [standards, spec].some(result => result.status === "blocked") ? "blocked"
    : [standards, spec].some(result => result.status === "findings") ? "findings" : "pass",
  standards,
  spec,
  snapshot: args.snapshot,
  findingKeys: findings,
  repeatedFindingKeys: findings.filter(key => known.has(key)),
  newFindingKeys: fresh,
  converged: findings.length === 0 || (known.size > 0 && fresh.length === 0),
  // The test harness runs this body without the runtime's `budget` global.
  usage: { outputTokens: typeof budget === "undefined" ? null : budget.spent() },
};
