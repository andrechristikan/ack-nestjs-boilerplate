---
name: repository-pattern-gate
description: Place or check logic in ack-nestjs-boilerplate's Controller → Service → Repository shape — deciding which role owns a rule, a query, a throw, a DTO boundary, or a module registration. Use this whenever you are about to put business logic in a controller, inject DatabaseService into a service, throw a module exception from a repository, register a controller or processor inside its own feature module, add forwardRef between feature modules, or decide whether a util, decorator, guard, or processor is the right home. The failure modes here are services owning Prisma, controllers owning rules, repositories owning module exceptions, and wiring cycles that only fail at boot.
---

`rules/architecture.md` holds the obligations — what each role may do, module wiring, path aliases, and YAGNI; this skill holds the procedure for placing logic and the traps at each decision. When they appear to disagree, the rule file governs and the skill is stale — fix the skill. Related surfaces also live in `rules/http.md`, `rules/database.md`, `rules/validation.md`, `rules/null-safety.md`, and `rules/queue.md`.

# Repository pattern gate — place, wire, trap

## Dispatch to

`coder` — this skill governs feature code (controllers, services, repositories, guards, processors, module files). It is a REFERENCE skill: the `coder` agent invokes it from inside its own rule set when it is about to place logic, and the workflow skill `coding` invokes it at its gate step when the feature touched those surfaces. It dispatches nobody — workflow skills are the only things that dispatch agents.

## The three roles

```
Controller ──▶ Service ──▶ Repository ──▶ DatabaseService (Prisma)
```

| Role | Owns | Must not |
|---|---|---|
| **Controller** | Route, decorator stack, param extraction, whole-DTO pass-through (normalize `undefined → null` only when a service param is `T \| null`), return shape | Business rules, repository access, pagination metadata by hand, enqueueing jobs |
| **Service** | Business rules, orchestration, typed module exceptions, i18n `messagePath`, composing repository calls | `DatabaseService`, Prisma `where` / `select` / `orderBy`, filter `?? {}` normalization |
| **Repository** | Prisma queries, select/where/orderBy, filter `null → {}`, pagination via `PaginationService`, soft-delete/restore through `databaseService.client` | Module exceptions, i18n paths, HTTP concepts, returning DTOs |

Inject repositories **as classes**. No `@Inject(TOKEN)` for a repository with one implementor. No `I<Module>Repository`.

**Every service MUST have `I<Module>Service`** (and `implements` it). Controllers and guards still inject the **class**. A service MAY inject multiple repositories.

## Placement procedure

Before writing or moving a method, answer in order:

1. **Is it HTTP surface?** Decorators, `@Param` / `@Body` / `@Query`, calling one service method, normalizing `dto.field ?? null`, returning `IResponseReturn<T>` — **controller**. If the answer starts with "if the user is…" or "when the entity is…", it is a **service** rule that leaked upward.
2. **Is it a business rule, orchestration, or throw?** Existence checks, ownership, state transitions, composing two repositories, building `messagePath` — **service**. If the answer is a Prisma call shape, it leaked downward into the service.
3. **Is it data access?** `find`, `create`, `update`, `softDelete`, building `where` / `select`, calling `PaginationService` — **repository**. If it throws `*NotFoundException` or any module exception, it leaked upward into the repository — return `null` / empty and let the service decide. Multi-step writes: prefer `databaseService.client.$transaction(...)` so one failure rolls back.
4. **Is it cross-cutting transport?** A guard that authenticates or attaches request context, a decorator that composes guards, a processor that switches on `job.name` and calls a service — allowed beside the three roles, but they still **dispatch**; they do not own the rule. A guard that loads an entity and decides a business outcome inline is a defect (`rules/http.md`). A processor that does real work in the `job.name` switch instead of a `*.processor.service.ts` is a defect (`rules/queue.md`).

**HARD traps:**

