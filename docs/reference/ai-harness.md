---
title: AI Harness Reference
description: The standalone commands, agents, hooks, other tools, and copied skills of the AI harness in .claude/.
---

# AI Harness Reference

This page lists the commands, agents, hooks, and copied skills of the AI harness, for a contributor who looks one up while running Claude Code or another AI tool on this repository.

## Table of Contents

- [Related Documents](#related-documents)
- [Standalone Commands](#standalone-commands)
- [Agents](#agents)
- [Hooks](#hooks)
- [Other Tools](#other-tools)
- [Copied Skills](#copied-skills)

## Related Documents

- [AI Harness Documentation][ref-doc-ai-harness-concepts]: how the flow, the rules, and the hooks fit together
- [AI Harness Guide][ref-doc-ai-harness-guide]: adapting the harness after a fork, and checking it after a change

## Standalone Commands

| Command | Use it when | Principle |
| --- | --- | --- |
| `/ack-quick <a change or a symptom>` | a small change spans files, or something is wrong and the cause is unknown | a pin first, a symptom's root cause included, then the owner's call beside Jev's three signals, then the fix, with a spec where behavior changes, and its review |
| `/ack-spec <module or path>` | existing code lacks unit specs, or a spec went stale | the code wins; `tester` changes no behavior, so each defect goes to the sweep log |
| `/ack-doc <files, a plan path, or all>` | a doc is stale, missing, or needs a diagram | the code wins; each page holds one type, in its type folder |
| `/ack-pr <mode>` | a branch is settled and needs a pull request or release notes | every claim traces to the diff |
| `/ack-harness <change>` | the harness, a decision entry, or a harness page changes | the checkout wins |

## Agents

| Agent | Does | Writes | Level |
| --- | --- | --- | --- |
| `coder` | builds one ticket or one pinned fix, test-first | `src/`, `test/unit/`, `prisma/schema.prisma`, the run surface | sonnet, high |
| `reviewer` | runs and reads a built feature or a pinned fix: the gates, a boot, each changed endpoint and the data it wrote, then the spec, the rules, and each flow | `.scratch/<feature>/review.md` | opus, high |
| `reader` | cold-reads a plan, reviews the harness files | nothing | sonnet, high |
| `advisor` | settles what two cold reads of a plan left open, or a coder's decision on how to build a ticket | the spec, the plan, and the tickets under `.scratch/` | opus, high |
| `debugger` | reproduces a symptom and finds its root cause | nothing | opus, high |
| `tester` | covers existing code with unit specs | `test/unit/` | sonnet, high |
| `writer` | docs, root people files, pull request text | `docs/`, `.scratch/pr/` | sonnet, medium |
| `harness` | writes the harness from a settled requirement | `.claude/`, `AGENTS.md`, the Copilot digest, decision entries, the harness pages | opus, high |
| `Explore` | locates code and hands back `file:line` pointers | nothing | haiku, medium |
| `researcher` | answers a question from the web, each finding with its URL and date | nothing | haiku, medium |

## Hooks

| Hook | Runs | Does |
| --- | --- | --- |
| `guard-bash.sh` | before every Bash call | denies owner-only database commands, secret reads, non-pnpm installs, a command that writes `.claude/rules/discipline.md`, and a command that writes under `src/` or `test/`, which Edit and Write change |
| `guard-write.sh` | before every file write | denies secrets, generated trees, edits to a copied skill, an `eslint-disable` comment, and a focused or skipped spec |
| `guard-session.sh` | before every MongoDB and Redis MCP call, web search, and web fetch | denies the session's own call, naming the agent to dispatch; a call inside an agent runs |
| `rules-gate.sh` | before every file write, and after every file read | denies a write until the session or agent has read whole every path-scoped rule that binds the file, and names the rules still unread |
| `format.sh` | after every file write | formats the file |
| `verify.sh` | at session start, and when a session stops | records the `src/` and `test/` files already changed at start; at stop, for every `src/` and `test/` file changed since, whatever wrote it, runs typecheck and the unit specs of their modules, skipped when those files are unchanged since the last green run |
| `roster.sh` | at session start | prints the `/ack-*` commands |
| `context-hint.sh` | when the owner sends a prompt | on an `/ack-*` command with the context at 600k tokens or more, suggests `/compact` first; it never blocks |

`jev.sh` and `check.sh` are scripts a skill runs, and `mcp.sh` is the launcher `.mcp.json` runs. None is a hook.

## Other Tools

- `AGENTS.md` is the shared base. Claude Code loads it through the import on the first line of `.claude/CLAUDE.md`. Codex, Cursor, and Copilot read it directly, and Copilot also reads `.github/copilot-instructions.md`.
- `AGENTS.md` tells every tool to run `bash .claude/hooks/rules.sh <path>` before an edit and read the rules it prints.
- `.agents/skills` is a symlink to `.claude/skills/`, so a tool that reads the shared skills folder finds the same skills. `.claude/skills/` stays the source.
- The `/ack-*` flow, the agents, the hooks, and every `ask` and `deny` entry run in Claude Code only. Another tool gets the instructions and none of the guards.

## Copied Skills

Each skill below is copied unchanged from its repository by the [`skills` CLI][ref-skills-cli] and pinned in `skills-lock.json`. The license texts are in `.claude/skills/licenses/`.

| Skill | Source | License | Used by |
| --- | --- | --- | --- |
| `grilling`, `to-spec` | [mattpocock/skills][ref-mattpocock-skills] | MIT | `/ack-design` |
| `to-tickets` | [mattpocock/skills][ref-mattpocock-skills] | MIT | `/ack-plan` |
| `tdd` | [mattpocock/skills][ref-mattpocock-skills] | MIT | `coder` |
| `codebase-design` | [mattpocock/skills][ref-mattpocock-skills] | MIT | `tdd` refers to it for seam vocabulary |
| `code-review` | [mattpocock/skills][ref-mattpocock-skills] | MIT | `reviewer` |
| `diagnosing-bugs` | [mattpocock/skills][ref-mattpocock-skills] | MIT | `debugger` |
| `writing-for-agents` | [mattpocock/skills][ref-mattpocock-skills] | MIT | `harness` |
| `ponytail` | [DietrichGebert/ponytail][ref-ponytail] | MIT | the session, `coder`, `debugger`, `harness` |
| `caveman` | [JuliusBrussee/caveman][ref-caveman] | Apache-2.0 | agent hand-backs |
| `humanizer` | [blader/humanizer][ref-humanizer] | MIT | `writer` |
| `documentation` | [mcollina/skills][ref-mcollina-skills] | MIT | `writer`, and the `/ack-doc` reader test |
| `diagram-design` | [cathrynlavery/diagram-design][ref-diagram-design] | MIT | `writer`, for a designed diagram |

| Command | Does |
| --- | --- |
| `pnpm skills:update` | updates every copied skill; `/ack-harness` then re-reads each departure against the new text |
| `npx skills@latest add <owner>/<repo> -a claude-code -s <skill> -y --copy` | copies one more skill |

A copied skill is never edited. An `ack-*` skill or an agent follows it and states where this repository departs from it.

<!-- REFERENCES -->

[ref-doc-ai-harness-concepts]: ../concepts/ai-harness.md
[ref-doc-ai-harness-guide]: ../guides/ai-harness.md
[ref-skills-cli]: https://github.com/vercel-labs/skills
[ref-mattpocock-skills]: https://github.com/mattpocock/skills
[ref-ponytail]: https://github.com/DietrichGebert/ponytail
[ref-caveman]: https://github.com/JuliusBrussee/caveman
[ref-humanizer]: https://github.com/blader/humanizer
[ref-mcollina-skills]: https://github.com/mcollina/skills
[ref-diagram-design]: https://github.com/cathrynlavery/diagram-design
