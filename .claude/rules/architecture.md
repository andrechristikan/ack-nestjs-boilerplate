# Architecture — repository pattern

Five roles, one reason to change each. Blurring them is the most expensive mistake available in this codebase.

```
Controller ──▶ HTTP Service ──────┐
                                  ├──▶ Domain Service ──▶ Repository ──▶ DatabaseService (Prisma)
Processor ───▶ Processor Service ─┘
```

Each role is provided by its own Nest module, and the module a class is provided by is part of
its definition (`rules/nest-wiring.md`).

## Repository

- **Data access ONLY.** Prisma queries, `select`, `where`, `orderBy`, pagination calls. No business rules, no HTTP concepts.
- Injects `DatabaseService` directly as a class. No `@Inject`, no token, no interface — a repository has exactly one implementation and inventing a port for it is speculative abstraction.
- **Model access goes through `databaseService.client`** (the audited extended Prisma client), which stamps `createdBy` / `updatedBy` / `deletedBy` from the CLS request actor. Soft delete is `client.<model>.softDelete(...)`, restore is `client.<model>.restore(...)`. See `rules/database.md`.
- **The repository owns `null → {}` normalization** for filter params before they reach Prisma. Never in the caller. A service that spreads `filter ?? {}` into a repository call has taken over the repository's job.
- Returns Prisma models or the module's `I<Module>*` interfaces. **It never returns a DTO** — a response shape belongs to one transport, and the repository answers to all of them.
- **It MAY receive a request DTO.** Where the controller, the HTTP service and the domain service all carry the same shape unchanged down to the write, that shape travels as the DTO rather than being retyped at every layer for no gain. What decides is whether anything in between DERIVES: the moment a service merges, computes or validates the input into a different shape, that new shape is an `I<Module>*` interface, and it is the interface that reaches the repository. A repository parameter typed as a DTO says "nothing happened to this on the way down", and that has to be true.
- **What else it may inject is the tier table below.** `src/common/` and every `@Global()` module are open to it, so `HelperService`, `PaginationService`, `DatabaseUtil` and `ActivityLogUtil` are injected directly. A non-global module's util is not, unless the repository belongs to that module.
- **`ConfigService` only for the mechanics of the write itself.** A transaction timeout, a batch size — the knobs on machinery this layer already owns — are read here. A value that expresses a business decision is not: `workspace.slugPrefix`, `project.slugMaxAttempts`, `user.personalWorkspaceNamePattern` belong to the domain service and arrive as parameters. The test is what the value decides, not where it is stored — both live in `src/configs/`. This is the "no business rules" line above, not a tier question: `ConfigModule` is global and every other global IS open.
- An i18n path composed by a tier 1 or tier 2 util travels with the row it stamps (`ActivityLogUtil.getDescription`) and is not a business rule. The repository still never resolves a message itself.
- **Prefer `$transaction` for multi-step writes** so a failure rolls back as one unit. See `rules/database.md`.
- **No `I*Repository` header.** Inject the class only.

## Domain service — `<module>[.<concern>].service.ts`

- **Business logic ONLY.** Invariants, rule validation, typed exceptions, i18n message paths, orchestration across repositories and other domain services.
- **A `ResponseDto` never appears in a domain signature**, as a parameter or a return. Return values are `I<Module>*` interfaces, Prisma models, and primitives; assembling a response is the HTTP service's job, and the domain answers to the queue as well.
- **A request DTO may travel through unchanged.** When the method takes the caller's input and hands it on without deriving anything from it, the DTO is the parameter type and no parallel interface is invented for it. When the method derives — merges two inputs, computes a value, resolves a reference, validates into a narrower shape — what it produces and passes on is an `I<Module>*` interface. The rule is about what the method DOES to the shape, not about which layer it sits in.
- It knows nothing about HTTP or the queue: no `IRequestApp`, no `Job`, no response envelope, no pagination response assembly.
- Injects repositories as classes — **one or many** (cross-module repos allowed when the module imports them). Injects other domain services and utils by the tier table below.
- **NEVER injects `DatabaseService`.** Data access goes through the repository, always. This is the single hardest rule in the file.
- **NEVER opens a Prisma `$transaction`.** Transactions live in the repository (`rules/database.md`).
- Provided by `<feature>.module.ts`, and it is the only layer another module ever consumes.

## HTTP service — `<module>[.<concern>].http.service.ts`

- **The controller's only collaborator**, one per HTTP concern. It is where a response DTO is born and where the HTTP shape of a request stops mattering.
- It translates: a request DTO into the domain call — passing it through when nothing derives from it, or into `I<Module>*` interface parameters when something does — then the domain result into a response DTO, and a list result into the pagination response the scope requires (`rules/pagination.md`).
- **It owns no business rule and reaches no repository.** A check that would be equally true for a queued job belongs to the domain service; putting it here means the processor path silently skips it.
- Injects domain services, and tier 1 / tier 2 kit for shaping. Provided by `<feature>.http.module.ts`.

## Processor service — `<module>[.<concern>].processor.service.ts`

- The processor's only collaborator — the HTTP service's shape on the queue side.
- It translates a job payload into domain calls and reports the `IQueueResponse` the processor returns (`rules/queue.md`).
- **It owns no business rule and reaches no repository**, for the same reason.
- Provided by `<feature>.processor.module.ts`.

## Controller

- **Route delegation ONLY.** One endpoint maps to one HTTP service method. Decorators, param extraction, and the return value — nothing else.
- Prefer passing the whole request DTO through. Normalize `undefined → null` only when a service param is `T | null` and the DTO field is optional (`rules/null-safety.md`).
- No business rules, no domain service, no repository access, no pagination metadata assembled by hand.
- The FILE lives in the feature module; the REGISTRATION lives in `src/router/http/` (`rules/router.md`).

