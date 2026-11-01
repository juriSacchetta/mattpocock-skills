import { appendFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Mirrors the permission-modes scratch base, so the ledger lands where bash and file tools may write.
const scratch = process.env.PI_PERMISSION_TMPDIR?.trim()
  || (process.platform === "win32" ? path.join(tmpdir(), "pi") : "/tmp/pi");
const ledgerDirectory = path.join(scratch, "team-usage");

type Spend = { messages: number; output: number; cost: number };
type UsageEvent = { id?: string; type?: string; model?: string; depth?: number; workflowId?: string;
  usage?: { output?: number; cost?: { total?: number } } };
const round = new Map<string, Spend>();
const session = new Map<string, Spend>();
let topLevel: boolean | undefined;

function add(target: Map<string, Spend>, role: string, output: number, cost: number): void {
  const spend = target.get(role) ?? { messages: 0, output: 0, cost: 0 };
  spend.messages += 1;
  spend.output += output;
  spend.cost += cost;
  target.set(role, spend);
}

function summarise(spend: Map<string, Spend>): string {
  return [...spend.entries()]
    .sort((left, right) => right[1].cost - left[1].cost)
    .map(([role, value]) => `${role} $${value.cost.toFixed(4)} (${value.output} out, ${value.messages} msg)`)
    .join(" · ");
}

function record(entry: Record<string, unknown>): void {
  try {
    mkdirSync(ledgerDirectory, { recursive: true, mode: 0o700 });
    const name = `${new Date().toISOString().slice(0, 10)}.jsonl`;
    appendFileSync(path.join(ledgerDirectory, name), `${JSON.stringify({ ts: new Date().toISOString(), pid: process.pid, ...entry })}\n`);
  } catch {
    // A ledger that cannot be written must never disturb a session.
  }
}

export default function (pi: ExtensionAPI) {
  const bus = pi.events;
  if (!bus?.on) return;

  pi.on("before_agent_start", event => {
    if (topLevel === undefined) topLevel = !event.systemPrompt.includes("<active_agent");
    return undefined;
  });

  bus.on("subagents:usage", (payload: unknown) => {
    const event = payload as UsageEvent;
    const output = Number(event?.usage?.output ?? 0);
    const cost = Number(event?.usage?.cost?.total ?? 0);
    if (!output && !cost) return;
    const role = String(event?.type ?? "unknown");
    add(round, role, output, cost);
    add(session, role, output, cost);
    record({ event: "usage", role, id: event?.id, model: event?.model, depth: event?.depth, workflowId: event?.workflowId, output, cost });
  });

  pi.on("agent_settled", (_event, ctx) => {
    if (!round.size || topLevel !== true) return;
    record({ event: "round", summary: summarise(round) });
    try {
      ctx?.ui?.notify(`Team spend this round — ${summarise(round)}`, "info");
    } catch {
      // A missing UI is not a reason to drop the ledger record.
    }
    round.clear();
  });

  let lastSummary = "";
  const flush = () => {
    if (!session.size) return;
    const summary = summarise(session);
    if (summary === lastSummary) return;
    lastSummary = summary;
    record({ event: "session", summary });
  };
  pi.on("session_shutdown", flush);
  bus.on("subagents:disposed", flush);
}
