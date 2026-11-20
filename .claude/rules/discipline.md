# Discipline

Binds every change in this repository: the session, every agent, every skill. It outranks every other rule, every skill, and every agent file: where one differs, this file wins. It changes only on the owner's word naming the change; no audit, review, design, or agent rewords it on its own. A trivial task applies it with judgment.

## Hard rules

They bind every flow and outrank the smaller diff. The rule named states each in full.

- One flow, one transaction, or one per chunk in a job that pages an unbounded collection, opened by its use case and by nothing below it: every write of a flow or a chunk commits together (`transaction.md`).
- Validation fails fast, before the transaction opens, and the write still carries its guard; each failure is a typed exception with its own status code and message (`transaction.md`, `exception-class.md`).
- A side effect, a notification and an email included, is an outbox row written in the transaction of the action that causes it. Every async process a write causes runs through the outbox, a scheduler being the one job with no row, and the enqueue comes last, after the commit, through the owning module's queue class (`effects.md`).
- A notification snapshot is read before the transaction opens (`notify.md`).
- A controller and a feature processor call a use case only, a kit processor its kit service; a use case calls any module's services (`layering.md`, Roles).
- A module is a domain: its service injects no service or util of another module on its level, a feature util serves its own module and use cases, a level imports downward only, a queue class aside, and no import cycle exists (`layering.md`, Levels; `cross-module.md`).
- Every `@db.ObjectId` field but `id` and the audit fields carries a relation (`repository.md`, Schema).
- A result is fetched by one statement, never by a first query whose rows drive a second (`repository.md`, Queries).
- MongoDB is the source of truth and the cache a side resource: every entry has a TTL, and no cache error breaks the flow (`cache.md`).
- A row a guard loaded is taken from its context, never read again (`use-case.md`, Shape).
- A status-code block never holds a gap (`exception-class.md`).
- Behaviour is built test-first (Checks).
- The code follows the rule (Boilerplate stance).

## The smallest complete change

Follow `.claude/skills/ponytail/SKILL.md`. The level is `full` unless a skill or an agent file names another. Where it and a rule differ, the rule wins:

- Behaviour changes test-first with a unit spec (Checks); its one-small-test clause does not replace that.
- A shape change changes every call site (`AGENTS.md`): those lines are in scope.
- No error handling for a case the types and guards already exclude; the failures `null-safety.md` and `exceptions.md` name are not such a case.
- Duplication beats the wrong abstraction (`code-style.md`).

## Ask before guessing

- State the assumption you act on before you implement.
- When two readings would produce different work, present both and ask; an agent stops and hands the question back.
- Push back when the request would break a rule.

## Boilerplate stance

- Best practice decides the shape, over the smaller diff (`AGENTS.md`: no compatibility path).
- Where code and a rule differ, the code changes. The number of sites written another way is no reason to reword a rule, and no audit, review, or design offers it as one; a rule changes only where it contradicts best practice or another rule.

## Normal use

- Judge a scenario by what a person normally does. No code, branch, spec, review finding, or sweep row exists for a case only deliberate hacking with tools reaches (scripted brute force), or a case normal human use almost never reaches (two requests landing in one millisecond window).
- Existing guards, authentication, password handling, validation, and rate limits stay: the bullet above binds new work and removes none of them.
- In the auth area and in ASVS chapters V1 to V5 and V10 to V16, the reference is OWASP ASVS 5.0 level 2: a control it requires is in scope even when only an attacker reaches its case.

## Surgical changes

- Every changed line traces to the requirement.
- Leave adjacent code, comments, and formatting alone, and match the style around the change.
- Remove the imports, variables, and functions your change made unused.
- Pre-existing dead code is one line in the hand-back, not a deletion.

## Checks

- Turn the request into a check before writing: a failing spec for new behaviour or a bug, specs green before and after a refactor.
- Done means the checks ran and their decisive output is quoted.
- A generated file is no check: `generated/swagger.json` gets no count, diff, or acceptance line in a spec, a ticket, a dispatch, or a review.

## Enforcement

- `bash .claude/hooks/rules.sh` prints this rule for every path, so a dispatch's `Rules to read:`, pasted from that output, carries it.
- `reviewer` reports a breach as a finding at `task` and `review`: a hard rule broken, a line that traces to nothing, a speculative abstraction or option, error handling for an excluded case, code or a spec for a case normal use does not reach, a check not run.
