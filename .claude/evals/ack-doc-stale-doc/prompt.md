---
name: ack-doc-stale-doc
tags: [ack-doc, stale]
runs: 1
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

`docs/queue.md` still describes a single Redis connection for cache and BullMQ, but the
code registers two BullMQ connections and the cache on its own database. Check that page
against the code and fix what is stale. Also check `README.md` and `CONTRIBUTING.md` while
you are at it. Tell me what was wrong by class and anything you could not settle.
