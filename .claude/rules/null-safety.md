# Strict null types

`tsconfig.json` runs `strict`. Two rules carry the weight:

1. `undefined` is legal only at the input boundary: request DTO body and query DTO. Every
   layer deeper speaks `null`.
2. Do not write `field?: Type | null` on new code. A caller cannot tell whether omitting the
   field and passing `null` mean the same thing. Pick one; clean an existing union when the
   file is touched.

## Where each convention applies

| Layer | Convention |
|---|---|
| request or query DTO | `field?: Type` |
| response schema | `.optional()` when genuinely absent; `.nullable()` when present-or-null |
| module `I*` data shape | `field: Type \| null` |
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

## Consequences

- No `any`, as a param, a cast, or a generic argument.
- Every public method on a controller, HTTP service, domain, or repository names its shape:
  an `I*` interface, a Prisma model, a primitive, or a DTO type. `Promise<unknown>`,
  `Record<string, unknown>`, and `Record<string, any>` are not stand-ins for an owned
  payload; map a Prisma `groupBy` or aggregate into the named type inside the repository.
- `unknown` is a narrowing input only: a `catch` binding before a type guard, or a
  third-party callback value before it is narrowed into a type we own. Not a return type,
  not a field on an `I*`, not a way to silence typecheck.
- A non-null assertion (`!`) is permitted only where the value is structurally guaranteed and
  the compiler cannot see it; `ConfigService.get` for a key `AppEnvSchema` requires is the
  canonical case. Anywhere else, handle the null.
- No `as` between two types we own to silence a mismatch; the mismatch is the finding. An
  `as` that narrows a value a third party hands in untyped is legitimate.
