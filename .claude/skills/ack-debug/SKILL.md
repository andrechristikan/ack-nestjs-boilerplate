---
name: ack-debug
description: >-
  Pins a symptom with the owner (input, observed result, expected result, where it
  surfaces), finds its cause through debugger with systematic debugging, relays a decision
  the owner has to make, and ends with a pin for /ack-build or a request for /ack-plan. Use
  when something misbehaves and the cause is not in hand: a failing request, a wrong value,
  a failing spec whose subject is wrong, a job that does not run. Not for a cause already
  pinned (ack-build), a new shape (ack-plan), judging (ack-review), or a spec that is wrong
  against correct code (ack-spec).
disable-model-invocation: true
argument-hint: "<symptom: input, observed result, expected result, where it surfaces>"
---

!`git status --short`
!`git diff --name-only HEAD`

# ack-debug

This skill runs in the session because a decision goes back to the owner. It changes
nothing: git stays read-only, and no DB or seed command runs. If a `superpowers:*` skill is
not installed, stop and say `claude plugin install superpowers@claude-plugins-official`.

## 1. Pin the symptom

- The four parts: the input, the observed result, the expected result, and where it
  surfaces (a route, a spec, a log line, a job).
- Ask for any missing part with `AskUserQuestion`.
- A symptom whose cause the owner already names is a pin: state it back and end with Next
  `/ack-build pin: files <paths>; cause <file:line>; change <one sentence>`.

## 2. Find the cause, through `debugger`

Dispatch `debugger` with the template at `../ack-build/references/dispatch.md`, Debugger,
and the rule files by path from the same file.

## 3. Read the hand-back

- `NEEDS_DECISION`: put the options to the owner with `AskUserQuestion`, then dispatch again
  with `Decision:` filled.
- Does not reproduce: ask the owner for what the hand-back says is missing, then dispatch
  again.
- A root cause with a pin: continue.

## 4. Classify the pin

- The change alters no flow (the contract, the guard stack, the status code, and the call
  order stay): Next
  `/ack-build pin: files <paths>; cause <file:line>; change <one sentence>`.
- The change alters a flow or needs a decision: Next `/ack-plan` with the pin and the
  symptom as the request.

Invoke `superpowers:verification-before-completion` before stating the classification: the
cause rests on the quoted reproduction and the quoted evidence, not on a claim.

## Boundaries

- No edit, no fix, no spec, no commit.
- The session does not debug in place of `debugger`.

## Hand back

- The symptom in its four parts.
- The reproduction command and its decisive line.
- Each hypothesis and its evidence.
- The root cause at `file:line`.
- The pin.
- The classification and the Next command filled in.
- Every decision the owner made.
- One line per thing noticed outside the scope.

## Next

- `/ack-build pin: files <paths>; cause <file:line>; change <one sentence>` for a fix that
  alters no flow.
- `/ack-plan` for a flow change.
- `/ack-spec` when the cause is a spec that asserts a wish over correct code.