## Import tiers — what may inject what (HARD)

Three tiers. Everything in a tier is open to every tier below it, and the reverse never holds.

| Tier | What is in it | Who may inject it |
|---|---|---|
| **1 — kit** | everything under `src/common/` | anyone: a repository, any service, any util |
| **2 — global feature** | a module under `src/modules/` carrying `@Global()` | anyone, exactly like tier 1 |
| **3 — feature** | a module under `src/modules/` without `@Global()` | its own layers; from ANOTHER module, its SERVICE layer only |

- **Tier 2 is not a lesser tier 1.** A `@Global()` module is shared surface by construction, so its util and service reach a repository the same way `HelperService` does. `ActivityLogUtil` in a repository is correct, not a leak.
- **A tier 3 util never reaches ANOTHER module's repository.** It is injected by that module's services, and whatever it built arrives at the repository as a parameter. A util that genuinely belongs in several modules' repositories belongs in tier 1 or tier 2 — move it, do not widen the rule.
- **A tier 3 util DOES reach its OWN module's repository.** It is provided by `<feature>.util.module.ts`, which the repository module imports (`rules/nest-wiring.md`).
- **A tier 3 repository is reachable across modules** on the terms in `rules/cross-module.md`; that is a separate question from this table, which governs UTILS and SERVICES.
- **`src/common/` MUST NOT import a util, service, or repository from `src/modules/`.** Composition wiring in `common.module.ts` and compile-time enums are the only crossings (`rules/common.md`). A shared module that knows one feature's internals is no longer shared.
- **Read tier 2 from the code, never from memory.** The test is `@Global()` on the module class, and the set changes.

## SOLID, applied here

- **S** — the five roles above. A domain service method that builds a Prisma `where` has crossed into the repository; a repository that throws `UserNotFoundException` has crossed into the domain service; an HTTP service that checks a business rule has crossed into it too, and the queue path loses that check.
- **O** — extend with a new class, strategy, or decorator. Never add an `if (type === 'x')` branch to stable code to make it handle one more case.
- **L** — a subclass or implementation must be drop-in for its base. No narrowing behavior, no surprise throws a caller cannot see coming.
- **I** — a service exposes `I*Service` shaped by what callers need; repositories do not get an `I*Repository`. Data-shape interfaces stay consumer-driven.
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
2. It **belongs to a family that exists and has at least one used member**. `PaginationQueryFilterNotEqual` beside a used `PaginationQueryFilterEqualString`; `DocAllOf` beside a used `DocAnyOf`; `FileUploadMultiple` beside the used single-file upload.
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

## Service interface required; repository interface forbidden (HARD)

**Every service MUST have a header interface**, in all three shapes — domain, HTTP and
processor — at `interfaces/<feature>[.<concern>][.<layer>].service.interface.ts`, named
`I<Feature>[<Concern>][<Layer>]Service`, and the class `implements` it:

| Class | Interface file |
|---|---|
| `UserService` | `user.service.interface.ts` |
| `UserHttpService` | `user.http.service.interface.ts` |
| `UserProcessorService` | `user.processor.service.interface.ts` |
| `NotificationPushProcessorService` | `notification.push.processor.service.interface.ts` |

Injection stays by **class** (`UserService`) unless a real DI token seam exists — the interface
is still required.

**A repository MUST NOT get a header interface.** Inject the repository class. One implementor,
one Prisma surface — an `I<Feature>Repository` beside it is ceremony. Do not confuse that ban
with data-shape ports such as `IPaginationRepository` in `pagination.interface.ts` — those
describe a duck type, not a feature repository.

An interface still earns a place for **data shapes** (`IUser`, payloads, option bags) and for a
**real multi-implementor seam** (rare). Framework lifecycle contracts (`OnModuleInit`,
`CanActivate`, …) stay required. Pure Nest plumbing that is not a business service
(`DatabaseService`, `LoggerOptionService`, framework storage adapters) does not need an
`I*Service`.

**The test for repositories and data shapes:** if deleting the interface leaves every call site
compiling unchanged **and** it is not a required `I*Service`, delete it.

Every feature service already `implements I*Service`. Keep that. Do not add `I*Repository`, and
do not remove a service interface as a cleanup side effect of an unrelated change.

## Where the rest lives

| Concern | Rule file |
|---|---|
| the five module files per feature, `imports` / `providers` / `exports`, global modules, DI tokens | `rules/nest-wiring.md` |
| what one module may reach for in another, `forwardRef` | `rules/cross-module.md` |
| `src/common/` promotion and import direction | `rules/common.md` |
| path aliases, `Promise.all` on independent awaits, mirrored types | `rules/code-style.md` |
| transactions, atomicity, idempotency | `rules/concurrency.md` |

## No backward compatibility — ever

No external client depends on this repo. **Breaking changes are the default, not the exception.**

- **A new feature carries NO backward-compatibility affordance.** No deprecated-but-kept field, no `v2` variant beside a `v1`, no optional flag preserving the old behavior, no bridging shim between old and new. Build the correct shape and change every call site.
- When an existing design is wrong, replace it. Never keep a worse design because something already uses it.
- **Best practice outranks the existing pattern.** Default to current community best practice for NestJS, Prisma, and TypeScript, and pick the clean shape over the incumbent one.
- Use existing code only as a divergence check: when best practice clashes HARD with an established pattern here, WARN the owner before applying — do not apply silently. Minor local divergence: just proceed.
