---
paths:
    - 'eslint.config.mjs'
---

# ESLint

`eslint.config.mjs` is the source for rule names and blocks.

## Typed rules

- `typedLintRules` in `eslint.config.mjs` holds four rules at `error`, spread into the `ts/default`, `ts/test`, and `ts/other` blocks: `@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises`, `@typescript-eslint/await-thenable`, `@typescript-eslint/switch-exhaustiveness-check`.
- The base is `tsEslint.configs.recommended`; `recommendedTypeChecked` is not adopted.

## Move to ESLint

- `@typescript-eslint/parameter-properties` with `allow: ['readonly', 'private readonly', 'protected readonly']` and `@typescript-eslint/prefer-readonly` carry the allowed modifiers of `injectable.md`, Constructors and fields; a `no-restricted-syntax` selector on the Utility types names outside `**/interfaces/**` carries `code-style.md`, Utility types.
- A `no-restricted-syntax` selector over `src/modules/**` carries the `CacheService.invalidate` caller list of `effects.md`, Cache invalidation.
