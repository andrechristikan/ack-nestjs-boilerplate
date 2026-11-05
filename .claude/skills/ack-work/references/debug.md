# ack-work debug path

A symptom without a cause runs here, in the session, because a decision goes back to the owner. The path ends in the gate (`gate.md`) with the debugger's pin as the change, continuing in `fix`, `change`, or `feature`, or with `/ack-spec` named to the owner.

## 1. Pin the symptom

- The four parts: the input, the observed result, the expected result, and where it surfaces (a route, a spec, a log line, a job).
- Ask for any missing part with `AskUserQuestion`.
- A symptom whose cause the owner already names is a pin: state it back and classify it in step 4.

## 2. Find the cause, through `debugger`

Dispatch `debugger` with the template at `dispatch.md`, Debugger. Its `Rules to read:` is the output of `bash .claude/hooks/rules.sh` over the paths in `Scope`, pasted. `debugger` runs on its frontmatter model and effort: it is dispatched before the `jev.sh level` call.

## 3. Read the hand-back

- `NEEDS_DECISION`: put the options to the owner with `AskUserQuestion`, then dispatch again with `Decision:` filled.
- Does not reproduce: ask the owner for what the hand-back says is missing, then dispatch again.
- `NOT RUN` (infrastructure down or port 3000 held): tell the owner what to start or free, then dispatch again.
- A root cause with a pin: continue.

## 4. Classify the pin

Take the first branch that matches:

1. The cause is a spec that asserts a wish over correct code: name `/ack-spec` to the owner and stop.
2. The change alters a flow or needs a decision: the route is `change` (one module) or `feature` (otherwise), with the pin and the symptom as the request.
3. Otherwise the change alters no flow (the contract, the guard stack, the status code, and the call order stay): the route is `fix`.

Run `jev.sh level` with the pin as the location (`SKILL.md`, step 1), then enter the gate (`gate.md`): its `**Requirement:**` holds the pin as the change and the symptom; on `feature`, `SKILL.md` step 6 runs first. Build only on the owner's yes.

Invoke `superpowers:verification-before-completion` before stating the classification: the cause rests on the quoted reproduction and the quoted evidence, not on a claim.

## Boundaries

- No edit, no spec, no commit, no DB or seed command before the gate's yes.
- The session does not debug in place of `debugger`.

## Hand back

- The symptom in its four parts.
- The reproduction command and its decisive line.
- Each hypothesis and its evidence.
- The root cause at `file:line`.
- The pin.
- The classification, the plan file path, and the route it continues in.
- Every decision the owner made.
