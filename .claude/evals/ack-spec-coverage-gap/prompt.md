---
name: ack-spec-coverage-gap
tags: [ack-spec, coverage]
runs: 1
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

`pnpm test:cov` says `src/modules/api-key/domains/api-key.domain.ts` is at 82% branches;
the uncovered lines are the expired-key and the inactive-key rejections. The code is
right, the specs are missing. Bring that file to 100% and tell me which specs were added,
the per-file coverage row after the run, and anything you found that you did not fix.
