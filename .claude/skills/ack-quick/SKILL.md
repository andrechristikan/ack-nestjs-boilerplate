---
name: ack-quick
description: >-
    Takes a small change or a symptom to a pin, the fix test-first through coder, and its review: a change the owner states, or a wrong result, an error, a failing or flaky spec, a boot failure, whose root cause the debugger agent finds first. Use for a small change across files or something broken. Not for a feature or a cross-module change (ack-design) or a coverage gap in code that works (ack-spec).
blurb: 'a small change or a bug: pin it, fix it test-first, review it'
disable-model-invocation: true
argument-hint: '<the change, or the symptom: input, observed result, expected result, where it surfaces>'
---

!`git status --short` !`git log --oneline -n 10`

# ack-quick

Request: $ARGUMENTS

The session pins the request with the owner and assigns. `debugger` finds a symptom's cause and fixes nothing; `coder` fixes test-first; `reviewer` judges the fix. No fix before the root cause is stated with its evidence.

## 1. Pin

The pin is `.scratch/quick/<slug>.md`, the slug kebab-case from the request. Its parts:

- Files: the files the change edits.
- Cause: the debugger's root cause at `file:line` for a symptom; the owner's request for a stated change.
- Change: the change in one sentence.
- First failing spec: the behavior the change asserts, or `none` for a change that alters no behavior (a rename).
- Decisions to honor: the entries of `.claude/decisions/` the pin's files touch (`README.md` there lists each file's scope), or none.

A change the owner states: write the pin, and ask the owner for a missing part with `AskUserQuestion`. A symptom whose cause is unknown: settle it and diagnose it as below, then write the `debugger` pin to the same path.

### Settle the symptom

- State the input, the observed result, the expected result, and where it surfaces. Ask the owner for the missing part with `AskUserQuestion`.
- A symptom only real storage can show (a rollback, a unique index, a transaction across repositories) is a hand-back: integration and e2e are held (`.claude/rules/testing.md`).

### Diagnose

Dispatch `debugger`:

```
Agent: debugger
Symptom: <input, observed result, expected result, where it surfaces>
Scope: <the modules or paths the symptom names>
Decision: <the owner's answer to a previous NEEDS_DECISION, or none>
Decisions to honor: <the entries of .claude/decisions/ the scope touches (README.md there lists each file's scope), or none>
Rules to read: <the output of bash .claude/hooks/rules.sh over the scope, pasted>
```

- `NEEDS_DECISION`: put the options to the owner with `AskUserQuestion`, then dispatch a new `debugger` with the answer in `Decision:`.
- A symptom that does not reproduce: hand back every command it tried.
- The spec is wrong and the code is right: stop with the pin and name `/ack-spec`.
- The cause is in configuration, an environment value, a container, or a dependency: stop with the evidence. The owner fixes `.env`.

## 2. Guard

1. Run `bash .claude/hooks/jev.sh guard .scratch/quick/<slug>.md`.
2. Show the owner the pin and the `<jev_guard>` block with `AskUserQuestion`: build it here, or stop and name `/ack-design`. Recommend `/ack-design` when the pin changes a flow, a transport shape, the schema, or more than one module. A block with no signals: ask without them.
3. The owner's answer decides, whatever the signals say.

## 3. Fix

Dispatch `coder`:

```
Agent: coder
Pin: <the pin's files, cause, and change>
First failing spec: <the pin's line>
Decisions to honor: <the pin's line>
```

- A `DONE` hand-back quotes the spec failing, then passing, when the pin names one.
- `BLOCKED`: put the reason to the owner with `AskUserQuestion`, write the answer into the pin file as the owner gave it, and dispatch one new `coder` on the corrected pin.
- Two dispatches that both fail, for a stated change as for a symptom: dispatch a new `debugger` with what the fixes showed. A cause still unknown after it stops the skill with the hand-back.

## 4. Review

Dispatch `reviewer`, with no `Output`:

```
Agent: reviewer
Requirement: <the pin path>
Changed paths: <the changed paths>
Rules to read: <the output of bash .claude/hooks/rules.sh over the changed paths, pasted>
Decisions to honor: <the pin's line>
```

1. A red result takes `.claude/skills/ack-build/SKILL.md`, Review, steps 1 and 2, its pin copied from the hand-back.
2. A finding the reviewer hands back goes to one `coder` dispatch, its files, cause, and change as the pin, then to one `reviewer` dispatch with the same lines and `Fixed: <the finding>`. One still open goes to the owner with `AskUserQuestion`.

## Hand back

- The pin path.
- For a symptom: the root-cause sentence and its evidence, each command with its decisive output line.
- The review's results.
- Each decision made, and who made it.
- Each other place with the same defect, unfixed.
- Each owner answer that rejected a named alternative, as a decision candidate (the choice, the rejected option, the owner's reason): name `/ack-harness`.
- The proposed commit subject (`.claude/CLAUDE.md`, Etiquette). Wait for the owner.

## Next

`/ack-pr` once the work is committed: writes the pull request text and opens it on the owner's word. `/ack-design` when step 2 named it: settles the change into a spec.
