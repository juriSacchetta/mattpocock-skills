import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def scratch_base():
    """Mirror pi-permission-modes' shared scratch base: a reviewer reads the snapshot only from it."""
    override = os.environ.get("PI_PERMISSION_TMPDIR", "").strip()
    if override:
        return Path(override)
    return Path(tempfile.gettempdir()) / "pi" if sys.platform == "win32" else Path("/tmp/pi")


def git(repo, *arguments):
    result = subprocess.run(
        ["git", "-C", str(repo), *arguments], capture_output=True, check=True
    )
    return result.stdout


def snapshot(repo, base=None, working=False):
    if working == (base is not None):
        raise ValueError("Choose exactly one of base or working")
    root = Path(git(repo, "rev-parse", "--show-toplevel").decode().strip())
    head = git(root, "rev-parse", "--verify", "HEAD^{commit}").decode().strip()
    baseline = head if working else git(
        root, "rev-parse", "--verify", "--end-of-options", f"{base}^{{commit}}"
    ).decode().strip()
    if not working:
        baseline = git(root, "merge-base", baseline, head).decode().strip()
    arguments = ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "--binary", baseline]
    if not working:
        arguments.append(head)
    diff = git(root, *arguments, "--")
    if not diff:
        raise ValueError("The selected tracked diff is empty")
    untracked = git(root, "ls-files", "--others", "--exclude-standard", "-z")
    if git(root, "rev-parse", "HEAD").decode().strip() != head:
        raise RuntimeError("HEAD changed while preparing the review snapshot")
    shared_scratch = scratch_base()
    shared_scratch.mkdir(mode=0o700, exist_ok=True)
    directory = Path(tempfile.mkdtemp(prefix="team-review-", dir=shared_scratch))
    diff_path = directory / "changes.diff"
    diff_path.write_bytes(diff)
    diff_path.chmod(0o400)
    receipt = {
        "repo": str(root), "head": head, "base": baseline,
        "mode": "working" if working else "committed",
        "snapshot": str(diff_path), "sha256": hashlib.sha256(diff).hexdigest(),
        "omittedUntracked": [name.decode(errors="surrogateescape") for name in untracked.split(b"\0") if name],
    }
    (directory / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--base")
    mode.add_argument("--working", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(snapshot(args.repo, args.base, args.working)))
    except (ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Cannot prepare review snapshot: {error}\n")


if __name__ == "__main__":
    main()
