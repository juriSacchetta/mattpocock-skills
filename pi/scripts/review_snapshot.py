import argparse
import hashlib
import re
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


def pin_hashes(root, pins):
    hashes = {}
    for name in pins:
        resolved = (root / name).resolve()
        if resolved != root and root not in resolved.parents:
            raise ValueError(f"Pinned path leaves the repository: {name}")
        if not resolved.is_file():
            hashes[name] = "missing"
            continue
        hashes[name] = hashlib.sha256(resolved.read_bytes()).hexdigest()
    return hashes


def pin_hashes_at(root, ref, pins):
    hashes = {}
    for name in pins:
        try:
            blob = git(root, "cat-file", "blob", f"{ref}:{name}")
        except subprocess.CalledProcessError:
            hashes[name] = "missing"
            continue
        hashes[name] = hashlib.sha256(blob).hexdigest()
    return hashes


def verify_pins(repo, receipt_path, ref=None):
    root = Path(git(repo, "rev-parse", "--show-toplevel").decode().strip())
    try:
        receipt = json.loads(Path(receipt_path).read_text())
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Cannot read a pin receipt at {receipt_path}: {error}") from error
    pinned = receipt.get("pinned") or {}
    if not pinned:
        raise ValueError("The receipt pins no paths")
    if ref:
        git(root, "rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}")
    current = pin_hashes_at(root, ref, pinned) if ref else pin_hashes(root, pinned)
    digest_pattern = re.compile(r"[a-f0-9]{64}")
    unpinnable = sorted(name for name, digest in pinned.items() if not digest_pattern.fullmatch(digest))
    return {
        "ok": current == pinned and not unpinnable,
        "receipt": str(receipt_path),
        "ref": ref,
        "headWhenPinned": receipt.get("head"),
        "unpinnable": unpinnable,
        "changed": sorted(name for name, digest in pinned.items() if current.get(name) != digest),
        "missing": sorted(name for name, digest in current.items() if digest == "missing"),
        "pinned": pinned,
        "current": current,
    }


def snapshot(repo, base=None, working=False, pins=()):
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
    if pins:
        receipt["pinned"] = pin_hashes(root, pins)
    (directory / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--base")
    mode.add_argument("--working", action="store_true")
    mode.add_argument("--verify-pins", metavar="RECEIPT")
    parser.add_argument("--pin", action="append", default=[], metavar="PATH")
    parser.add_argument("--ref", metavar="REF")
    args = parser.parse_args()
    try:
        if args.verify_pins:
            if args.pin:
                raise ValueError("--pin belongs to a snapshot, not to --verify-pins")
            result = verify_pins(args.repo, args.verify_pins, args.ref)
            print(json.dumps(result))
            if not result["ok"]:
                parser.exit(1)
            return
        if args.ref:
            raise ValueError("--ref belongs to --verify-pins")
        print(json.dumps(snapshot(args.repo, args.base, args.working, args.pin)))
    except (ValueError, RuntimeError, subprocess.CalledProcessError, OSError, json.JSONDecodeError) as error:
        parser.exit(1, f"Cannot prepare review snapshot: {error}\n")


if __name__ == "__main__":
    main()
