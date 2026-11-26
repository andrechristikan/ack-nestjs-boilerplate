---
title: AI Harness Guide
description: Adapting the AI harness in .claude/ after a fork, and checking it after a change.
---

# AI Harness Guide

This page walks a contributor who maintains the AI harness through adapting it after a fork and checking it after a change.

## Table of Contents

- [Related Documents](#related-documents)
- [After Forking](#after-forking)
- [Checking the Harness](#checking-the-harness)

## Related Documents

- [AI Harness Documentation][ref-doc-ai-harness-concepts]: how the flow, the rules, and the hooks fit together
- [AI Harness Reference][ref-doc-ai-harness-reference]: the commands, agents, hooks, other tools, and copied skills
- [Decisions][ref-doc-decisions]: why the alternatives to a rule were rejected, one file per scope

## After Forking

The harness describes this boilerplate. A project built from it changes these first:

1. The first paragraph of `AGENTS.md` says no backward compatibility, backfill, or data-migration note. A product with clients and stored data replaces it, and the matching lines in `.claude/agents/coder.md`, `.claude/agents/reviewer.md`, `/ack-design`, and `/ack-plan`.
2. The `deny` list in `.claude/settings.json` keeps every command that writes to a database for the owner. Loosen it only for a database that is safe to lose.
3. `repository` in `.claude/hooks/jev.json` describes the application to Jev.
4. `.claude/decisions/` holds the reasons this boilerplate's rejected alternatives lost. Keep the entries whose rule you keep, and add one through `/ack-harness` when a design rejects a named alternative.
5. The Stack, Layout, and Commands sections of `AGENTS.md` follow the code as it changes.

## Checking the Harness

1. Run `bash .claude/hooks/check.sh`. It prints one line per defect: invalid JSON, a hook that does not parse, a file over its word budget, a retired name, a path that does not exist, a copied skill missing from the lock.
2. After a change to a skill or an agent, run its scenarios in a fresh session and compare the result with Expected:

| Skill | Scenario | Expected |
| --- | --- | --- |
| `/ack-design` | a one-sentence field addition | asks about the route scope and nullability, reads the module itself, writes a spec with seams |
| `/ack-design` | a request a decision entry rejects | names the entry and offers no option it rejects |
| `/ack-design` | the owner answers "you decide" | decides and lists the assumption in the spec |
| `/ack-plan` | a spec that adds a status code | the ticket names the status-code procedure |
| `/ack-plan` | a spec with an unnamed message key | the cold read asks for it, the ticket is fixed, a fresh `reader` reads again |
| `/ack-plan` | a first cold read with no question and no mismatch | no second `reader` runs |
| `/ack-plan` | a ticket two readers still question | `advisor` edits the tickets and no reader runs after it |
| `/ack-build` | a plan that is not approved | stops and names `/ack-plan` |
| `/ack-build` | one ticket | the hand-back quotes the spec failing, then passing, and `plan.md` records it |
| `/ack-build` | a plan with two tickets done | continues from the third |
| `/ack-build` | a plan with an open harness change | stops and names `/ack-harness` |
| `/ack-build` | no `TYPESAFE_API_KEY`, and a `coder` hands back `NEEDS_DECISION` | `jev.sh decision` prints `owner (off).`, the owner answers, and no `advisor` runs unless the owner names it |
| `/ack-build` | a `NEEDS_DECISION` on how to build a ticket that `jev.sh decision` routes to `advisor` | `advisor` corrects the ticket step and criterion and adds one `## Deviations` line, and the next `coder` builds the corrected step |
| `/ack-review` | a plan with a ticket not done | stops and names `/ack-build` |
| `/ack-build` | a finished build | `review.md` has a results row per command, endpoint call, and data check, a coverage row per rule file and per changed flow, and each finding names its exact change |
| `/ack-review` | a finding the owner drops | no `coder` runs for it, and `review.md` records the answer |
| `/ack-review` | a fix `coder` cannot apply as written | the finding goes to the owner, and `coder` picks no other fix |
| `/ack-doc` | a new how-to page | the dispatch carries `Type: how-to`, the page lands in `docs/guides/`, `writer` quotes `pnpm lint:docs` and `pnpm spell`, and the reader test asks the how-to check first |

<!-- REFERENCES -->

[ref-doc-ai-harness-concepts]: ../concepts/ai-harness.md
[ref-doc-ai-harness-reference]: ../reference/ai-harness.md
[ref-doc-decisions]: ../../.claude/decisions/README.md
