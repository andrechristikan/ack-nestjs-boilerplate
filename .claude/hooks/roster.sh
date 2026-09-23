#!/usr/bin/env bash
# SessionStart startup|clear: print the user-invocable skill roster to the terminal.
# systemMessage is the field that reaches the terminal as a plain notice.
# The list is derived from .claude/skills/*/SKILL.md; skills with user-invocable: false are skipped.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
dir="$root/.claude/skills"
[ -d "$dir" ] || exit 0

python3 - "$dir" <<'PY'
import json, os, re, sys, textwrap

dir_ = sys.argv[1]
rows = []
for name in sorted(os.listdir(dir_)):
    f = os.path.join(dir_, name, 'SKILL.md')
    if not os.path.isfile(f):
        continue
    parts = open(f).read().split('---')
    if len(parts) < 3:
        continue
    head = parts[1]
    if re.search(r'^user-invocable:[ \t]*false[ \t]*$', head, re.M):
        continue
    m = re.search(r'^description:[ \t]*(?:[>|][-+]?[ \t]*\n((?:[ \t]+.*(?:\n|$))+)|(.+)$)', head, re.M)
    if not m:
        continue
    text = ' '.join(line.strip() for line in (m.group(1) or m.group(2)).splitlines() if line.strip())
    blurb = re.split(r'\s+—\s+|(?<=[a-z])\.\s+', text)[0]
    rows.append((name, blurb))

if not rows:
    sys.exit(0)

w = max(len(n) for n, _ in rows)
lines = ['Project skills, type the name', '']
for n, b in rows:
    prefix = f'  /{n.ljust(w)}  '
    lines += textwrap.fill(
        b,
        width=96,
        initial_indent=prefix,
        subsequent_indent=' ' * len(prefix),
        break_long_words=False,
        break_on_hyphens=False,
    ).split('\n')
lines += ['', '  Nothing chains automatically. Each skill ends with a Next line.']

print(json.dumps({'systemMessage': '\n'.join(lines)}))
PY
