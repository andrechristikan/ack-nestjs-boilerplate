# Add a module

Invariants: `.claude/rules/layering.md` (roles, levels), `.claude/rules/module-files.md` (`@Global()`, module files, boot-only defects), `.claude/rules/use-case.md` and `.claude/rules/service.md`, `.claude/rules/http.md` (scopes, route paths), `.claude/rules/guards.md` (decorator order), `.claude/rules/naming.md`. Reference implementation: `src/modules/device/` (no queue) and `src/modules/workspace/` (with a queue and a processor).

## 1. Claim the status-code block

Scan and claim the next free hundred, then create `src/modules/<module>/enums/<module>.status-code.enum.ts` with the first member at the block base (`EnumDeviceStatusCodeError`, `src/modules/device/enums/device.status-code.enum.ts`). Procedure: `.claude/skills/ack-build/references/add-status-code.md`.

## 2. Schema

Add the model to `prisma/schema.prisma` and run `pnpm db:generate`.

## 3. Level

A module is `@Global()` only when a guard, strategy, interceptor, or decorator injects its classes (`.claude/rules/module-files.md`, `@Global()`); otherwise it is a plain feature module, whose services inject no other plain module's service or util (`.claude/rules/layering.md`, Levels).

## 4. Files, bottom up

| Layer | File | Reference |
| --- | --- | --- |
| repository port | `interfaces/<module>.repository.interface.ts` | `src/modules/device/interfaces/device.repository.interface.ts` |
| repository | `repositories/<module>.repository.ts`, `implements I<Module>Repository` | `DeviceRepository`, `src/modules/device/repositories/device.repository.ts` |
| data shapes | `interfaces/<module>.interface.ts` | `src/modules/device/interfaces/device.interface.ts` |
| list fields | `constants/<module>.list.constant.ts`, the sort presets `as const satisfies IPaginationOrderByPresets<Prisma.<Model>ScalarFieldEnum, Enum<Module>OrderBy>` and the search tuple `as const satisfies ReadonlyArray<…>` | `DeviceOrderBy` keyed by `EnumDeviceOrderBy` (`device.enum.ts`), `src/modules/device/constants/device.list.constant.ts` |
| service | `services/<module>.service.ts`, its own module's collaborators, the services of a lower level (`.claude/rules/layering.md`, Levels), and the queue class of any module | `src/modules/country/services/country.service.ts` |
| util (optional) | `utils/<module>.util.ts` | `src/modules/device/utils/device.util.ts` |
| exceptions | `exceptions/<module>.<descriptor>.exception.ts`, one class per file | `DeviceNotFoundException`, `src/modules/device/exceptions/device.not-found.exception.ts` |
| request DTO | `dtos/request/<module>.<action>.request.dto.ts`: a zod schema plus `z.infer` type; an update DTO requires every editable field (`.claude/rules/null-safety.md`, Update and create) | `src/modules/device/dtos/request/device.refresh.request.dto.ts` |
| response DTO | `dtos/response/<module>.response.dto.ts`: `DatabaseResponseSchema` extended, `.meta()` on every field | `DeviceResponseSchema`, `src/modules/device/dtos/response/device.response.dto.ts` |
| use case | `use-cases/<module>.<action>.use-case.ts`, one per endpoint or job, implements `IAppUseCase`, one public `async execute` | `src/modules/device/use-cases/` |
| controller | `controllers/<module>.<scope>.controller.ts`, one per scope | `src/modules/device/controllers/device.shared.controller.ts` |

A queue, a processor, and the use cases its jobs run follow `.claude/skills/ack-build/references/add-queue.md`. A cache class goes in `caches/`, provided by `<module>.module.ts`. A gate owned by another module goes in the use case's fail-fast `Promise.all` beside the other checks, an effect or an activity entry in the write's transaction (`.claude/rules/effects.md`), and a write needing one transaction across modules goes in the use case, calling each service's `*InTx` method (`.claude/rules/use-case.md`).

## 5. The module files

Both files: `.claude/rules/module-files.md`, Module files. Copy the shape, not the names (`src/modules/device/device.module.ts`, `src/modules/project/project.use-case.module.ts`).

## 6. Register

- Controller: add the class to `controllers` of `src/router/http/router.http.<scope>.module.ts`, and to its `imports` the modules `.claude/rules/module-files.md` (Module files) names for a router scope module (`src/router/http/router.http.shared.module.ts`). A missing import fails the boot.
- Processor: `.claude/skills/ack-build/references/add-queue.md`, New queue step 9.
- A `@Global()` module: `.claude/rules/module-files.md`, `@Global()` (`src/modules/session/session.module.ts`); the default is not global.

## 7. Messages

Create `src/languages/<lang>/<module>.json` in every directory under `src/languages/` (`src/languages/en/device.json`). Keys and paths: `.claude/rules/i18n.md`.

## 8. Seed and docs

Reference rows an empty database needs: `.claude/skills/ack-build/references/add-seed.md`. Swagger comes from the decorators; no separate doc file. The module's pages under `docs/concepts/`, `docs/guides/`, and `docs/reference/` are `writer`'s, from the hand-back.

## 9. Verify

```bash
pnpm typecheck
pnpm test <module>
```

Boot in the Docker `apis` container (`.claude/skills/ack-build/references/boot.md`): wiring defects surface only there. Check the boot log for no `UnknownDependenciesException` line. Specs: `test/unit/modules/<module>/…` mirrors `src/`; what gets no spec: `.claude/rules/testing.md`, Layout and runs.
