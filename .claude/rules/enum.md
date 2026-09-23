---
paths:
  - "**/enums/**"
---

# Enums

Casing is `naming.md`: `Enum` + PascalCase type, camelCase keys and string values. A string
value normally equals its key; diverge only when the wire value genuinely differs from the
code name. Two families take numeric values: status-code enums (5-digit, sequential from the
module block, `exceptions.md`) and ordered scales where the order is the meaning
(`EnumQueuePriority.high = 1`).

## One concern per file

`<module>.<concern>.enum.ts` in the module's `enums/` folder. A status-code enum is alone in
`<module>.status-code.enum.ts`. A file may hold two enums that are one concern seen twice
(`EnumQueue` beside `EnumQueuePriority`, `EnumLoggerLevel` beside `EnumLoggerSeverity`), not
two unrelated ones, and never a grab-bag `enums.ts`.

## Where an enum lives

- A value the database stores (a status, a type, a role, a platform, a logged action) is
  declared in `prisma/schema.prisma` and imported from `@generated/prisma-client/client`.
  A module-local re-declaration is a second source of truth with a mapper between two
  identical enums. Adding or renaming a persisted member is a schema change (`database.md`).
- A TypeScript enum in `src/` is for what the database never stores: status-code blocks,
  queue and job names, transport and tooling scales, an option a request carries without
  being persisted as it stands.

## Reference by member

`EnumUserStatusCodeError.notFound`, never `51000`; `EnumQueue.notificationEmail`, never
`'notificationEmail'`; `EnumPaginationType.offset`, never `'offset'`. A literal compiles and
silently survives a rename. A decorator factory uses the member too
(`@QueueProcessor(EnumQueue.notificationEmail)`).

## Enum-typed query filters

A query param filtered against an enum is a field on the list schema; the HTTP service applies
`PaginationQueryUtil.inEnum` / `.ninEnum` with the default set as a PascalCase constant under
`<module>/constants/` (`dto.md`). Never a hand-parsed `@Query` plus a manual `includes`.

## Adding a member

- Reuse before adding; near-synonyms make the surface unreadable.
- A new status-code member follows the `ack-add-status-code` skill.
- A new member of an enum a `switch` dispatches on means every such `switch` is revisited;
  TypeScript stays silent when the switch has a `default`.
