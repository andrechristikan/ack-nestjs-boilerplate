# Case convention

**Everything on the wire and in the code is camelCase.** Request DTO fields, response DTO
fields, query params, route params, Prisma columns, BullMQ job payload fields, i18n keys, and
feature-flag keys. This is uniform and there is no snake_case surface anywhere in the project.
Do not import a snake_case convention from another codebase.

Types stay PascalCase; enum types keep the `Enum` prefix. Symbol-level naming is
`rules/naming.md` — this file is the CASE half only.

| Surface | Case | Example |
|---|---|---|
| request / response DTO field | camelCase | `mobileNumber`, `perPage` |
| query param, route param | camelCase | `?perPage=10`, `:workspaceId` |
| Prisma column | camelCase | `deletedAt`, `createdBy` |
| BullMQ job payload field | camelCase | `userId`, `templateName` |
| i18n key segment | camelCase | `user.error.notFound` |
| feature-flag key and metadata key | camelCase | `loginWithGoogle` |
| enum key AND enum string value | camelCase | `notFound`, `superAdmin` |
| class, interface, enum type, DTO | PascalCase | `UserService`, `IUser`, `EnumQueue` |
| constant of any kind | PascalCase | `UserDefaultAvailableSearch` |
| route path segment | kebab-case | `/mobile-number`, `/join-request` |
| folder | kebab-case | `feature-flag/`, `term-policy/` |
| file segment | kebab-case within a dot segment | `user.mobile-number.dto.ts` |

**`UPPER_SNAKE_CASE` exists nowhere** — not for enum keys, not for enum values, not for
constants, not for DI tokens. A `LOGIN_WITH_GOOGLE` or a `MAX_RETRY` is a defect on sight.

**The kebab ↔ camel mapping is one-to-one and load-bearing.** A route segment
`mobile-number` is the field `mobileNumber`; `sign-up` is `signUp`; `join-request` is
`joinRequest`. Never collapse a kebab route segment to a single lowercase word (`signup`) —
that breaks the mapping the whole repo relies on to move between a path, a DTO field, an i18n
key, and a method name.

## Redis keys — a config pattern, not a prefix append

A Redis key is a full `keyPattern` string in a config file, with `{placeholder}` tokens the
consumer fills via `.replace('{token}', value)`. The canonical form is `session.config`'s
`'User:{userId}:Session:{sessionId}'`.

- **Every segment is `PascalCase`.** `User:{userId}:Session:{sessionId}`, never
  `user:...:session:...` and never an inline lowercase segment like `` `${prefix}:lock:${id}` ``.
- **No prefix-append.** A `cachePrefixKey: 'TwoFactor'` glued with `` `${prefix}:${x}` `` in
  the consumer hides the real key shape and invites an ad-hoc lowercase segment. Store the
  whole pattern in config; when one prefix backs two shapes, store two patterns
  (`challengeKeyPattern`, `lockKeyPattern`).
- Keyv / BullMQ library `namespace` options (`'Cache'`, `'Queue'`) are not app-built keys —
  leave them.
