# Strict null types

TypeScript runs with `strict`, `strictNullChecks`, and `noImplicitAny`. Two rules carry all the weight:

1. **`undefined` is allowed ONLY at the input boundary.** Request DTO body, Query DTO. Every layer deeper speaks `null`.
2. **Do not invent `field?: Type | null` on new code.** It is ambiguous — a caller cannot tell whether omitting the field and passing `null` mean the same thing. Pick one. A few call sites already carry the union (utils / JWT / geo bags); do not spread the pattern, and clean them when you touch the file.

## Where each convention applies

| Layer | Convention |
|---|---|
| Request / Query DTO (input boundary) | `field?: Type` |
| Response DTO | `field?: Type` with `@Expose()` when optional; `field: Type \| null` when the value is always present-or-null |
| Module `I*` interface — data | `field: Type \| null` |
| Module `I*` interface — request lifecycle or external spec (JWT, Prisma) | `field?: Type` |
| Exception options / options bag | `field?: Type` |
| Config interface (`src/configs/`) | `field: Type \| null` |
| Service / Repository — data param | `param: Type \| null` |
| Service / Repository — filter param | `param: Type \| null` (an additive service-level filter may use `?`) |
| Prisma return | `Type \| null` |

## The controller and the boundary

Prefer **passing the whole request DTO** into the service (`userService.updateProfile(userId, body)`). Normalize `undefined → null` only when a service method takes a discrete `T | null` param and the DTO field is optional:

```ts
return this.userService.updateSomething(userId, dto.field ?? null);
```

A service signature that accepts `bio?: string` has pushed the ambiguity one layer deeper and made every downstream call site re-decide what an absent value means.

## Consequences

- **No `any`.** Not as a param type, not as a cast, not as a generic argument. Where a shape is genuinely unknown, `unknown` plus a narrowing check is the answer.
- **No ignored null checks.** A non-null assertion (`!`) is permitted only where the value is structurally guaranteed and the compiler cannot see it — a `ConfigService.get` for a key the config module declares required is the canonical case. Anywhere else, handle the null.
- **No `as` cast across a boundary** to silence a null mismatch. The mismatch is the finding.
