---
name: ack-plan
description: >-
  Settles a src/ change in the session before anything is built: interrogates the owner
  with the project checklist, locates code through explorer, designs through superpowers
  brainstorming, writes the plan through superpowers writing-plans, has reviewer check the
  plan, and ends with the plan path the owner approved for /ack-build. Use when the owner
  wants application behaviour added or changed, a seed written, or a flow changed, or when
  something misbehaves and the cause is not in hand: a failing request, a wrong value, a
  failing spec whose subject is wrong, a job that does not run. Not for building
  (ack-build), judging only (ack-review), specs over code that exists (ack-spec), docs
  (ack-doc), or the harness (ack-harness).
disable-model-invocation: true
argument-hint: "<the request in one paragraph: the behaviour wanted, a pinned cause that changes a flow, or a symptom: input, observed, expected, where it surfaces>"
---

!`git status --short`
!`git diff --name-only HEAD`

# ack-plan

This skill runs in the session because every step needs the owner's answers. You write only
under `.superpowers/`: no `src/`, `test/`, or `prisma/` edit, and git stays read-only. A
change under `.claude/**` lands first through `/ack-harness`. If a `superpowers:*` skill is
not installed, stop and say `claude plugin install superpowers@claude-plugins-official`.

## 1. Classify

- A pin: the request names the files, the cause at `file:line`, and the change, and leaves
  no product question open. It needs no plan: state the pin back and end with Next
  `/ack-build pin: files <paths>; cause <file:line>; change <one sentence>`.
- A symptom without a cause: follow `references/debug.md`; it ends with Next `/ack-build pin`
  or `/ack-spec`, or returns here at step 2 with the pin and the symptom as the request.
- Everything else continues to step 2.

## 2. Interrogate

- Ask with `AskUserQuestion`, at most five questions per round, drawn from
  `references/interrogate.md`.
- Do not ask what the owner already named.
- A question the code can answer goes to `explorer` in step 3, not to the owner.
- Integrate each answer and ask the next round until nothing material is open.
- State the settled requirement back in one paragraph. It names what is out of scope and the
  review depth (`rules and boot` or `end to end`).

## 3. Explore, through `explorer`

Dispatch `explorer` with the settled paragraph (template `../ack-build/references/dispatch.md`,
Explorer). `Mode:` is `locate` when only the touch points are missing, `contract` when a
third-party contract is unknown, and `assess` when the shape of the change is open; when
more than one applies, send one dispatch per mode in one message. It returns the location
table, the third-party contract when one is involved, approaches with trade-offs, and open
questions. Its open questions go back to the owner through `AskUserQuestion`.

Skip this step when the session already holds the location table and no contract is
unknown.

## 4. Design

Invoke `superpowers:brainstorming` with the settled paragraph and the location table. Its
save step writes under `.superpowers/`; its commit step is not taken, and git stays
read-only.

- A bounded change stops at a design the owner approved in chat.
- An architectural change produces `.superpowers/<date>-<slug>-spec.md`, which the owner
  approves.

## 5. Plan

Invoke `superpowers:writing-plans` on the approved design; the output is
`.superpowers/<date>-<slug>-plan.md`. Its Execution Handoff is not taken: the plan ends
here, and execution is `/ack-build` after step 7.

The plan opens with the writing-plans header. Its `**Spec:**` line names the spec, and
two lines follow it directly, before `## Global Constraints`:

```
**Spec:** <.superpowers/<date>-<slug>-spec.md | none>

**Requirement:** <the settled paragraph>

**Review depth:** rules and boot | end to end
```

Each task carries:

- `Files:` every path the task writes
- `Rules to read:` the four unscoped rules plus each scoped rule whose `paths:` frontmatter
  matches a file the task writes (`../ack-build/references/dispatch.md`, Rules by path)
- `Procedure: .claude/skills/ack-build/references/add-<topic>.md` when the task adds a
  module, status code, queue, seed, or notification (`add-module.md`, `add-status-code.md`,
  `add-queue.md`, `add-seed.md`, `add-notification.md`)
- its acceptance lines

## 6. Check the plan, through `reviewer`

Dispatch `reviewer` at `Depth: plan` (template `../ack-build/references/dispatch.md`,
Reviewer). The scope is the plan path; the requirement is the settled paragraph plus the
spec path.

Every finding passes `superpowers:receiving-code-review` here, in this session:

- Open the file and confirm or reject the claim, with a reason.
- Fix a confirmed finding in the plan file here, then dispatch one scoped re-check.
- A rejected finding, and what stays open after the re-check, is a line in the hand-back.

## 7. Approve

Present the plan path and its header to the owner with `AskUserQuestion`. Approval means
the plan is final. A change request revises the plan file here with the writing-plans text
already in context, keeps the header, then repeats step 6 on the revised plan; the skill is
not invoked again.

Invoke `superpowers:verification-before-completion`: report every step above with what it
produced, not a claim that it ran.

## Hand back

- The classification.
- The settled paragraph.
- Every question asked and its answer.
- The location table's source: `explorer` or the session.
- The spec path, or `none`.
- The plan path with its header.
- The plan review's findings and each one's state (fixed, rejected with the reason, open).
- For a symptom: the debug hand-back lines from `references/debug.md`.
- One line per thing noticed outside the scope.

## Next

`/ack-build <plan path>`. `/ack-build pin: files <paths>; cause <file:line>; change <one
sentence>` for a pin that alters no flow. `/ack-spec` when the cause is a spec that asserts a
wish over correct code. `/ack-harness` when a rule has to change before the build.
