# Naming

## File naming (strict)

```
<module>.<noun-or-action>[.<sub>].<role>.ts
```

- Every file starts with the `<module>.` prefix. No exception — `user.not-found.exception.ts`, never `not-found.exception.ts`.
- A dot separates segments. A dash appears ONLY inside one segment, for a compound noun: `user.mobile-number.dto.ts`, `notification.email.processor.ts`, `user.forgot-password-reset.request.dto.ts`.
- Folders are lowercase kebab-case.

### Role suffix (closed list)

```
.service   .repository   .controller   .guard   .strategy   .decorator
.interceptor   .filter   .middleware   .pipe   .processor   .indicator
.factory   .validation   .util   .dto   .doc   .module
.enum   .constant   .interface   .exception
```

Anything else is invalid.

- **DTO files always end `.dto.ts`.** Request and response DTOs live under `dtos/request/` and `dtos/response/` and carry the direction in the name: `user.create.request.dto.ts`, `user.profile.response.dto.ts`. A DTO shared by both directions sits directly in `dtos/` (`user.mobile-number.dto.ts`).
- **One exception per file.** `<module>.<kebab-error>.exception.ts` — `user.password-not-match.exception.ts`. Never a barrel of exception classes.
- **Swagger doc files** are `<module>.<scope>.doc.ts` under `docs/` (`user.admin.doc.ts`), exporting one decorator factory per endpoint.

## Identifier conventions

| Type | Rule | Example |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserService`, `UserRepository`, `UserAdminController` |
| Interface | `I` + PascalCase | `IUser`, `IPaginationQuery`, `IRequestApp` |
| Enum type | `Enum` + PascalCase | `EnumQueue`, `EnumUserStatusCodeError`, `EnumPolicyAction` |
| Enum key AND value | camelCase | `notFound`, `notificationEmail`, `superAdmin` |
| Constant (object, array, primitive) | PascalCase | `AuthJwtAccessGuardKey`, `UserDefaultAvailableSearch` |
| Method / variable / field | camelCase | `findById`, `perPage` |
| Exception class | `<Module><Descriptor>Exception` | `UserNotFoundException` |
| Request DTO | `<Module>...RequestDto` | `UserCreateRequestDto` |
| Response DTO | `<Module>...ResponseDto` | `UserProfileResponseDto` |
| Payload interface | `I<Module><Action>Payload` | `INotificationSendPushPayload` |
| Data shape | `I` + PascalCase | `IUser`, `IRequestLog`, `IActivityLogMetadata` |

## Rules that get broken most often

- **Every type name starts with `I`.** Interfaces, payload shapes, option bags, data shapes. `IUser`, not `User` (the bare name belongs to the Prisma generated model — colliding with it is the exact confusion the prefix prevents). Interfaces describe DATA here, not service behavior — see the header-interface rule in `rules/operational.md`.
- **Enums are `Enum`-prefixed PascalCase with camelCase keys AND camelCase string values.** `UPPER_SNAKE_CASE` is wrong on both halves. Error-code enums use numeric values instead (`EnumUserStatusCodeError.notFound = 5150`); see `rules/exceptions.md`.
- **One enum concern per file**, named `<module>.<concern>.enum.ts`. Status-code enums always get their own file: `<module>.status-code.enum.ts`.
- **Constants are PascalCase for everything** — typed objects, arrays, and lone primitives alike. No `UPPER_SNAKE_CASE`, no `camelCase`.
- **DI tokens are rare.** Prefer direct class injection (a repository is injected as a class, never behind `@Inject`). When a token genuinely IS needed, name it PascalCase and wrap the value in `Symbol()`.
- **`Dto` suffix goes on BOTH the class name and the file name.** A DTO is the module's request/response transport shape.
- **Payload interface names put the KIND last:** `INotificationSendPushPayload`, never `INotificationPayloadSendPush`.

## Case convention

Everything on the wire and in the code is **camelCase** — request DTO fields, response DTO fields, query params, route params, Prisma columns, event and job payload fields, i18n keys. This is uniform and there is no snake_case surface anywhere in the project. Do not import a snake_case convention from another codebase.

Types stay PascalCase; enum types keep the `Enum` prefix.

### Redis keys — a config pattern, not a prefix append

A Redis key is a full `keyPattern` string in a config file, with `{placeholder}` tokens the consumer fills via `.replace('{token}', value)`. The canonical form is `session.config`'s `'User:{userId}:Session:{sessionId}'`.

- **Every segment is `PascalCase`.** `User:{userId}:Session:{sessionId}`, never `user:...:session:...` and never an inline lowercase segment like `` `${prefix}:lock:${id}` ``.
- **No prefix-append.** A `cachePrefixKey: 'TwoFactor'` glued with `` `${prefix}:${x}` `` in the consumer hides the real key shape and invites an ad-hoc lowercase segment. Store the whole pattern in config; when one prefix backs two shapes, store two patterns (`challengeKeyPattern`, `lockKeyPattern`).
- Keyv / BullMQ library `namespace` options (`'Cache'`, `'Queue'`) are not app-built keys — leave them.

## Everything is renameable — best practice wins

**There is no frozen surface in this repo.** No external client depends on it, so a breaking rename is never a reason to keep a worse name. If the current name is wrong, rename it. Compatibility is not a design input here.

Two names are simply not yours to pick, for a different reason: Prisma-generated types, enums, and delegate accessors are schema-owned (describe the change, the owner applies it), and `IRequestApp`'s express/passport fields are framework augmentation.

### Some renames strand live runtime state — that is a deploy step, not a compat concern

A handful of identifiers are read back out of state that already exists at deploy time. Renaming them is fine; renaming them **silently** loses data. These fail at RUNTIME with `tsc` green:

| Rename | What is already out there, and what must accompany it |
|---|---|
| `EnumQueue` value (queue name) | jobs sitting in the old queue are orphaned — nothing consumes them. Drain the queue before deploying |
| BullMQ job name | the processor dispatch no longer matches in-flight jobs. Drain the queue before deploying |
| BullMQ job payload field (`I<Module><Action>Payload`) | jobs already in Redis reach a processor expecting new field names. Drain the queue before deploying |
| JWT payload field | every issued token decodes wrong — every live session dies. Ship it as a forced re-login, deliberately |
| Pagination cursor payload field | every base64 cursor a client holds fails the shape check; clients mid-scroll cannot advance. Ship in a window where a dead cursor is acceptable |
| i18n key path | the key is the link between an exception's `messagePath` and `languages/*/<module>.json`. Rename both halves together, in every language |

Do the rename. Just name the operational step in your hand-back so it reaches the deploy.

## Never mirror a type that already has a name

If a shape already exists as a named type, import it. A hand-written inline copy is a mirror: it drifts silently because nothing makes the two move together. A structural SUBSET is still a mirror — restating three fields of `IUser` inline means importing `IUser` and picking, not retyping.

An inline object type is fine when it mirrors nothing. The test: does a named type for this shape already exist, or is this a structural subset of one? Yes → import it and delete the copy. No → inline is fine.
