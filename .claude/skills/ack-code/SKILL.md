---
name: ack-code
description: >-
  Builds or repairs src/ behaviour test-first through explorer, coder, reviewer and writer,
  seeds and the run surface included, with a superpowers spec and plan when the work is
  still open. Use when the owner wants application code changed, a seed written, or work
  on the checkout judged. Not for specs over code that exists (ack-spec), docs (ack-doc),
  pull requests (ack-pr), or the harness (ack-harness).
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: "<settled requirement, pinned or open, with the answers from the interrogation>"
---

!`git status --short`
!`git diff --name-only HEAD`

# ack-code

You orchestrate; agents do the work. `coder` writes `src/` and `test/`. You dispatch, read
what comes back, and report. A change under `.claude/**` lands first through `/ack-harness`,
before any `src/` work; code is written against the rule as it stands after that.
If a `superpowers:*` skill is not installed, stop and say
`claude plugin install superpowers@claude-plugins-official`.

## Pinned or open

- Pinned: the files, the cause at `file:line` or the behaviour fully stated, the change,
  and no open product question are all in hand. A pinned repair runs steps 1, 4, 5, 6, 7, 8.
- Open: a symptom without a cause, a third-party contract this repository cannot answer,
  or a shape with more than one reading. Open work runs every step.
- Judge only: nothing to build. Name the paths, then run steps 5, 6, 8. The verdict is
  PASS when every check in step 6 is green and the reviewer reported no finding; else FAIL.

## 1. Interrogate, in the session

This step runs before the fork: the session asks with `AskUserQuestion` and passes the
answers as the argument. Ask about edge cases, failure paths, what is out of scope, which
route scope the change lands under, whether docs update at the end, and which review depth
to run (`rules and boot` or `end to end`). When the request is a symptom, pin the input,
the observed result, the expected result, and where it surfaces. Do not re-ask what the
owner named. State the settled requirement back in one paragraph.

## 2. Explore, through `explorer` (open work only)

Dispatch `explorer` with the settled requirement (`references/dispatch.md`, Explorer). It
locates code, reads a third-party contract, and assesses approaches. Its open questions go
back to the session in the hand-back; do not guess an answer. Skip this step when the
session already holds the location table and no contract is unknown.

## 3. Spec and plan (open work only)

Invoke `superpowers:brainstorming` with the settled requirement and the explorer's location
table; output directory `.superpowers/`. A bounded change stops at a design the owner
approved in chat; an architectural one produces `.superpowers/<date>-<slug>-spec.md`.
Then invoke `superpowers:writing-plans` on the approved spec; output
`.superpowers/<date>-<slug>-plan.md`. Each task in the plan carries `Complexity: simple`
or `Complexity: complex`. The owner approves the plan before step 4.

## 4. Build, through `coder`

Follow `superpowers:subagent-driven-development`: one fresh `coder` per plan task, in
order, one at a time. Dispatch template: `references/dispatch.md`, Coder. Pass
`model: opus` on the Agent call when the plan marks the task complex; otherwise the
agent's own model applies. A pinned repair is one dispatch carrying the pin instead of a
plan path. `coder` writes the failing spec, watches it fail, implements, runs
`pnpm typecheck` and `pnpm test <module>`, then repairs the run surface the change made
stale. A schema delta is `coder`'s edit and the owner's push: relay the model, the field,
the index, the data consequence, and `pnpm db:migrate`. A `NEEDS_CONTEXT` or `BLOCKED`
hand-back goes to the session as an open question; do not fix it here.

## 5. Review, through `reviewer`

Dispatch `reviewer` at the depth chosen in step 1 (`references/dispatch.md`, Reviewer).
Findings go back to `coder` in one fix dispatch, then one scoped re-review. What stays
open after that round is an open item in the hand-back.

## 6. Verify

Invoke `superpowers:verification-before-completion`, then run and read each:

```bash
pnpm typecheck
pnpm lint
pnpm deadcode
pnpm spell
pnpm test <module>
```

`<module>` is a path filter naming each module the work changed; a module only read is
out of scope. How to read `deadcode`, `spell`, and a scoped `test:cov`: `.claude/CLAUDE.md`
Gotchas. A coverage gap beyond the TDD specs is named with file and lines; closing it is
`/ack-spec`.

## 7. Docs, through `writer`

When step 1 answered yes, dispatch `writer` with the docs the behaviour touches
(`references/dispatch.md`, Writer). A conflict between a doc and the code comes back
unresolved and goes to the owner.

## 8. Finish

Invoke `superpowers:finishing-a-development-branch`. It runs the full suite and presents
the integration menu; the choice is the owner's. Propose the commit subject
(`<type>(<scope>): <description>`, `.commitlintrc`) and stop. Commits, staging, and pushes
go through `ask`.

## Hand back

The settled requirement; pinned or open; spec and plan paths; the schema delta the owner
applies; per task, what `coder` produced and the decisive test line; every run-surface file
checked and whether it changed; every status code allocated; every reviewer finding and its
state; the output of the five checks; the docs answer and what `writer` changed; the
proposed commit subject; the verdict when the run was a judge pass; one line per thing
noticed outside the scope.

## Next

`/ack-spec` for a coverage gap beyond the TDD specs or a suite that is wrong against the
code. `/ack-doc` when docs were declined here and are wanted later. `/ack-pr` once the
branch is settled.