- **NEVER inject `DatabaseService` into a service.** That is the single hardest rule. If the service "just needs one query", add or extend a repository method.
- **NEVER let a controller hold a rule.** 2FA, account state, ownership, feature-flag metadata asserts, and "is this allowed" belong in the service (or a guard that only authenticates / loads context). Controllers do not inject repositories.
- **NEVER let a repository throw a module exception or build an i18n path.** Repositories return data or `null`. The service maps absence to the typed exception.
- **NEVER normalize filter params (`filter ?? {}`) in the service.** The repository owns that boundary before Prisma.
- **NEVER open a Prisma transaction in a service.** `$transaction` belongs in the **repository**. Do not invent a second place in the service.
- **NEVER ship a service without `I*Service` / `implements`, and NEVER add `I*Repository`.**
- **NEVER put pagination assembly in a controller or inject `PaginationService` outside a repository.**

## DTO and `@Expose` boundary

- Request DTOs: every field has `class-validator` + `@ApiProperty` (see `rules/validation.md`). Normalization (`toLowerCase`, `trim`) is `@Transform` on the DTO, not service code.
- Response DTOs: every serialized field carries `@Expose()`. Missing `@Expose` is a silent empty response under `excludeExtraneousValues` — `tsc` stays green.
- Nested DTO / array-of-DTO fields need `@Type(() => X)`. Do not bypass `ResponseUtil` with a raw `plainToInstance` that drops the whitelist.
- Controllers return `IResponseReturn<T>` on `@Response` routes — never a bare DTO instance as the handler return when the decorator expects the wrapper (`rules/http.md`).

## Module wiring and external registration

Files live in the feature module; **registration is external**:

| Artifact | File lives in | Registered by |
|---|---|---|
| HTTP controller | `src/modules/<feature>/controllers/` | `src/router/routes/routes.<scope>.module.ts` |
| BullMQ processor | `src/modules/<feature>/processors/` | `src/queues/queue.module.ts` |
| Queue name / `BullModule.registerQueue` | — | `src/queues/queue.register.module.ts` only |

**HARD:**

- **NEVER `forwardRef` between feature modules.** A cycle is a broken boundary to re-architect, not a hazard to silence.
- A feature module exports what other modules consume (normally its service). Internal helpers stay unexported.
- Shared kit pieces come from `src/common/` via a plain `CommonModule` import at the app root. Never open a second Redis connection.
- Path aliases only — a `../` import in `src/` is a defect (`rules/architecture.md`).
- Flat folder-per-concern only inside a feature module; empty optional folders drop. Do not invent a second folder scheme beside `controllers/` / `services/` / `repositories/` / …

**After any `imports:` or provider change:** confirm the app still boots (`pnpm start:dev`). A DI or import cycle surfaces at BOOT as `ReferenceError: Cannot access 'XModule' before initialization`, never at `tsc`, lint, or jest.

## Utils, decorators, guards, processors — when they are allowed

| Kind | Allowed when | Trap |
|---|---|---|
| `utils/` | Pure helpers with a clear owner module, no Nest lifecycle | Promoting a feature helper into `src/common/` because "many modules import it" — caller count is not the test |
| Decorators | Compose guards / metadata for HTTP; thin | Business rules inside the decorator factory |
| Guards | Authn, attach request context, policy metadata | Resolving an entity and deciding a business rule inline; assigning credentials onto `request.<field>` |
| Processors | Thin switch on `job.name`, call service, return `IQueueResponse` | Real work in the switch; extending `WorkerHost` instead of `QueueProcessorBase`; registering on the feature module |

## How to run this gate on a diff

1. List touched files under `controllers/`, `services/`, `repositories/`, `*.module.ts`, `src/router/`, `src/queues/`, plus DTOs/guards/processors the change added.
2. For each new or moved method, run the placement procedure above — name the role, or name the trap.
3. Grep the diff for: `DatabaseService` in a `*.service.ts`, `forwardRef`, module exceptions under `repositories/`, `Prisma` / `where:` / `select:` in services, missing `@Expose()` on response DTO fields, controllers provided inside `<feature>.module.ts` instead of a routes module.
4. Fix, or state explicitly why the rule does not apply. A hit you cannot justify is a defect.
5. Report what fired. Silence about a hit reads as "clean".

Obligations and edge cases stay in the rule files. This skill is the order and the traps — not a second copy of the law.
