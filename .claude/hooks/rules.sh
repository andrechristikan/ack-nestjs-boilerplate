#!/usr/bin/env bash
# Run by hand, not registered in .claude/settings.json: bash .claude/hooks/rules.sh <path>...
# Prints the rule files that bind the given paths, one per line, sorted and unique: the four unscoped
# rules always, plus every .claude/rules/*.md whose frontmatter paths: list has a glob matching a path.
# Globs: ** spans any number of segments (zero included); * and ? stay inside one segment; a pattern
# without / matches the basename at any depth. A directory argument matches when any file under it
# (git ls-files, tracked and untracked, ignored excluded) matches. Paths are repository-relative or absolute.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

python3 - "$root" "$@" <<'PY'
import fnmatch, os, re, subprocess, sys

root = os.path.realpath(sys.argv[1])
args = sys.argv[2:]
rules_dir = os.path.join(root, '.claude', 'rules')
unscoped = ['layering.md', 'cross-module.md', 'null-safety.md', 'naming.md']


def rel(arg):
    if os.path.isabs(arg):
        p = os.path.relpath(os.path.realpath(arg), root)
    else:
        p = os.path.normpath(arg)
    return None if p == '..' or p.startswith('../') else p


def files_for(path):
    if not os.path.isdir(os.path.join(root, path)):
        return [path]
    out = subprocess.run(
        ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '--', path],
        cwd=root, capture_output=True, text=True,
    ).stdout
    return [line for line in out.splitlines() if line]


def seg_match(pat, segs):
    if not pat:
        return not segs
    if pat[0] == '**':
        return any(seg_match(pat[1:], segs[i:]) for i in range(len(segs) + 1))
    return bool(segs) and fnmatch.fnmatchcase(segs[0], pat[0]) and seg_match(pat[1:], segs[1:])


def glob_match(glob, path):
    if '/' not in glob:
        return fnmatch.fnmatchcase(os.path.basename(path), glob)
    return seg_match(glob.split('/'), path.split('/'))


def globs_of(text):
    lines = text.split('\n')
    if not lines or lines[0].strip() != '---':
        return []
    globs, inside = [], False
    for line in lines[1:]:
        if line.strip() == '---':
            break
        if re.match(r'^paths:\s*$', line):
            inside = True
            continue
        item = re.match(r'^\s+-\s+(.+?)\s*$', line)
        if inside and item:
            globs.append(item.group(1).strip('"\''))
        elif inside and line.strip():
            inside = False
    return globs


paths = []
for arg in args:
    p = rel(arg)
    if p is not None:
        paths.extend(files_for(p))

picked = {os.path.join('.claude', 'rules', name) for name in unscoped}
for name in sorted(os.listdir(rules_dir)):
    if not name.endswith('.md') or name in unscoped:
        continue
    globs = globs_of(open(os.path.join(rules_dir, name)).read())
    if any(glob_match(g, p) for g in globs for p in paths):
        picked.add(os.path.join('.claude', 'rules', name))

for line in sorted(picked):
    print(line)
PY
exit 0
