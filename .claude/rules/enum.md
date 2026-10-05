---
paths:
  - "**/enums/**"
  - "prisma/schema.prisma"
---

# Enums

A string value equals its key; diverge only when the wire value genuinely differs from the
code name. Three families take numeric values: status-code enums (5-digit, sequential from
the module block, `exceptions.md`), ordered scales where the order is the meaning
(`EnumQueuePriority.high = 1`), and quantities where the number is the value
(`EnumWorkspaceInviteExpiry.sevenDays = 7`, `src/modules/workspace/enums/workspace.enum.ts:13`).

## One file per module

Every enum a module owns sits in `<module>.enum.ts` in that module's `enums/` folder; its
status-code enum sits alone in `<module>.status-code.enum.ts`. An enum lives with the module
that owns its concept, never in a file that collects other modules' enums.

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
`PaginationQueryUtil.inEnum` / `.ninEnum` with the default set as a PascalCase constant in
`<module>.list.constant.ts` (`UserDefaultStatus`, `src/modules/user/constants/user.list.constant.ts:26`;
`dto.md`). Never a hand-parsed `@Query` plus a manual `includes`.

## Adding a member

- Reuse before adding; near-synonyms make the surface unreadable.
- A new status-code member follows `.claude/skills/ack-build/references/add-status-code.md`.
- A new member of an enum a `switch` dispatches on means every such `switch` is revisited;
  TypeScript stays silent when the switch has a `default`.
