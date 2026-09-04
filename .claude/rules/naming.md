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

Four more are valid, but ONLY inside the one tree that owns them — they are not general-purpose suffixes:

| Suffix | Only under | Example |
|---|---|---|
| `.config` | `src/configs/` | `workspace.config.ts` |
| `.data` | `src/migration/data/` | `migration.role.data.ts` |
| `.seed` | `src/migration/seeds/` | `migration.user.seed.ts` |
| `.base` | `src/migration/bases/`, `src/queues/bases/` | `queue.processor.base.ts` |

Anything else is invalid.

### The layer segment on a service, and the module files

A service file carries the LAYER it belongs to, and the layer decides which module provides it
(`rules/architecture.md`, `rules/nest-wiring.md`):

```
<module>[.<concern>].service.ts             →  <Module>[<Concern>]Service            domain
<module>[.<concern>].http.service.ts        →  <Module>[<Concern>]HttpService        HTTP
<module>[.<concern>].processor.service.ts   →  <Module>[<Concern>]ProcessorService   queue
```

A feature's modules are named for the layer they provide, and only the ones with something to
provide exist:

```
<module>.util.module.ts         →  <Module>UtilModule
<module>.repository.module.ts   →  <Module>RepositoryModule
<module>.module.ts              →  <Module>Module
<module>.http.module.ts         →  <Module>HttpModule
<module>.processor.module.ts    →  <Module>ProcessorModule
```

`src/router/` follows the same shape with `router` as the module prefix —
`router.http.<scope>.module.ts` → `RouterHttp<Scope>Module`, and
`router.processor.module.ts` → `RouterProcessorModule` (`rules/router.md`).

- **DTO files always end `.dto.ts`**, and a DTO under `dtos/request/` or `dtos/response/` always carries its direction segment:

  ```
  <module>[.<concern>].request.dto.ts    →  <Module>[<Concern>]RequestDto
  <module>[.<concern>].response.dto.ts   →  <Module>[<Concern>]ResponseDto
  <module>.<noun>.dto.ts                 →  <Module><Noun>Dto        (shared by both directions)
  ```

  **`<concern>` is OPTIONAL and it is not necessarily a verb.** It is an action
  (`user.create.request.dto.ts`), a noun (`role.ability.request.dto.ts`,
  `term-policy.content.request.dto.ts`), or **absent when the DTO is the module's canonical
  request or response shape** — `device.request.dto.ts` → `DeviceRequestDto`,
  `country.request.dto.ts` → `CountryRequestDto`. Do not invent a filler segment to make a
  canonical DTO look like the others.

  The direction segment is what is NOT optional. A file in `dtos/request/` named
  `<module>.<concern>.dto.ts` while its class is `<Module><Concern>RequestDto` is the defect —
  the file and the class must agree on the direction.

  A DTO genuinely shared by both directions, or a nested value object, sits directly in `dtos/`
  and its class ends in a bare `Dto` (`role.ability.dto.ts` → `RoleAbilityDto`). **A class
  ending in `RequestDto` or `ResponseDto` does not belong there** — it belongs in the folder its
  direction names.

- **One file MAY hold sibling DTOs of ONE concern, and it is named for the concern, not for any
  one class.** `user.check.request.dto.ts` holds `UserCheckUsernameRequestDto` and
  `UserCheckEmailRequestDto`; `user.mobile-number.request.dto.ts` holds
  `UserAddMobileNumberRequestDto` and `UserUpdateMobileNumberRequestDto`;
  `user.profile.request.dto.ts` holds `UserUpdateProfileRequestDto` and
  `UserUpdateProfilePhotoRequestDto`. The siblings are normally variants of each other —
  `extends`, `PickType`, `OmitType`.

  So a file name that does not match the class name is NOT a violation on its own. **Open the
  file before calling one:** the question is whether every class in it belongs to the concern
  the file names, not whether the first class happens to spell it out. Two unrelated concerns
  in one file is the defect.
- **One exception per file.** `<module>.<kebab-error>.exception.ts` — `user.password-not-match.exception.ts`. Never a barrel of exception classes.
- **Swagger doc files** are `<module>.<scope>.doc.ts` under `docs/` (`user.admin.doc.ts`), exporting one decorator factory per endpoint.

## Identifier conventions

| Type | Rule | Example |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserService`, `UserHttpService`, `UserRepository`, `UserAdminController` |
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

- **Every type name starts with `I`.** Interfaces, payload shapes, option bags, data shapes. `IUser`, not `User` (the bare name belongs to the Prisma generated model — colliding with it is the exact confusion the prefix prevents). Interfaces describe DATA here, not service behavior — see the header-interface rule in `rules/architecture.md`.
- **Enums are `Enum`-prefixed PascalCase with camelCase keys AND camelCase string values.** `UPPER_SNAKE_CASE` is wrong on both halves. Error-code enums use numeric values instead (`EnumUserStatusCodeError.notFound = 5150`); see `rules/exceptions.md`.
- **One enum concern per file**, named `<module>.<concern>.enum.ts`. Status-code enums always get their own file: `<module>.status-code.enum.ts`.
- **Constants are PascalCase for everything** — typed objects, arrays, and lone primitives alike. No `UPPER_SNAKE_CASE`, no `camelCase`.
- **DI tokens are rare.** Prefer direct class injection (a repository is injected as a class, never behind `@Inject`). When a token genuinely IS needed, name it PascalCase and wrap the value in `Symbol()`.
- **`Dto` suffix goes on BOTH the class name and the file name.** A DTO is the module's request/response transport shape.
- **Payload interface names put the KIND last:** `INotificationSendPushPayload`, never `INotificationPayloadSendPush`.

## Case

Every casing decision — camelCase on the wire, PascalCase types and constants, kebab paths and
folders, Redis key patterns — is `rules/case-convention.md`.

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

