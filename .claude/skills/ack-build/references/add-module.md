# Add a module

Invariants: `.claude/rules/layering.md` (roles, tiers, module files, boot-only defects), `.claude/rules/http.md` (decorator order, scopes, route paths), `.claude/rules/naming.md`. Reference implementation: `src/modules/device/` (no queue) and `src/modules/workspace/` (with a queue and a processor).

## 1. Claim the status-code block

Scan and claim the next free hundred, then create `src/modules/<module>/enums/<module>.status-code.enum.ts` with the first member at the block base (`src/modules/device/enums/device.status-code.enum.ts:5-7`). Procedure: `.claude/skills/ack-build/references/add-status-code.md`.

## 2. Schema

Add the model to `prisma/schema.prisma` and run `pnpm db:generate`. Applying it is the owner's `pnpm db:migrate`; hand the command back.

## 3. Files, bottom up

| Layer | File | Reference |
| --- | --- | --- |
| repository port | `interfaces/<module>.repository.interface.ts` | `src/modules/device/interfaces/device.repository.interface.ts` |
| repository | `repositories/<module>.repository.ts`, `implements I<Module>Repository` | `src/modules/device/repositories/device.repository.ts:19` |
| data shapes | `interfaces/<module>.interface.ts` | `src/modules/device/interfaces/device.interface.ts` |
| list fields | `constants/<module>.list.constant.ts`, `Prisma.<Model>ScalarFieldEnum` members `as const satisfies ReadonlyArray<…>` | `src/modules/device/constants/device.list.constant.ts:7-18` |
| domain | `domains/<module>.domain.ts` | `src/modules/device/domains/device.domain.ts:34` |
| util (optional) | `utils/<module>.util.ts` | `src/modules/device/utils/device.util.ts:10` |
| exceptions | `exceptions/<module>.<descriptor>.exception.ts`, one class per file | `src/modules/device/exceptions/device.not-found.exception.ts:9-18` |
| request DTO | `dtos/request/<module>.<action>.request.dto.ts`: a zod schema plus `z.infer` type | `src/modules/device/dtos/request/device.refresh.request.dto.ts` |
| response DTO | `dtos/response/<module>.response.dto.ts`: `DatabaseResponseSchema` extended, `.meta()` on every field | `src/modules/device/dtos/response/device.response.dto.ts:13-36` |
| HTTP service | `services/<module>.http.service.ts` | `src/modules/device/services/device.http.service.ts:19` |
| controller | `controllers/<module>.<scope>.controller.ts`, one per scope | `src/modules/device/controllers/device.shared.controller.ts:39-64` |

A queue, a processor, and a processor service follow `.claude/skills/ack-build/references/add-queue.md`. A cache class goes in `caches/`, provided by the domain module.

## 4. The module files

Copy the shape, not the names:

- `<module>.repository.module.ts`: repositories in `providers` and `exports`, `imports: []` (`src/modules/device/device.repository.module.ts:7-23`).
- `<module>.domain.module.ts`: domains, utils, caches, queue classes in `providers`; export what another module injects; import the repository module and the domain modules of the features it calls (`src/modules/device/device.domain.module.ts:8-14`; with a queue, `src/modules/workspace/workspace.domain.module.ts:22-61`).
- `<module>.http.module.ts`: HTTP services, imports the domain module (`src/modules/device/device.http.module.ts:5-11`).
- `<module>.processor.module.ts` only with a processor (`src/modules/workspace/workspace.processor.module.ts:6-12`).

`controllers: []` in all four. Only a file with something to provide exists.

## 5. Register

- Controller: add the class to `controllers` and `<Module>HttpModule` to `imports` of `src/router/http/router.http.<scope>.module.ts` (`src/router/http/router.http.shared.module.ts:22-45`). Both entries, or boot fails.
- Processor module: `src/router/processor/router.processor.module.ts:8-14`.
- A `@Global()` domain module: `src/common/common.module.ts:64-72` `imports`. Read the `@Global()` decision from a sibling that needs to be reachable everywhere (`src/modules/notification/notification.domain.module.ts:32`); the default is not global.

## 6. Messages

Create `src/languages/<lang>/<module>.json` in every directory under `src/languages/`: success keys at the top level by action, errors under `error` (`src/languages/en/device.json`). Paths: `<module>.<action>` on `@Response`, `<module>.error.<descriptor>` in an exception (`.claude/rules/i18n.md`).

## 7. Seed and docs

Reference rows an empty database needs: `.claude/skills/ack-build/references/add-seed.md`. Swagger comes from the decorators; no separate doc file. A `docs/<module>.md` page is `writer`'s, from the hand-back.

## 8. Verify

```bash
pnpm typecheck
timeout 90 pnpm start:dev > /tmp/ack-boot.log 2>&1; grep -n 'App Name:' /tmp/ack-boot.log   # wiring defects surface only at boot
pnpm test <module>
```

Check in the boot log for the `App Name:` block and no `UnknownDependenciesException` line; exit 124 is the expected end of the boot. Specs: `test/unit/modules/<module>/…` mirrors `src/`; controllers, repositories, modules, and processors are excluded from coverage (`coverage.exclude` in `vitest.config.ts`).
