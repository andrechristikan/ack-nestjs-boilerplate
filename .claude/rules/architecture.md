# Architecture — repository pattern

Three roles, one reason to change each. Blurring them is the most expensive mistake available in this codebase.

```
Controller ──▶ Service ──▶ Repository ──▶ DatabaseService (Prisma)
```

## Repository

- **Data access ONLY.** Prisma queries, `select`, `where`, `orderBy`, pagination calls. No business rules, no HTTP concepts, no i18n.
- Injects `DatabaseService` directly as a class. No `@Inject`, no token, no interface — a repository has exactly one implementation and inventing a port for it is speculative abstraction.
- **Model access goes through `databaseService.client`** (the audited extended Prisma client), which stamps `createdBy` / `updatedBy` / `deletedBy` from the CLS request actor. Soft delete is `client.<model>.softDelete(...)`, restore is `client.<model>.restore(...)`. See `rules/database.md`.
- **The repository owns `null → {}` normalization** for filter params before they reach Prisma. Never in the caller. A service that spreads `filter ?? {}` into a repository call has taken over the repository's job.
- Returns Prisma models or the module's `I<Module>*` interfaces. It does not return DTOs.
- May inject `PaginationService`, `DatabaseUtil`, and other repositories' utils where the query genuinely needs them.
- **Prefer `$transaction` for multi-step writes** so a failure rolls back as one unit. See `rules/database.md`.
- **No `I*Repository` header.** Inject the class only.

## Service

- **Business logic ONLY.** Orchestration, validation of rules, exception throwing, i18n message paths, composing repository calls.
- Injects repositories as classes — **one or many** (cross-module repos allowed when the feature module imports them). Injects other services as classes.
- **NEVER injects `DatabaseService`.** Data access goes through the repository, always. This is the single hardest rule in the file.
- **NEVER opens a Prisma `$transaction`.** Transactions live in the repository (`rules/database.md`).
- **Service interface REQUIRED.** `interfaces/<feature>[.<name>].service.interface.ts` with `I<Feature>[<Name>]Service`; the class `implements` it. Injection is still by class unless a real token seam exists. See `rules/operational.md`.

## Controller

- **Route delegation ONLY.** One endpoint maps to one service method. Decorators, param extraction, and the return value — nothing else.
- Prefer passing the whole request DTO through. Normalize `undefined → null` only when a service param is `T | null` and the DTO field is optional (`rules/null-safety.md`).
- No business rules, no repository access, no pagination metadata assembled by hand.

## SOLID, applied here

- **S** — the three roles above. A service method that builds a Prisma `where` has crossed into the repository; a repository that throws `UserNotFoundException` has crossed into the service.
- **O** — extend with a new class, strategy, or decorator. Never add an `if (type === 'x')` branch to stable code to make it handle one more case.
- **L** — a subclass or implementation must be drop-in for its base. No narrowing behavior, no surprise throws a caller cannot see coming.
- **I** — a service exposes `I*Service` shaped by what callers need; repositories do not get an `I*Repository`. Data-shape interfaces stay consumer-driven (`rules/operational.md`).
- **D** — inject services and repositories as **classes**. The service still `implements I*Service`. A DI token is only for a real swappable seam.

**DRY** — zero copy-paste logic. Written twice is a signal, written three times is a defect. One source of truth per config value, connection, and constant.

**KISS + YAGNI gate SOLID and DRY.** Resolve conflicts in this order: correctness and security first, then YAGNI + KISS (is structure needed at all?), then SOLID + DRY (shape the structure that survived). Duplication beats the wrong abstraction — do not abstract to satisfy DRY against YAGNI.

### YAGNI governs complexity, not breadth — the two never overlap

**This repo's deliverable is the kit itself.** A consumer starts from it and deletes what they do not need, so a complete primitive family IS the requirement. Zero call sites inside `src/` proves nothing on its own, and never has.

The rule above and this one answer different questions. Read them on separate axes and the apparent conflict disappears:

| Axis | Question | Governed by |
|---|---|---|
| **Complexity** — layers, indirection, abstraction, config knobs, branches | Is this structure needed AT ALL? | YAGNI + KISS |
| **Breadth** — how many members an exported primitive family offers | Is this surface part of the kit? | This section |

YAGNI never had jurisdiction over breadth. A flat, fully-implemented sibling added beside working siblings introduces no structure to justify, so there is nothing for YAGNI to reject.

**This applies to NEW work exactly as it applies to what already exists.** Deliberately preparing a primitive nobody calls yet is normal here, and a reviewer must not treat "added in this PR" as making it speculative.

