---
paths:
    - 'eslint.config.mjs'
---

# ESLint

`eslint.config.mjs` is the source for rule names and blocks. A lint message is neutral: it says what is refused and what to do, and names no rule file and no `.claude/` path.

## Typed rules

- The base is `tsEslint.configs.recommended`; `recommendedTypeChecked` is not adopted.

## Boundaries

Beside the layer matrix (`layerPolicies` in `ts/boundaries`), lint holds six policies. The config reads the `@Global()` set from `src/modules/*/<name>.module.ts` at load and writes no module name for it.

1. A `services/` file of a plain module imports no `services/` file of another plain module, and one of a `@Global()` module none of any other feature module; a `queues/` file stays importable from any service.
2. A feature module's `utils/` file is imported only from its own module, any `use-cases/` file, and `src/migration/`.
3. `withTransaction` is called in `src/modules/**` only under `use-cases/`.
4. A method of the BullMQ `Queue` is called in `src/**` only under `queues/` and `src/common/queue/bases/`, and in `health.queue.indicator.ts`.
5. A `src/modules/*/use-cases/*.process-*.use-case.ts` file imports a `queues/` file only from `src/common/**`, `src/modules/notification/`, and `src/modules/activity-log/`, by folder, so a new kit queue takes no config change (`effects.md`).
6. A `queues/` file calls none of `upsertJobScheduler`, `getJobSchedulers`, and `removeJobScheduler` and declares no `onModuleInit` method, by folder, so they live in `QueueBase` (`src/common/queue/bases/`) alone, and `health.queue.indicator.ts` calls none of the three.

## Move to ESLint

- `@typescript-eslint/parameter-properties` with `allow: ['readonly', 'private readonly', 'protected readonly']` and `@typescript-eslint/prefer-readonly` carry the allowed modifiers of `injectable.md`, Constructors and fields; a `no-restricted-syntax` selector on the Utility types names outside `**/interfaces/**` carries `code-style.md`, Utility types.
- A `no-restricted-syntax` selector over `src/modules/**` carries the `CacheService.invalidate` caller list of `effects.md`, Cache invalidation.
- A `no-restricted-syntax` selector over every `queues/` file carries the scheduler calls and the `onModuleInit` method `queue.md`, Where things live, keeps in `QueueBase` (Boundaries, policy 6).
- `local/no-public-tag-on-class-member`, an inline plugin's rule in `sharedRules`, carries `code-style.md`, Types and comments: no class member carries `/** @public */`.
- A `ts/boundaries` policy from the `repository` element type to another module's `shape` files under `exceptions/` carries `layering.md`, Repository: a repository imports no other feature module's exception.
