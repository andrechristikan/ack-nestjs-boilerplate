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
- **Service interface REQUIRED.** `interfaces/<feature>[.<name>].service.interface.ts` with `I<Feature>[<Name>]Service`; the class `implements` it. Injection is still by class unless a real token seam exists. See "Service interface required" below.

## Controller

- **Route delegation ONLY.** One endpoint maps to one service method. Decorators, param extraction, and the return value — nothing else.
- Prefer passing the whole request DTO through. Normalize `undefined → null` only when a service param is `T | null` and the DTO field is optional (`rules/null-safety.md`).
- No business rules, no repository access, no pagination metadata assembled by hand.

## SOLID, applied here

- **S** — the three roles above. A service method that builds a Prisma `where` has crossed into the repository; a repository that throws `UserNotFoundException` has crossed into the service.
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

**Every feature / kit business service MUST have a header interface** at
`interfaces/<feature>[.<name>].service.interface.ts`, named `I<Feature>[<Name>]Service`, and the
class `implements` it. Primary services use the short form (`user.service.interface.ts` /
`IUserService`); a second service in the same module adds the concern
(`notification.push.processor.service.interface.ts` / `INotificationPushProcessorService`).
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
| module `imports` / `providers` / `exports`, global modules, DI tokens | `rules/nest-wiring.md` |
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
