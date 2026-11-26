#!/usr/bin/env bash
# Harness check, run by ack-harness, the harness agent, and reader, never as a hook. Prints one line per defect and
# exits 1 when it printed any: JSON, hook syntax and exec bits, the roster and Jev off blocks, frontmatter, word budgets, the Copilot
# digest's character limit, the path-scoped rules binding one src file (.claude/rules/harness.md), all-caps emphasis, retired names, cited paths, and the copied-skill lock.
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
printf 'x' | env JEV_ROUTER_ENABLED=false bash .claude/hooks/jev.sh decision .claude/hooks/jev.json | grep -qx 'owner (off).' \
    || bad ".claude/hooks/jev.sh: decision with JEV_ROUTER_ENABLED=false does not print owner (off)."

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

budgets = [('.claude/CLAUDE.md', 1200), ('AGENTS.md', 1000), ('.github/copilot-instructions.md', 500)]
budgets += [(p, 1200) for p in glob.glob('.claude/rules/*.md')]
budgets += [(p, 900) for p in glob.glob('.claude/agents/*.md')]
budgets += [(p, 1300) for p in glob.glob('.claude/skills/ack-*/SKILL.md')]
budgets += [(p, 1000) for p in glob.glob('.claude/skills/ack-*/references/*.md')]
ours = [p for p, _ in budgets] + glob.glob('.claude/hooks/*')

for path, limit in sorted(budgets):
    words = len(open(path, encoding='utf-8').read().split())
    if words > limit:
        out.append(f'{path}: {words} words, budget {limit}')
# A Copilot code review reads the first 4000 characters of the digest (.claude/rules/harness.md).
chars = len(open('.github/copilot-instructions.md', 'rb').read())
if chars >= 4000:
    out.append(f'.github/copilot-instructions.md: {chars} characters, budget under 4000')

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
    'ack-' + 'work', 'ack-' + 'debug', 'super' + 'powers', r'`explor' + 'er`', r'`plann' + 'er`',
    r'Agent: (explor' + 'er|plann' + 'er)', r'jev\.sh (rou' + 'te|follow' + 'up|lev' + 'el)', 'caveman' + ':cave',
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

# One src file is bound by at most 16 path-scoped rules and 11000 words of them (.claude/rules/harness.md).
import fnmatch, subprocess

def seg_match(pat, segs):
    if not pat:
        return not segs
    if pat[0] == '**':
        return any(seg_match(pat[1:], segs[i:]) for i in range(len(segs) + 1))
    return bool(segs) and fnmatch.fnmatchcase(segs[0], pat[0]) and seg_match(pat[1:], segs[1:])

def glob_match(g, path):
    if '/' not in g:
        return fnmatch.fnmatchcase(os.path.basename(path), g)
    return seg_match(g.split('/'), path.split('/'))

scoped = []
for rule in sorted(glob.glob('.claude/rules/*.md')):
    text = open(rule, encoding='utf-8').read()
    head = text.split('---')[1] if text.startswith('---\n') else ''
    head = head.split('paths:', 1)[1] if 'paths:' in head else ''
    globs = [m.strip('"\'') for m in re.findall(r'^\s+-\s+(.+?)\s*$', head, re.M)]
    if globs:
        scoped.append((rule, globs, len(text.split())))
tracked = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', 'src'], capture_output=True, text=True).stdout.split('\n')
for f in tracked:
    if not f.endswith('.ts'):
        continue
    bound = [(rule, words) for rule, globs, words in scoped if any(glob_match(g, f) for g in globs)]
    total = sum(words for _, words in bound)
    if len(bound) > 16 or total > 11000:
        out.append(f'{f}: {len(bound)} scoped rules, {total} words, budget 16 rules / 11000 words')

print('\n'.join(out), end='\n' if out else '')
sys.exit(1 if out else 0)
PY

exit "$fail"
