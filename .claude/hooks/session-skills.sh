#!/usr/bin/env bash
# SessionStart hook: print the project's skill roster to the terminal.
# systemMessage is the only field that reaches the terminal as a plain notice — stdout on
# exit 0 goes to the model, and a non-zero exit prints stderr under an "error" heading.
# The list is derived from .claude/skills/*/SKILL.md so it can never go stale.

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
dir="$root/.claude/skills"
[ -d "$dir" ] || exit 0

python3 - "$dir" <<'PY'
import json, os, re, sys

dir_ = sys.argv[1]
rows = []
for name in sorted(os.listdir(dir_)):
    f = os.path.join(dir_, name, 'SKILL.md')
    if not os.path.isfile(f):
        continue
    head = open(f).read().split('---')[1]
    m = re.search(r'^description:\s*(.+)$', head, re.M)
    if not m:
        continue
    # first clause only — up to an em dash or the first sentence end
    blurb = re.split(r'\s+—\s+|(?<=[a-z])\.\s+', m.group(1).strip())[0]
    if len(blurb) > 60:                      # cut on a word boundary, never mid-word
        blurb = blurb[:60].rsplit(' ', 1)[0] + '…'
    rows.append((name, blurb))

if not rows:
    sys.exit(0)

w = max(len(n) for n, _ in rows)
lines = ['Project skills — owner-invoked only, type the name', '']
lines += [f'  /{n.ljust(w)}  {b}' for n, b in rows]
lines += ['', '  Nothing chains automatically. Each skill ends with a Next section.']

print(json.dumps({'systemMessage': '\n'.join(lines)}))
PY
