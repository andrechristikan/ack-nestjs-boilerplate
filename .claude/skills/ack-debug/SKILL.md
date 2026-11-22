---
name: ack-debug
description: >-
    Finds the root cause of a symptom through the debugger agent, then has it fixed test-first when the fix stays inside one module: a wrong result, an error, a failing or flaky spec, a boot failure. Use when a symptom is in hand and its cause is not. Not for a feature or a change of behaviour (ack-design) or a coverage gap in code that works (ack-spec).
blurb: 'root cause first, then the fix, test-first'
disable-model-invocation: true
argument-hint: '<the symptom: input, observed result, expected result, where it surfaces>'
---

!`git status --short` !`git log --oneline -n 10`

# ack-debug

Symptom: $ARGUMENTS

The session settles the symptom with the owner and assigns. `debugger` finds the cause and fixes nothing; `coder` fixes test-first; `reviewer` judges the fix. No fix before the root cause is stated with its evidence. Every Agent call runs in the foreground.

## 1. Pin the symptom

- State the input, the observed result, the expected result, and where it surfaces. Ask the owner for the missing part with `AskUserQuestion`.
- A symptom only real storage can show (a rollback, a unique index, a transaction across repositories) is a hand-back: integration and e2e are held (`.claude/rules/testing.md`).

## 2. Diagnose

Dispatch `debugger`:

```
Agent: debugger
Symptom: <input, observed result, expected result, where it surfaces>
Scope: <the modules or paths the symptom names>
Decision: <the owner's answer to a previous NEEDS_DECISION, or none>
Decisions to honour: <the entries of .claude/decisions/ the scope touches (README.md there lists each file's scope), or none>
Rules to read: <the output of bash .claude/hooks/rules.sh over the scope, pasted>
```

- `NEEDS_DECISION`: put the options to the owner with `AskUserQuestion`, then dispatch a new `debugger` with the answer in `Decision:`.
- A symptom that does not reproduce: hand back every command it tried.

## 3. Classify the pin

- The fix stays inside one module and changes no flow, shape, or schema: go to step 4.
- The fix changes a flow, a transport shape, the schema, or more than one module: stop with the pin and name `/ack-design`.
- The spec is wrong and the code is right: stop with the pin and name `/ack-spec`.
- The cause is in configuration, an environment value, a container, or a dependency: stop with the evidence. The owner fixes `.env`.

## 4. Fix

1. Show the owner the pin with `AskUserQuestion` and wait for the yes.
2. Dispatch `coder` on sonnet, at the effort `bash .claude/hooks/jev.sh level` gives the pin (`.claude/skills/ack-plan/SKILL.md`, Level per ticket) and at medium when its block names no agent:

```
Agent: coder
Pin: <files; cause at file:line; the change in one sentence>
First failing spec: <the behaviour the root cause breaks>
Decisions to honour: <as in step 2>
Rules to read: <the output of bash .claude/hooks/rules.sh over the pin's files, pasted>
```

3. A `DONE` hand-back quotes the spec failing because of the root cause, then passing.
4. Two coder dispatches that both fail: dispatch a new `debugger` with what the fixes showed.

## 5. Review

Dispatch `reviewer` with `Depth: task`, the pin as the requirement, the changed paths, and the `rules.sh` output over them. A confirmed finding goes to one `coder` dispatch, then one re-review.

## Hand back

- The root-cause sentence and the pin.
- The evidence: each command and its decisive output line.
- The fix and the spec that guards it.
- Each other place with the same defect, unfixed.
- Each owner answer that rejected a named alternative, as a decision candidate (the choice, the rejected option, the owner's reason): name `/ack-harness`.
- The proposed commit subject, `<type>(<scope>): <description>` per `.commitlintrc`. Wait for the owner.

## Next

`/ack-pr` once the work is committed: writes the pull request text and opens it on the owner's word. `/ack-design` when step 3 named it: settles the flow change into a spec.
