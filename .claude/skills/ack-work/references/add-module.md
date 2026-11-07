# Add a module

Invariants: `.claude/rules/layering.md` (roles, dependency order, `@Global()`, module files, boot-only defects), `.claude/rules/use-case.md` and `.claude/rules/service.md`, `.claude/rules/http.md` (scopes, route paths), `.claude/rules/guards.md` (decorator order), `.claude/rules/naming.md`. Reference implementation: `src/modules/device/` (no queue) and `src/modules/workspace/` (with a queue and a processor).

## 1. Claim the status-code block

Scan and claim the next free hundred, then create `src/modules/<module>/enums/<module>.status-code.enum.ts` with the first member at the block base (`src/modules/device/enums/device.status-code.enum.ts:5-7`). Procedure: `.claude/skills/ack-work/references/add-status-code.md`.

## 2. Schema

Add the model to `prisma/schema.prisma` and run `pnpm db:generate`. Applying it is the owner's `pnpm db:migrate`; hand the command back.

## 3. Rank

The module's rank in `.claude/rules/layering.md`, Dependency order, sits above every module whose services or utils its services inject. That list is a harness file: hand the rank back, never edit it.

## 4. Files, bottom up

| Layer | File | Reference |
| --- | --- | --- |
| repository port | `interfaces/<module>.repository.interface.ts` | `src/modules/device/interfaces/device.repository.interface.ts` |
| repository | `repositories/<module>.repository.ts`, `implements I<Module>Repository` | `src/modules/device/repositories/device.repository.ts:12` |
| data shapes | `interfaces/<module>.interface.ts` | `src/modules/device/interfaces/device.interface.ts` |
| list fields | `constants/<module>.list.constant.ts`, `Prisma.<Model>ScalarFieldEnum` members `as const satisfies ReadonlyArray<…>` | `src/modules/device/constants/device.list.constant.ts:7-18` |
| service | `services/<module>.service.ts`, its own module's collaborators plus lower-ranked modules' services and utils | `src/modules/country/services/country.service.ts` |
| util (optional) | `utils/<module>.util.ts` | `src/modules/device/utils/device.util.ts:16` |
| exceptions | `exceptions/<module>.<descriptor>.exception.ts`, one class per file | `src/modules/device/exceptions/device.not-found.exception.ts:9-18` |
| request DTO | `dtos/request/<module>.<action>.request.dto.ts`: a zod schema plus `z.infer` type; an update DTO requires every editable field (`.claude/rules/null-safety.md`, Update and create) | `src/modules/device/dtos/request/device.refresh.request.dto.ts` |
| response DTO | `dtos/response/<module>.response.dto.ts`: `DatabaseResponseSchema` extended, `.meta()` on every field | `src/modules/device/dtos/response/device.response.dto.ts:10-26` |
| use case | `use-cases/<module>.<action>.use-case.ts`, one per endpoint or job, one public `execute` | `src/modules/device/use-cases/` |
| controller | `controllers/<module>.<scope>.controller.ts`, one per scope | `src/modules/device/controllers/device.shared.controller.ts` |

A queue, a processor, and the use cases its jobs run follow `.claude/skills/ack-work/references/add-queue.md`. A cache class goes in `caches/`, provided by `<module>.module.ts`. The service injects its own module's classes, lower-ranked modules' services and utils, and the kit; a gate, an activity-log row, or an enqueue owned by another module goes in the use case around the service call, and a write needing one transaction across modules goes in the use case, calling each service's `*InTx` method (`.claude/rules/use-case.md`).

## 5. The module files

Copy the shape, not the names:

- `<module>.module.ts`: services, repositories, utils, caches, queue classes in `providers`; services, utils, caches, and queue classes in `exports`, never a repository; imports each lower-ranked, non-`@Global()` `<Module>Module` whose services or utils its services inject (`src/modules/device/device.module.ts`).
- `<module>.use-case.module.ts`: use cases and processors in `providers`, use cases in `exports`; imports each non-`@Global()` `<Module>Module` its use cases inject, its own included (`src/modules/project/project.use-case.module.ts`; with a processor, `src/modules/workspace/workspace.use-case.module.ts`).

`controllers: []` in both. Only a file with something to provide exists.

## 6. Register

- Controller: add the class to `controllers` of `src/router/http/router.http.<scope>.module.ts`, and to its `imports` the modules `.claude/rules/layering.md` (Module files) names for a router scope module (`src/router/http/router.http.shared.module.ts`). A missing import fails the boot.
- Processor: the use-case module into `imports` of `src/router/processor/router.processor.module.ts`.
- A `@Global()` module: `src/common/common.module.ts` `imports`, only when a guard, strategy, interceptor, or decorator injects the module (`.claude/rules/layering.md`, `@Global()`; `src/modules/session/session.module.ts`); the default is not global.

## 7. Messages

Create `src/languages/<lang>/<module>.json` in every directory under `src/languages/`: success keys at the top level by action, errors under `error` (`src/languages/en/device.json`). Paths: `<module>.<action>` on `@Response`, `<module>.error.<descriptor>` in an exception (`.claude/rules/i18n.md`).

## 8. Seed and docs

Reference rows an empty database needs: `.claude/skills/ack-work/references/add-seed.md`. Swagger comes from the decorators; no separate doc file. A `docs/<module>.md` page is `writer`'s, from the hand-back.

## 9. Verify

```bash
pnpm typecheck
pnpm test <module>
```

Boot in the Docker `apis` container (`.claude/rules/docker.md`, Boot): wiring defects surface only there. Check the boot log for the `App Name:` block and no `UnknownDependenciesException` line. Specs: `test/unit/modules/<module>/…` mirrors `src/`; controllers, repositories, modules, and processors are excluded from coverage (`coverage.exclude` in `vitest.config.ts`).
