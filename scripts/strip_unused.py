#!/usr/bin/env python3
import re, sys, subprocess, os

ROOT = "/workspace/0c85e0dc-1244-40ab-8f84-e11668f857da/sessions/agent_15f91b44-0b4f-410f-b6ee-0147d1df8992"
SRC = os.path.join(ROOT, "src")

# 1. Run tsc to capture unused-import errors (TS6133)
res = subprocess.run(
    ["npx", "tsc", "-p", "tsconfig.app.json", "--noEmit"],
    cwd=ROOT, capture_output=True, text=True
)
log = res.stdout + res.stderr

# Parse: path(line,col): error TS6133: 'NAME' is declared but its value is never read.
pat = re.compile(r"^(.*?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read\.$", re.M)
by_file = {}
for m in pat.finditer(log):
    path = m.group(1)
    if not path.startswith("src/"):
        continue
    by_file.setdefault(path, set()).add(m.group(4))

import_re = re.compile(
    r"import\s+(type\s+)?(.*?)\s+from\s+['\"]([^'\"]+)['\"]",
    re.S,
)

def strip_unused_in_file(relpath, unused):
    full = os.path.join(ROOT, relpath)
    with open(full, "r", encoding="utf-8") as f:
        text = f.read()
    blocks = []
    for m in import_re.finditer(text):
        blocks.append((m.start(), m.end(), m.group(0), m.group(1), m.group(2)))
    new_text = text
    for start, end, block, type_kw, bindings in reversed(blocks):
        default_name = None
        named = []
        nb = re.search(r"\{(.*)\}", bindings, re.S)
        before = bindings[: nb.start()].strip().rstrip(",").strip() if nb else bindings.strip()
        if before and before != "type":
            default_name = before
        if nb:
            inner = nb.group(1)
            parts = [p for p in re.split(r",", inner) if p.strip()]
            for p in parts:
                p = p.strip()
                if not p:
                    continue
                mm = re.match(r"^(.+?)\s+as\s+(.+)$", p)
                if mm:
                    named.append((mm.group(2).strip(), p))
                else:
                    named.append((p, p))
        remove_default = default_name in unused
        remove_named = {loc: fulltxt for (loc, fulltxt) in named if loc in unused}
        if not remove_default and not remove_named:
            continue
        new_before = "" if remove_default else before
        new_named = [ft for (loc, ft) in named if loc not in remove_named]
        new_bindings = new_before
        if new_named:
            if new_bindings:
                new_bindings += ", "
            new_bindings += "{ " + ", ".join(new_named) + " }"
        if not new_bindings.strip():
            new_block = ""
        else:
            prefix = "import type " if type_kw else "import "
            spec = re.search(r"from\s+['\"]([^'\"]+)['\"]", block).group(1)
            new_block = f"{prefix}{new_bindings} from '{spec}'"
        new_text = new_text[:start] + new_block + new_text[end:]
    if new_text != text:
        with open(full, "w", encoding="utf-8") as f:
            f.write(new_text)
        return True
    return False

changed = 0
for rel, unused in by_file.items():
    if strip_unused_in_file(rel, unused):
        changed += 1
print(f"Processed {len(by_file)} files with unused imports; rewrote {changed}.")