An export sits on the breadth axis — legitimate, present or future — when ALL hold:

1. It is **exported** from its module: public surface a consumer reaches for, not a private helper nothing can call.
2. It **belongs to a family that exists and has at least one used member**. `PaginationQueryFilterNotEqual` beside a used `PaginationQueryFilterEqualString`; `DocAllOf` beside a used `DocAnyOf`; `@RequestThrottleByUser()` beside the used IP throttler; `FileUploadMultiple` beside the used single-file upload.
3. It is **complete and correct on its own terms** — real implementation, real tests where the layer is covered (`rules/testing.md`), same rules as any shipped code. Not a stub, not a sketch.

It falls back onto the complexity axis, where YAGNI DOES reject it, when any of these is true:

- It **starts a family with no used member** — nothing anchors it to a real requirement, so it is a guess about what a consumer will want.
- It is **private or unexported**, or an internal branch no route reaches. Not surface at all.
- It **buys breadth by adding structure**: a new abstract base, a DI token, an interface with no consumer, a config knob, or an `if (type === 'x')` branch threaded through existing code. The complexity is the finding, not the unused member.
- It is **half-wired**: a decorator with no guard behind it, a method that throws `not implemented`, a folder kept empty "for later". Fails condition 3.

**Consequences, so this is not re-litigated:**

- `pnpm deadcode` (`ts-prune`) reports the whole kit surface by design. Its output is **not** a defect list, and the pre-commit chain does not block on it. Do not delete an export to quiet it, and do not report its entries as findings.
- Do not raise "unused / dead code / YAGNI violation" against an export meeting the three conditions — in a review, a PR description, an audit, or a plan. If it fails one, name WHICH one and argue that. "It has no call sites" is not a finding, and neither is "it is new".
- When the two axes genuinely both apply, **complexity wins**: reject the structure, keep the breadth. The answer is a flatter sibling, never a dropped one.

## Path aliases — relative imports are forbidden

```
@app/*  @common/*  @config  @configs/*  @modules/*  @queues/*
@routes/*  @router  @migration/*  @test/*  @generated/*  @package
```

`@prisma/client` resolves to `generated/prisma-client`. A `../` in an import is a defect, including inside the same module.

## Module wiring

- A feature module exports what other modules consume — normally its service, sometimes a guard-backing service. Internal helpers stay unexported.
- **Never `forwardRef` between feature modules.** That is a broken boundary to re-architect, not a hazard to work around.
- Shared kit pieces come from `src/common/` via a plain `CommonModule` import at the app root (its children use `forRoot()` / `forRootAsync()`). **Never open a second Redis connection** — share through the cache/queue modules that already own one.
- Controllers are registered by `src/router/routes/routes.<scope>.module.ts`, and BullMQ processors by `src/queues/queue.module.ts`. Registration is external; the files live in the feature module.

## `src/common/` IS the shared module

`src/common/` is the project's **shared module** — the one place cross-cutting, module-agnostic capability lives: database, cache, redis, pagination, request, response, logger, message, helper, file, doc, aws, firebase. `AppModule` imports `CommonModule` once; `CommonModule` composes the global pieces (each child module brings its own `forRoot()`).

Being shared is exactly why it must stay thin. It is not a parking lot for anything that happens to be imported in several places.

- A shape with a natural owner module **stays in that module** and is imported across, however many modules import it. **A natural owner disqualifies promotion on its own — caller count is not the test.**
- Promote into `src/common/` only when the concept is genuinely module-agnostic (no natural owner) AND has three or more external callers.
- `src/common/` MAY import a feature module for composition (`common.module.ts` wiring) or a feature's compile-time enum. It MUST NOT import a feature's runtime code or bind a feature type as a generic default — a shared module that knows one feature's internals is no longer shared.
- A feature module NEVER re-implements what the shared module already provides. Reach for `HelperService`, `PaginationService`, `ResponseUtil`, `MessageService`, `DatabaseService` before writing your own.

## No backward compatibility — ever

No external client depends on this repo. **Breaking changes are the default, not the exception.**

- **A new feature carries NO backward-compatibility affordance.** No deprecated-but-kept field, no `v2` variant beside a `v1`, no optional flag preserving the old behavior, no bridging shim between old and new. Build the correct shape and change every call site.
- When an existing design is wrong, replace it. Never keep a worse design because something already uses it.
- **Best practice outranks the existing pattern.** Default to current community best practice for NestJS, Prisma, and TypeScript, and pick the clean shape over the incumbent one.
- Use existing code only as a divergence check: when best practice clashes HARD with an established pattern here, WARN the owner before applying — do not apply silently. Minor local divergence: just proceed.
