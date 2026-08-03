---
name: coding
description: Build a feature in ack-nestjs-boilerplate's repository pattern, end to end — from brainstorming the design with the owner, through spec and plan, test-first implementation by the coder agent, whole-feature gates, mandatory flow review, doc-drift check, and report collection. Use this whenever the owner asks for a new feature, a new endpoint or service method, a new queue processor, or a refactor of feature code. Covers Controller → Service → Repository placement via the gates; module scaffold lives inside the coder agent; status-code procedure lives in `rules/status-code.md` (coder follows it). NOT for standalone coverage backfill — that is the `spec-coverage` skill, and this skill does not invoke it.
---

# Coding — build a feature in the repository pattern

One job, run end to end: turning a feature request into reviewed, documented code that obeys Controller → Service → Repository. `rules/*.md` hold the constraints; this skill holds the ORDER and the trap at each step. On disagreement the rule file governs — fix the skill.

**Repository pattern only.** Controllers, services, repositories, and flat folder-per-concern modules. Keep that shape; do not invent another folder scheme on top of it.

## Out of this skill (HARD)

- **Do not invoke `spec-coverage`.** It is a parallel workflow skill for backfilling unit specs on existing code. Feature TDD belongs inside `coder`.
- **Do not invoke `migration-seed`.** Standalone seed work under `src/migration/` is a parallel skill. If this feature also needs bootstrap rows, either finish the feature here and point the owner at `migration-seed`, or keep a thin seed via `coder` scaffold §9 — do not restate the full seed workflow.
- **Do not dispatch `unit-test-writer`.** Only `spec-coverage` may dispatch it. `coder` writes failing specs and brings touched files to 100% coverage itself.
- **Do not dispatch `pr-doc-writer` and do not invoke `pr-doc`.** PR documents are a standalone owner-triggered job (`pr-doc` → `pr-doc-writer`). This skill never opens that door.
- **Do not dispatch `auditor`.** That agent does not exist. Flow review inside this skill is `reviewer-flow` only.
- **Do not restate module-scaffold or status-code procedures.** Module scaffold lives in the `coder` agent; status-code procedure lives in `rules/status-code.md` (coder follows it). Point at those when a task needs a new module folder set, router/queue registration, or a status-code enum allocation.

## The scope block (HARD)

**Compute the scope ONCE, at step 0, and paste it verbatim into every dispatch.** An agent given a vague scope will widen it — `reviewer-flow` will invent entry points outside the feature, `doc-drift` will sweep all of `docs/`, `coder` will refactor what it passes through. Each of those is a scope breach, and each costs the owner budget they did not authorise.

```
SCOPE (do not go outside this)
  feature:        <name>
  module paths:   src/modules/<feature>/**            (+ any other path the plan names)
  test paths:     test/modules/<feature>/**
  entry points:   <HTTP routes / queue+job names / CLI commands>
  out of scope:   everything else, including code that merely looks wrong nearby
```

Every dispatch in the flow below carries this block. An agent that finds something worth fixing OUTSIDE it reports it and does not touch it.

---

## The flow

### 0. Baseline — before anything is designed

- `git branch --show-current` and `git status --short` — know what branch you are on and what is already uncommitted.
- `ls src/modules/<feature>/` — know the current folder set (or that the module does not exist yet).
- **Record which specs are GREEN today** for the paths in scope: `pnpm test --testPathPatterns <scope>`. Without this snapshot there is no way at later steps to tell a failure you caused from one that was already there. Write the baseline into your notes before a single file changes.
- Build the scope block.
- Do **not** fetch remotes. Orientation is the current checkout only (`git branch --show-current`, `git status --short`). `reviewer-flow` never diffs against `main`, `origin`, or any other branch — it reviews only the SCOPE block you hand it.

### 1. Understand, then design — `superpowers:brainstorming`

Loop with the owner until the feature is unambiguous. This runs in the main session because it needs a back-and-forth; it cannot be delegated to an agent.

- **Map the existing flow first.** Prefer `graphify query "<question>"` over the entry points in scope — endpoint to database, including the global guards, pipes, interceptors and filters a request crosses. Design against the real path, not against an assumption about it. This is a READ, not a review: do not dispatch `reviewer-flow` here — there is no diff yet.
- **Enumerate the possibilities, then argue them.** Put the options on the table with their costs, and say which one you would pick and why.
- **Challenge the owner.** If the approach they proposed is worse than an alternative, say so first, name the specific downside, and give the alternative. Weigh complexity against benefit explicitly — the simplest design that satisfies the requirement wins.
- Settle it against the rules: which role owns each artifact (controller / service / repository), whether the change crosses a module, whether a queue job or event is required, whether a status-code member is new.
- The spec is written to `.superpowers/specs/YYYY-MM-DD-<slug>.md`.

### 2. Plan — `superpowers:writing-plans`

Turn the settled spec into an ordered plan at `.superpowers/plans/YYYY-MM-DD-<slug>.md`.

