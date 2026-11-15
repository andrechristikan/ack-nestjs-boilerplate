# Discipline

Binds every change in this repository: the session, every agent, every skill. A trivial task applies it with judgment. Where a more specific rule speaks (`null-safety.md`, `exceptions.md`, `code-style.md`, `testing.md`), it wins.

## The smallest complete change

Follow `.claude/skills/ponytail/SKILL.md`. The level is `full` unless a skill or an agent file names another. Where it and a rule differ, the rule wins:

- Behaviour changes test-first with a unit spec (`testing.md`); its one-small-test clause does not replace that.
- A shape change changes every call site (`AGENTS.md`): those lines are in scope.
- No error handling for a case the types and guards already exclude; the failures `null-safety.md` and `exceptions.md` name are not such a case.
- Duplication beats the wrong abstraction (`code-style.md`).

## Ask before guessing

- State the assumption you act on before you implement.
- When two readings would produce different work, present both and ask; an agent stops and hands the question back.
- Push back when the request would break a rule.

## Boilerplate stance

- Best practice decides the shape, over the smaller diff (`AGENTS.md`: no compatibility path).

## Normal use

- Judge a scenario by what a person normally does. No code, branch, spec, review finding, or sweep row exists for a case only deliberate hacking with tools reaches (scripted brute force), or a case normal human use almost never reaches (two requests landing in one millisecond window).
- Existing guards, authentication, password handling, validation, and rate limits stay: the bullet above binds new work and removes none of them.
- In the auth area and in ASVS chapters V1 to V5 (encoding, validation, frontend headers, API, files), the reference is OWASP ASVS 5.0 level 2: a control it requires is in scope even when only an attacker reaches its case.

## Surgical changes

- Every changed line traces to the requirement.
- Leave adjacent code, comments, and formatting alone, and match the style around the change.
- Remove the imports, variables, and functions your change made unused.
- Pre-existing dead code is one line in the hand-back, not a deletion.

## Checks

- Turn the request into a check before writing: a failing spec for new behaviour or a bug, specs green before and after a refactor.
- Done means the checks ran and their decisive output is quoted.
- A generated file is no check: `generated/swagger.json`, rewritten at every boot (`http.md`), gets no count, diff, or acceptance line in a spec, a ticket, a dispatch, or a review.

## Enforcement

- `bash .claude/hooks/rules.sh` prints this rule for every path, so a dispatch's `Rules to read:`, pasted from that output, carries it.
- `reviewer` reports a breach as a finding at `task` and `review`: a line that traces to nothing, a speculative abstraction or option, error handling for an excluded case, code or a spec for a case normal use does not reach, a check not run.
- The `Stop` hook runs `pnpm typecheck` and the unit suite after any `src/` or `test/` change.
