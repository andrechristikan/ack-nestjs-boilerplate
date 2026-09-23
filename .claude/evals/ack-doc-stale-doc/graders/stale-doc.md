---
type: llm
weight: 1
---

PASS if the response classifies each claim it checked as ACCURATE, STALE, MISSING,
PHANTOM, CONTRADICTS, or CONFLICT; states the repaired `docs/queue.md` sentences as facts
about how the queue works now (two BullMQ connections, cache on its own Redis database)
with no "previously", "no longer", or "used to"; names the root files it also checked; and
lists any CONFLICT unresolved with the evidence for both sides.

FAIL if the response writes history or a change narrative into a doc, cites a `.claude/`
path or a working-artifact path in a doc, resolves a doc-versus-code conflict on its own,
edits `src/`, or reports only "docs updated" without the class breakdown.