- **The plan names `coder` as the executor of every implementation task**, and carries the scope block.
- Tasks are cut so each one is independently checkable. Mark which are independent of each other — that is what makes step 3 parallel.
- The plan does NOT restate the rules; `coder` already carries them.
- When a task creates a module or claims a status-code block, the plan says so in one line and leaves the procedure to `coder` — do not paste scaffold or status-code steps into the plan.

### 3. Execute — `superpowers:subagent-driven-development` → `coder`

Dispatch one task at a time, in parallel where the plan marked them independent.

- Every dispatch carries the scope block and the path to the plan.
- **`coder` writes the failing spec first — TDD is mandatory here and is not waived.** Same head watches red, then implements, then brings every touched production file to 100% coverage. It never delegates specs to `unit-test-writer`.
- Module scaffold and status-code allocation, when needed, run **inside `coder`** (status-code steps from `rules/status-code.md`). This skill only dispatches; it does not walk those procedures.
- `coder` cannot ask a question and wait, so what it cannot resolve lands in `generated/docs/report-coder-<feature>.md`. Step 7 reads it.

### 4. Gate the whole feature — `anti-pattern-gate`, plus `repository-pattern-gate` when it applies

`coder` runs the gate on its own task diff. This pass is different: run it once over the WHOLE feature surface, where the smells that only appear across tasks live — a DTO reused incorrectly across two services, a constant redeclared in the third task beside the source of truth the first task created.

- `anti-pattern-gate` — ALWAYS. Run in place, yourself.
- `repository-pattern-gate` — when the feature touches controllers, services, repositories, or module wiring (including router / queue registration). Skip it only when the change is purely outside those surfaces (e.g. i18n JSON alone, a docs-only follow-up already handled by `doc-drift`).

### 5. Review the flow — `reviewer-flow` (mandatory)

Dispatch `reviewer-flow` with the scope block. **Hand it the paths** — it does not invent a surface from another branch; without the SCOPE block it stops.

This is where the seam defects surface: a DTO the interceptor strips, an exception no filter knows, a guard that already set what the handler re-derives, a controller holding a rule. Fix what it confirms (via `coder`, still TDD), then re-run the touched specs and re-gate the touched surface. Its findings land in `generated/docs/report-reviewer-flow-<feature>.md`.

### 6. Documentation drift — `doc-drift`

Dispatch `doc-drift` with the scope block plus the `docs/*.md` files your change plausibly touches. It is the ONLY agent allowed to write `docs/` — `coder`, `reviewer-flow`, and `unit-test-writer` are forbidden.

Hand it the `generated/docs/report-coder-<feature>.md` entries too: that file holds the docs the coder found stale, and **status-code block claims** (module, block base, members) the coder recorded because the enum files are the only registry — `doc-drift` verifies any numbers quoted in `docs/` against those enums.

### 7. Collect the reports and hand them to the owner

Read every `generated/docs/report-*-<feature>.md` this run produced — coder, reviewer-flow, and any `report-doc-drift-*` CONFLICT notes — and put them in front of the owner as one list:

- rule conflicts the coder stopped on,
- suspected business-logic defects,
- checks that could not run (the boot check with containers down, a suite that could not be scoped),
- status-code block claims from the coder report, if any,
- anything an agent found outside the scope block and correctly did not touch.

Nothing in those files is closed by this step. They are surfaced, and the owner decides.

Before you stop, run the release checks in the main session when the owner wants the branch merge-ready: `pnpm typecheck`, `pnpm lint`, `pnpm spell`, full `pnpm test`, and `pnpm start:dev` for the boot check. A DI or import cycle surfaces at BOOT, never at `tsc` or jest.

**There is no PR-document step.** If a PR description is needed, the owner runs skill `pr-doc` separately.

---

## Narrow bug fix

No new behavior → skip steps 1–2; `superpowers:systematic-debugging`, then enter at step 3 with a minimal plan and scope block. Steps 4–7 still apply.

---

## Shared shape — repository pattern

Every feature module under `src/modules/<feature>/` is flat folder-per-concern (`controllers/`, `services/`, `repositories/`, `dtos/`, …). Take only the folders the feature needs — see `docs/project-structure.md` and `rules/architecture.md`. Scaffolding a new module or missing tier is **`coder`'s** procedure, not a section of this skill.

Controllers and processors register EXTERNALLY:

- HTTP controllers → `src/router/routes/routes.<scope>.module.ts`
- BullMQ processors → `src/queues/queue.module.ts` (the queue itself in `queue.register.module.ts`)

**Verify any wiring change with the boot check.** An import cycle surfaces at BOOT as `ReferenceError: Cannot access 'XModule' before initialization`, never at `tsc`, lint, or jest.

---

## Commands

PNPM only (`npm` and `yarn` are blocked by `engines`):

```bash
pnpm test --testPathPatterns <scope>
pnpm typecheck
pnpm lint
pnpm spell
pnpm start:dev
```
