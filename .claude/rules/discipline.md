# Discipline

Binds every change in this repository: the session, every agent, every skill. These four rules bias toward caution over speed; a trivial task applies them with judgment. Where a more specific rule speaks (`null-safety.md`, `exceptions.md`, `code-style.md`), it wins.

## 1. Think before coding

State the assumption, surface the trade-off, never hide confusion.

- State the assumption you act on before you implement.
- When two readings would produce different work, present both and ask; an agent stops and hands the question back.
- When a simpler approach exists, say so, and push back when the request would break a rule.
- When something is unclear, stop and name what is unclear.

## 2. Simplicity first

The minimum code that meets the requirement, nothing speculative.

- No feature, option, or configuration the requirement does not ask for.
- No abstraction for single-use code; duplication beats the wrong abstraction (`code-style.md`).
- No error handling for a case the types and guards already exclude; the failures `null-safety.md` and `exceptions.md` name are not such a case.
- A change that could be a quarter of its size is rewritten before review. The test: would a senior engineer call it overcomplicated?
- Judge a scenario by what a person normally does. No code, branch, spec, review finding, or sweep row exists for a case only deliberate hacking with tools reaches (scripted brute force), or a case normal human use almost never reaches (two requests landing in one millisecond window).
- Existing guards, authentication, password handling, validation, and rate limits stay: the bullet above binds new work and removes none of them.

## 3. Surgical changes

Touch only what the requirement needs; clean up only your own mess.

- Every changed line traces to the requirement. A shape change still changes every call site (`AGENTS.md`): those lines trace to it.
- Leave adjacent code, comments, and formatting alone, and match the style around the change.
- Remove the imports, variables, and functions your change made unused.
- Pre-existing dead code is one line in the hand-back, not a deletion.

## 4. Goal-driven execution

Define the check first, then loop until it passes.

- Turn the request into a check before writing: a failing spec for new behaviour or a bug, specs green before and after a refactor.
- A multi-step task states its plan as steps, each with its check: `1. <step> → verify: <check>`.
- Done means the checks ran and their decisive output is quoted.

## Enforcement

- `bash .claude/hooks/rules.sh` prints this rule for every path, so a dispatch template's `Rules to read:`, pasted from that output, carries it.
- `reviewer` reports a breach as a finding at `task`, `rules and boot`, and `end to end`: a line that traces to nothing, a speculative abstraction or option, error handling for an excluded case, code or a spec for a case normal use does not reach, a check not run.
- The `Stop` hook runs `pnpm typecheck` and the unit suite after any `src/` or `test/` change.
- The rule is working when diffs carry fewer unrequested lines, fewer rewrites follow review, and questions come before implementation.
