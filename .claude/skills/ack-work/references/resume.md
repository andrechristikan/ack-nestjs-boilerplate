# ack-work resume

A `<jev_route>` block reading `Route: resume <path>` resumes a run from its working artifact; Jev is not called. Durable state is the plan file, the design file, and the `.superpowers/sdd/` ledger, never the conversation.

- Invoke `ack-work` with a path only after compaction or in a new session. A reply, an `AskUserQuestion` answer, or a gate yes continues the run in context.
- Open the artifact first and enter at the step it proves done.

| Argument | Skipped | Entered at |
| --- | --- | --- |
| a plan with at least one `- [x]` task (`.superpowers/plans/`) | interrogate, explore, brainstorm, planner, gate | `SKILL.md`, step 4, at the first `- [ ]` task, after reading `.superpowers/sdd/<plan-basename>/progress.md` |
| a plan with no `- [x]` task | interrogate, explore, brainstorm, planner | `gate.md`, Ask, on the plan path |
| a design (`.superpowers/specs/*-design.md`) | interrogate, explore, brainstorm | one `AskUserQuestion` confirming the design, then `planner` (`feature.md`, 6.4), then the gate |

- A step is skipped only when its artifact exists on disk. Approvals live in the conversation, not in the artifact, so the approval a resume needs is asked again: the design's, or the gate's yes. A `- [x]` task proves the gate's yes.
- The route of a resumed plan is the one its `**Agents:**` line and tasks carry; its agents run at the model and effort that line gives.
