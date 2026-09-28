---
name: ack-plan
description: >-
  Settles a src/ change in the session before anything is built: interrogates the owner
  with the project checklist, locates code through explorer, designs through superpowers
  brainstorming, writes the plan through superpowers writing-plans, has reviewer check the
  plan, and ends with the plan path the owner approved for /ack-build. Use when the owner
  wants application behaviour added or changed, a seed written, or a flow changed. Not for
  building (ack-build), a symptom without a cause (ack-debug), judging only (ack-review),
  specs over code that exists (ack-spec), docs (ack-doc), or the harness (ack-harness).
disable-model-invocation: true
argument-hint: "<the request in one paragraph: the behaviour wanted, or a pinned cause that changes a flow>"
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
- A symptom without a cause: end with Next `/ack-debug`.
- Everything else continues to step 2.

## 2. Interrogate

- Ask with `AskUserQuestion`, at most five questions per round, drawn from
  `references/interrogate.md`.
- Do not ask what the owner already named.
- A question the code can answer goes to `explorer` in step 3, not to the owner.
- Integrate each answer and ask the next round until nothing material is open.
- State the settled requirement back in one paragraph. It names what is out of scope, the
  review depth (`rules and boot` or `end to end`), and whether docs update (`yes` or `no`).

## 3. Explore, through `explorer`

Dispatch `explorer` with the settled paragraph (template `../ack-build/references/dispatch.md`,
Explorer). It returns the location table, the third-party contract when one is involved,
approaches with trade-offs, and open questions. Its open questions go back to the owner
through `AskUserQuestion`.

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

The plan opens with a four-line header block:

```
Requirement: <the settled paragraph>
Review depth: rules and boot | end to end
Docs: yes | no
Spec: <.superpowers/<date>-<slug>-spec.md | none>
```

Each task carries:

- `Complexity: simple | complex`
- `Files:` every path the task writes
- `Rules to read:` from the path list in `../ack-build/references/dispatch.md`
- `Procedure: ack-add-<topic>` when the task adds a module, status code, queue, seed, or
  notification (`ack-add-module`, `ack-add-status-code`, `ack-add-queue`, `ack-add-seed`,
  `ack-add-notification`)
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
the plan is final; a change request loops to step 5.

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
- One line per thing noticed outside the scope.

## Next

`/ack-build <plan path>`. `/ack-debug` for a symptom that turned up without a cause.
`/ack-harness` when a rule has to change before the build.
