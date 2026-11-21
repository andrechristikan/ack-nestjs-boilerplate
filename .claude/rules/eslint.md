---
paths:
    - 'eslint.config.mjs'
---

# ESLint

`eslint.config.mjs` is the source for rule names and blocks.

## Typed rules

- The base is `tsEslint.configs.recommended`; `recommendedTypeChecked` is not adopted.

## Move to ESLint

- `@typescript-eslint/parameter-properties` with `allow: ['readonly', 'private readonly', 'protected readonly']` and `@typescript-eslint/prefer-readonly` carry the allowed modifiers of `injectable.md`, Constructors and fields; a `no-restricted-syntax` selector on the Utility types names outside `**/interfaces/**` carries `code-style.md`, Utility types.
- A `no-restricted-syntax` selector over `src/modules/**` carries the `CacheService.invalidate` caller list of `effects.md`, Cache invalidation.
- A `layerPolicies` entry in the `ts/boundaries` block carries `layering.md`, Levels: a `services/` file imports no `services/` or `utils/` file of another feature module on its level.
- A `layerPolicies` entry in the `ts/boundaries` block carries `layering.md`, Roles: a feature module's `utils/` file is imported only from its own module and from `use-cases/`.
- A `no-restricted-syntax` selector over `src/modules/**` outside `use-cases/` carries "a service and a repository never call `withTransaction`" of `transaction.md`, Transactions.
- A `no-restricted-syntax` selector over `src/**` outside `queues/`, `src/common/queue/bases/`, and `health.queue.indicator.ts` carries "only a queue class and `HealthQueueIndicator` call a method of the BullMQ `Queue`" of `outbox.md`, Dispatch.
