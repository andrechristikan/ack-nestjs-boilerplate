#!/usr/bin/env bash
# SessionStart startup|clear: print the ack-* skill roster to the terminal.
# systemMessage is the field that reaches the terminal as a plain notice; it opens with a newline because the terminal prints its hook prefix on the first line.
# One line per .claude/skills/ack-*/SKILL.md: its frontmatter blurb, else the first sentence of description.
# The flow comes first (ack-design, ack-plan, ack-harness, ack-build, ack-review, ack-doc, ack-pr), the rest alphabetical; copied skills are not listed, and skills with user-invocable: false are skipped.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
dir="$root/.claude/skills"
[ -d "$dir" ] || exit 0

python3 - "$dir" <<'PY'
import json, os, re, sys

dir_ = sys.argv[1]
flow = ['ack-design', 'ack-plan', 'ack-harness', 'ack-build', 'ack-review', 'ack-doc', 'ack-pr']
names = [n for n in os.listdir(dir_) if n.startswith('ack-')]
rows = []
for name in sorted(names, key=lambda n: (flow.index(n) if n in flow else len(flow), n)):
    f = os.path.join(dir_, name, 'SKILL.md')
    if not os.path.isfile(f):
        continue
    parts = open(f).read().split('---')
    if len(parts) < 3:
        continue
    head = parts[1]
    if re.search(r'^user-invocable:[ \t]*false[ \t]*$', head, re.M):
        continue
    m = re.search(r'^blurb:[ \t]*(.+?)[ \t]*$', head, re.M)
    if m:
        blurb = m.group(1)
        if len(blurb) >= 2 and blurb[0] == blurb[-1] and blurb[0] in '\'"':
            blurb = blurb[1:-1]
    else:
        m = re.search(r'^description:[ \t]*(?:[>|][-+]?[ \t]*\n((?:[ \t]+.*(?:\n|$))+)|(.+)$)', head, re.M)
        if not m:
            continue
        text = ' '.join(line.strip() for line in (m.group(1) or m.group(2)).splitlines() if line.strip())
        blurb = re.split(r'\s+—\s+|(?<=[a-z])\.\s+', text)[0]
    rows.append((name, blurb))

if not rows:
    sys.exit(0)

w = max(len(n) for n, _ in rows)
lines = [f'  /{n.ljust(w)}  {b}' for n, b in rows]

print(json.dumps({'systemMessage': '\n' + '\n'.join(lines)}))
PY
