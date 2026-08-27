# Enums

## Shape

```ts
export enum EnumUserStatus {
    active = 'active',
    inactive = 'inactive',
}
```

- **Type name is `Enum` + PascalCase.** `EnumQueue`, `EnumPolicyAction`, `EnumUserStatus`.
- **Keys AND string values are camelCase.** `UPPER_SNAKE_CASE` is wrong on both halves
  (`rules/case-convention.md`).
- A string enum's value normally equals its key. Diverging is allowed only when the wire value
  is genuinely different from the code name, and then it is worth a line saying which is which.

Two families take numeric values instead:

| Family | Values | Example |
|---|---|---|
| status-code enums | 5-digit integers, sequential from the module block | `EnumUserStatusCodeError.notFound = 51000` |
| ordered scales | small integers where the ORDER is the meaning | `EnumQueuePriority.high = 1` |

Status-code allocation is `rules/status-code.md` and it is a procedure, not a preference.

## One concern per file

`<module>.<concern>.enum.ts`, in the module's `enums/` folder. **A status-code enum always gets
its own file:** `<module>.status-code.enum.ts`. Never a grab-bag `enums.ts`.

A file may hold two enums when they are the same concern seen twice — `EnumQueue` beside
`EnumQueuePriority`, `EnumLoggerLevel` beside `EnumLoggerSeverity`. It may not hold two
unrelated ones.

## Prisma-owned enums are imported, never re-declared (HARD)

An enum declared in `prisma/schema.prisma` is imported from `@generated/prisma-client`
(aliased `@prisma/client`):

```ts
import { EnumUserStatus } from '@generated/prisma-client';
```

A module-local re-declaration of a schema-owned enum is a second source of truth with a
pointless mapper between two identical enums. **Renaming a persisted enum value is a data
migration, not a rename** — describe it; the owner applies it (`rules/prisma-schema.md`).

## Reference by member, never by literal

`EnumUserStatusCodeError.notFound`, never `51000`. `EnumQueue.notificationEmail`, never
`'notificationEmail'`. A literal compiles fine and silently survives a rename.

The exception is a decorator factory where DI and imports are not the issue but the VALUE is
the identity — `@QueueProcessor(EnumQueue.notificationEmail)` still uses the member; there is no
place a raw string is correct.

## Enum-typed query filters

A query param filtered against an enum uses `@PaginationQueryFilterInEnum<TEnum>('field',
<Module>Default<Concern>)`, with the default set as a PascalCase constant under
`<module>/constants/` (`rules/pagination.md`). Never a hand-parsed `@Query` plus a manual
`includes` check.

## Adding a member

- **Reuse before adding.** Duplicate near-synonyms make the surface unreadable.
- A new status-code member follows the full procedure in `rules/status-code.md`: sequential,
  no gaps, an exception class, an i18n key in EVERY language file, and a deliberate
  `httpStatus`.
- A new member of an enum that is persisted in Prisma is a SCHEMA change — describe it, do not
  add it to a local copy.
- A new member of an enum a `switch` dispatches on means every such `switch` is revisited.
  TypeScript will not tell you when the switch has a `default`.
