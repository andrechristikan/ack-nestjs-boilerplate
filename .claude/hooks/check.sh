#!/usr/bin/env bash
# Harness check, run by ack-harness and by reviewer at Depth harness, never as a hook. Prints one line per defect and
# exits 1 when it printed any: JSON, hook syntax and exec bits, the roster and Jev off blocks, frontmatter, word budgets
# (.claude/rules/authoring.md, Harness files), all-caps emphasis, retired names, cited paths, and the copied-skill lock.
# Copied skills (skills-lock.json) are checked for presence only: their text is not ours to hold to these rules.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$root" || exit 1
fail=0
bad() { echo "$1"; fail=1; }

for f in .claude/settings.json .claude/hooks/*.json skills-lock.json; do
    jq . "$f" >/dev/null 2>&1 || bad "$f: not valid JSON"
done

for f in .claude/hooks/*.sh; do
    bash -n "$f" 2>/dev/null || bad "$f: bash -n fails"
    [ -x "$f" ] || bad "$f: not executable"
done

echo '{}' | bash .claude/hooks/roster.sh | jq -e '.systemMessage | contains("/ack-design")' >/dev/null 2>&1 \
    || bad ".claude/hooks/roster.sh: no roster with /ack-design"
printf '{"request":"x","location":"src/modules/user"}' | env -u TYPESAFE_API_KEY bash .claude/hooks/jev.sh level | grep -q '^off ' \
    || bad ".claude/hooks/jev.sh: level without a key does not print an off block"

python3 - <<'PY' || fail=1
import glob, json, os, re, sys

out = []
copied = set(json.load(open('skills-lock.json')).get('skills', {}))
skills = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob('.claude/skills/*/SKILL.md'))

for name in sorted(copied):
    if name not in skills:
        out.append(f'skills-lock.json: {name} has no .claude/skills/{name}/SKILL.md')
for name in skills:
    if name not in copied and not name.startswith('ack-'):
        out.append(f'.claude/skills/{name}: neither an ack-* skill nor in skills-lock.json')

budgets = [('.claude/CLAUDE.md', 1400), ('AGENTS.md', 700), ('.github/copilot-instructions.md', 450)]
budgets += [(p, 1200) for p in glob.glob('.claude/rules/*.md')]
budgets += [(p, 900) for p in glob.glob('.claude/agents/*.md')]
budgets += [(p, 1300) for p in glob.glob('.claude/skills/ack-*/SKILL.md')]
budgets += [(p, 1000) for p in glob.glob('.claude/skills/ack-*/references/*.md')]
ours = [p for p, _ in budgets] + glob.glob('.claude/hooks/*')

for path, limit in sorted(budgets):
    words = len(open(path, encoding='utf-8').read().split())
    if words > limit:
        out.append(f'{path}: {words} words, budget {limit}')

for path in glob.glob('.claude/agents/*.md') + glob.glob('.claude/skills/ack-*/SKILL.md'):
    text = open(path, encoding='utf-8').read()
    if not text.startswith('---\n'):
        out.append(f'{path}: frontmatter does not open on line 1')
    elif not re.search(r'^description: >-$', text.split('---')[1], re.M):
        out.append(f'{path}: description is not a folded >- scalar')
for path in glob.glob('.claude/agents/*.md'):
    head = open(path, encoding='utf-8').read().split('---')[1]
    m = re.search(r'^skills:[ \t]*(.+)$', head, re.M)
    for s in (m.group(1).split(',') if m else []):
        if s.strip() not in skills:
            out.append(f'{path}: preloads {s.strip()}, which is not under .claude/skills/')

shout = re.compile('|'.join(['NEV' + 'ER', 'ALW' + 'AYS', 'MU' + 'ST', 'HA' + 'RD']))
retired = re.compile('|'.join([
    'ack-' + 'work', 'super' + 'powers', r'`explor' + 'er`', r'`plann' + 'er`',
    r'Agent: (explor' + 'er|plann' + 'er|harn' + 'ess)', r'jev\.sh (rou' + 'te|follow' + 'up)', 'caveman' + ':cave',
]))
cited = re.compile(r'(?<![\w/.-])((?:\.claude|\.github|docs|scripts|ci)/[\w./-]+\.(?:md|sh|json|ya?ml|ts|mjs))')

for path in sorted(set(ours)):
    for n, line in enumerate(open(path, encoding='utf-8').read().splitlines(), 1):
        if shout.search(line):
            out.append(f'{path}:{n}: all-caps emphasis')
        if retired.search(line):
            out.append(f'{path}:{n}: names a retired skill, agent, or mode')
        if path.endswith('.md'):
            for ref in cited.findall(line):
                # settings.local.json is the owner's, gitignored, and absent from a fresh clone
                if not os.path.exists(ref) and not ref.endswith('.local.json'):
                    out.append(f'{path}:{n}: cites {ref}, which does not exist')

print('\n'.join(out), end='\n' if out else '')
sys.exit(1 if out else 0)
PY

exit "$fail"
