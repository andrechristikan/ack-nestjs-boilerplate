# Strict null types

TypeScript runs with `strict`, `strictNullChecks`, and `noImplicitAny`. Two rules carry all the weight:

1. **`undefined` is allowed ONLY at the input boundary.** Request DTO body, Query DTO. Every layer deeper speaks `null`.
2. **Do not invent `field?: Type | null` on new code.** It is ambiguous — a caller cannot tell whether omitting the field and passing `null` mean the same thing. Pick one. A few call sites already carry the union (utils / JWT / geo bags); do not spread the pattern, and clean them when you touch the file.

## Where each convention applies

| Layer | Convention |
|---|---|
| Request / Query DTO (input boundary) | `field?: Type` |
| Response schema | `.optional()` when the field is genuinely absent; `.nullable()` when the value is always present-or-null |
| Module `I*` interface — data | `field: Type \| null` |
| Module `I*` interface — request lifecycle or external spec (JWT, Prisma) | `field?: Type` |
| Exception options / options bag | `field?: Type` |
| Config interface (`src/configs/`) | `field: Type \| null` |
| Domain / HTTP / processor / Repository — data param | `param: Type \| null` |
| Domain / HTTP / processor / Repository — filter param | `param: Type \| null` (an additive domain-level filter may use `?`) |
| Prisma return | `Type \| null` |

## The controller and the boundary

Prefer **passing the whole request DTO** into the HTTP service (`userProfileHttpService.updateProfile(userId, body)`). Normalize `undefined → null` only when a domain or HTTP method takes a discrete `T | null` param and the DTO field is optional:

```ts
const field = dto.field ?? null;
return this.userProfileHttpService.updateSomething(userId, field);
```

A domain or HTTP signature that accepts `bio?: string` has pushed the ambiguity one layer deeper and made every downstream call site re-decide what an absent value means.

## Consequences

- **No `any`.** Not as a param type, not as a cast, not as a generic argument.
- **A shape this module owns is a named type on every public method.** Controllers, HTTP
  services, domains, and repositories declare returns and parameters as `I*` interfaces,
  Prisma models, primitives, or request/response DTO types (`rules/naming.md`,
  `rules/architecture.md`). `Promise<unknown>`, `Record<string, unknown>`,
  `Record<any, unknown>`, and `Record<string, any>` are not stand-ins for an owned payload —
  map a Prisma `groupBy` / aggregate / wide inference into the named type inside the
  repository before it leaves that method.
- **`unknown` is only a narrowing input.** Use it on a `catch` binding before a type guard, or
  on a third-party callback value before casting or narrowing into a named type we own. It is
  not a public return type, not a field on an `I*` we declare, and not a way to silence
  typecheck on unfinished code.
- **No ignored null checks.** A non-null assertion (`!`) is permitted only where the value is structurally guaranteed and the compiler cannot see it — a `ConfigService.get` for a key the config module declares required is the canonical case. Anywhere else, handle the null.
- **No `as` cast across a boundary** to silence a null mismatch. The mismatch is the finding.
- **An `as` that narrows a value a third party hands in untyped is legitimate.** A library callback typed `unknown`, `object`, or an opaque marker interface gives the compiler nothing to work with, and the cast is where our knowledge of the real shape enters. What is a defect is `as` between two types WE own, forcing them to agree instead of fixing whichever one is wrong.
