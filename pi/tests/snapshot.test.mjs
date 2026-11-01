import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const script = fileURLToPath(new URL("../scripts/review_snapshot.py", import.meta.url));
function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "pi-team-git-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", ["-C", directory, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main"); git("config", "user.name", "Test"); git("config", "user.email", "test@example.invalid");
  writeFileSync(path.join(directory, "tracked.txt"), "base\n"); git("add", "."); git("commit", "-m", "Initial fixture");
  return { directory, git };
}
function snapshot(t, directory, ...args) {
  const result = JSON.parse(execFileSync("python3", [script, "--repo", directory, ...args], { encoding: "utf8" }));
  t.after(() => rmSync(path.dirname(result.snapshot), { recursive: true, force: true })); return result;
}
test("working snapshot includes staged/unstaged changes and omits untracked secrets", t => {
  const { directory, git } = fixture(t);
  writeFileSync(path.join(directory, "tracked.txt"), "staged\n"); git("add", "tracked.txt");
  writeFileSync(path.join(directory, "tracked.txt"), "staged\nunstaged\n"); writeFileSync(path.join(directory, ".env.private"), "SECRET_VALUE_DO_NOT_INCLUDE\n");
  const result = snapshot(t, directory, "--working"); const diff = readFileSync(result.snapshot, "utf8");
  assert(diff.includes("+staged") && diff.includes("+unstaged")); assert(!diff.includes("SECRET_VALUE_DO_NOT_INCLUDE"));
  assert.deepEqual(result.omittedUntracked, [".env.private"]); assert.equal(statSync(result.snapshot).mode & 0o777, 0o400);
  writeFileSync(path.join(directory, "tracked.txt"), "changed again\n"); assert.equal(readFileSync(result.snapshot, "utf8"), diff);
});
test("committed snapshot uses merge-base and excludes working changes", t => {
  const { directory, git } = fixture(t); const base = git("rev-parse", "HEAD"); git("switch", "-c", "feature");
  writeFileSync(path.join(directory, "tracked.txt"), "committed\n"); git("add", "."); git("commit", "-m", "Feature fixture");
  writeFileSync(path.join(directory, "tracked.txt"), "uncommitted\n"); const result = snapshot(t, directory, "--base", "main");
  assert.equal(result.base, base); const diff = readFileSync(result.snapshot, "utf8");
  assert(diff.includes("+committed")); assert(!diff.includes("+uncommitted"));
});
test("snapshot uses the permission-modes scratch base", t => {
  const { directory } = fixture(t);
  writeFileSync(path.join(directory, "tracked.txt"), "changed\n");
  const scratch = mkdtempSync(path.join(tmpdir(), "pi-team-scratch-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const result = JSON.parse(execFileSync("python3", [script, "--repo", directory, "--working"], { encoding: "utf8", env: { ...process.env, PI_PERMISSION_TMPDIR: scratch } }));
  assert(result.snapshot.startsWith(scratch + path.sep));
});
test("empty and invalid comparisons fail", t => {
  const { directory } = fixture(t);
  for (const args of [["--working"], ["--base", "missing"], ["--base=--help"]])
    assert.throws(() => execFileSync("python3", [script, "--repo", directory, ...args], { stdio: "pipe" }), error => error.status === 1 && error.stderr.toString().includes("Cannot prepare review snapshot"));
});
