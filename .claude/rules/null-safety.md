# Strict null types

`tsconfig.json` runs `strict`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`; in `src/`, the undefined
selectors of `no-restricted-syntax` in `eslint.config.mjs` reject a literal `undefined` as a return, a `??` fallback, a
ternary branch, or an arrow body. Two rules carry the weight:

1. `undefined` is legal only at the input boundary: request DTO body and query DTO. Every
   layer deeper speaks `null`.
2. Never write `field?: Type | null`: a caller cannot tell whether omitting the field and
   passing `null` mean the same thing. Pick one.

## Where each convention applies

| Layer | Convention |
|---|---|
| request or query DTO | `field?: Type` |
| response schema | `.optional()` when genuinely absent; `.nullable()` when present-or-null |
| module `I*` data shape | `field: Type \| null` |
| patch shape (`I<Module>Update`) | `field: Type \| null`, `null` meaning unchanged |
| `I*` for a request lifecycle or an external spec (JWT, Prisma) | `field?: Type` |
| exception options, option bag | `field?: Type` |
| config interface (`src/configs/`) | `field: Type \| null` |
| domain / HTTP / processor / repository data param | `param: Type \| null` |
| filter param | `param: Type \| null`; an additive domain-level filter may use `?` |
| Prisma return | `Type \| null` |

## The controller and the boundary

Pass the whole request DTO into the HTTP service. Normalize `undefined → null` only when a
domain or HTTP method takes a discrete `T | null` param and the DTO field is optional:
`const field = dto.field ?? null`. A domain or HTTP signature accepting `bio?: string` pushes
the ambiguity one layer deeper.

## Patch and create

A patch shape leaves a field unchanged when it is `null`; the repository applies it with a conditional spread,
`...(name !== null && { name })` (`src/modules/workspace/repositories/workspace.repository.ts:138`). A create shape
(`I<Module>Create`) stores `null` as given.

## Consequences

- Every public method on a controller, HTTP service, domain, or repository names its shape:
  an `I*` interface, a Prisma model, a primitive, or a DTO type. `Promise<unknown>`,
  `Record<string, unknown>`, and `Record<string, any>` are not stand-ins for an owned
  payload; map a Prisma `groupBy` or aggregate into the named type inside the repository.
- `unknown` is a narrowing input only: a `catch` binding before a type guard, or a
  third-party callback value before it is narrowed into a type we own. Not a field on an
  `I*`, not a way to silence typecheck, and a return type only where a function hands back
  its own `unknown` input untouched: an error mapper returns an unmatched error as it came
  (`src/modules/user/utils/user.onboarding.util.ts:12`).
- A non-null assertion (`!`) is permitted only where the value is structurally guaranteed and
  the compiler cannot see it; `ConfigService.get` for a key `AppEnvSchema` requires is the
  canonical case. Anywhere else, handle the null.
- No `as` between two types we own to silence a mismatch; the mismatch is the finding. An
  `as` that narrows a value a third party hands in untyped is legitimate.
- No literal `undefined` in our own logic, in every tree: no `return undefined`, `?? undefined`, `= undefined`,
  or `T | undefined` on a signature we own; write `null`. `undefined` stays where it is a contract we do not own:
  a Prisma `where`, `data`, `select`, or `cursor` arg (`undefined` skips, `null` matches null), filled by a
  conditional spread; zod `.optional()`; and a third-party type, normalized with `?? null` where it enters our types.
- `||` is boolean logic only, on a non-nullable operand too. Where `''` or `0` must also fall back, write the
  comparison (`name === '' ? fallback : name`).
