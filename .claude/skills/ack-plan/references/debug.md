# ack-plan debug path

A symptom without a cause runs here, in the session, because a decision goes back to the
owner. The path ends with Next `/ack-build pin: ...`, with Next `/ack-spec`, or by continuing
to Interrogate (`SKILL.md` step 2) inside the same run.

## 1. Pin the symptom

- The four parts: the input, the observed result, the expected result, and where it
  surfaces (a route, a spec, a log line, a job).
- Ask for any missing part with `AskUserQuestion`.
- A symptom whose cause the owner already names is a pin: state it back and classify it in
  step 4.

## 2. Find the cause, through `debugger`

Dispatch `debugger` with the template at `.claude/skills/ack-build/references/dispatch.md`,
Debugger, and the rule files by path from the same file.

## 3. Read the hand-back

- `NEEDS_DECISION`: put the options to the owner with `AskUserQuestion`, then dispatch again
  with `Decision:` filled.
- Does not reproduce: ask the owner for what the hand-back says is missing, then dispatch
  again.
- `NOT RUN` (infrastructure down or port 3000 held): tell the owner what to start or free,
  then dispatch again.
- A root cause with a pin: continue.

## 4. Classify the pin

Take the first branch that matches:

1. The cause is a spec that asserts a wish over correct code: Next `/ack-spec`.
2. The change alters a flow or needs a decision: continue to Interrogate (`SKILL.md` step 2)
   with the pin and the symptom as the request.
3. Otherwise the change alters no flow (the contract, the guard stack, the status code, and
   the call order stay): Next
   `/ack-build pin: files <paths>; cause <file:line>; change <one sentence>`.

Invoke `superpowers:verification-before-completion` before stating the classification: the
cause rests on the quoted reproduction and the quoted evidence, not on a claim.

## Boundaries

- No edit, no fix, no spec, no commit, no DB or seed command.
- The session does not debug in place of `debugger`.

## Hand back

- The symptom in its four parts.
- The reproduction command and its decisive line.
- Each hypothesis and its evidence.
- The root cause at `file:line`.
- The pin.
- The classification and the Next command filled in, or the step 2 continuation.
- Every decision the owner made.
