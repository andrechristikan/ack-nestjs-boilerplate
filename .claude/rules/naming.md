# Naming

## File naming (strict)

```
<module>.<noun-or-action>[.<sub>].<role>.ts
```

- Every file under `src/` starts with the `<module>.` prefix — `user.not-found.exception.ts`, never `not-found.exception.ts`. The root bootstrap files are the one exception: `src/main.ts`, `src/migration.ts`, `src/instrument.ts` and `src/swagger.ts` carry no prefix and no role suffix, and each has an exact alias (`@main`, `@migration`, `@instrument`, `@swagger`). Generated code under `src/generated/**` is named by its generator. A file under `scripts/` is kebab-case for what it does (`generate-secret.ts`).
- A dot separates segments. A dash appears ONLY inside one segment, for a compound noun: `user.mobile-number.dto.ts`, `notification.email.processor.ts`, `user.forgot-password-reset.request.dto.ts`.
- Folders are lowercase kebab-case. A folder that holds a kind of file is plural: `domains/`, `services/`, `caches/`, `queues/`, `factories/`, `utils/`, `repositories/`, `contracts/`. Feature folders and kit modules keep the module name (`user/`, `src/common/cache/`).

### Role suffix (closed list)

```
.domain    .service   .repository   .controller   .guard   .strategy   .decorator
.interceptor   .filter   .middleware   .pipe   .processor   .indicator
.factory   .validation   .util   .queue   .cache   .dto   .doc   .module
.enum   .constant   .interface   .exception   .contract
```

Four more are valid, but ONLY inside the one tree that owns them — they are not general-purpose suffixes:

| Suffix | Only under | Example |
|---|---|---|
| `.config` | `src/configs/` | `workspace.config.ts` |
| `.data` | `src/migration/data/` | `migration.role.data.ts` |
| `.seed` | `src/migration/seeds/` | `migration.user.seed.ts` |
| `.base` | `src/migration/bases/`, `src/queues/bases/` | `queue.processor.base.ts` |

Anything else is invalid.

### The layer files, and the module files

A class file carries the LAYER it belongs to, and the layer decides which module provides it
(`rules/architecture.md`, `rules/nest-wiring.md`):

```
<module>[.<concern>].domain.ts              →  <Module>[<Concern>]Domain             domain
<module>[.<concern>].http.service.ts        →  <Module>[<Concern>]HttpService        HTTP
<module>[.<concern>].processor.service.ts   →  <Module>[<Concern>]ProcessorService   queue
```

A repository is the persistence port (`rules/architecture.md`):

```
<module>[.<concern>].repository.ts            →  <Module>[<Concern>]Repository
<module>.[<concern>-]repository.interface.ts  →  I<Module>[<Concern>]Repository
```

Domain is a role of its own, not a `Service`. It lives under `domains/`, and it does not merge
concerns into one class: `UserDomain` and `UserPasswordDomain` stay two classes.

A cache class is not a service. Its file lives under the feature's `caches/` folder, not
`services/`, and it has no `Service` in the name (`rules/cache.md`):

```
<module>[.<concern>].cache.ts               →  <Module>[<Concern>]Cache
```

`<feature>.domain.module.ts` still provides it (`rules/nest-wiring.md`).

A queue class carries the queue it enqueues onto, and lives in the feature's `queues/` folder
(`rules/queue.md`). Its `RegisterQueueOptionsFactory` lives in `factories/`:

```
<module>[.<concern>].queue.ts               →  <Module>[<Concern>]Queue
<module>[.<concern>].queue.factory.ts       →  <Module>[<Concern>]QueueFactory
```

A feature's modules are named for the layer they provide, and only the ones with something to
provide exist:

```
<module>.repository.module.ts   →  <Module>RepositoryModule
<module>.domain.module.ts       →  <Module>DomainModule
<module>.http.module.ts         →  <Module>HttpModule
<module>.processor.module.ts    →  <Module>ProcessorModule
```

`src/router/` follows the same shape with `router` as the module prefix —
`router.http.<scope>.module.ts` → `RouterHttp<Scope>Module`, and
`router.processor.module.ts` → `RouterProcessorModule` (`rules/router.md`).

- **DTO files always end `.dto.ts`**, and a DTO under `dtos/request/` or `dtos/response/` always carries its direction segment:

  ```
  <module>[.<concern>].request.dto.ts    →  <Module>[<Concern>]RequestSchema  + <Module>[<Concern>]RequestDto
  <module>[.<concern>].response.dto.ts   →  <Module>[<Concern>]ResponseSchema + <Module>[<Concern>]ResponseDto
  <module>.<noun>.dto.ts                 →  <Module><Noun>Schema + <Module><Noun>Dto   (shared by both directions)
  ```

  **A DTO file exports a zod schema and the type inferred from it** — the `Schema` const and
  the `Dto` type, named alike (`rules/dto.md`). The const is what a decorator or a doc factory
  receives; the type is what a signature carries.

  **`<concern>` is OPTIONAL and it is not necessarily a verb.** It is an action
  (`user.create.request.dto.ts`), a noun (`policy.update.request.dto.ts`,
  `term-policy.contents.request.dto.ts`), or **absent when the DTO is the module's canonical
  request or response shape** — `device.request.dto.ts` → `DeviceRequestDto`,
  `country.request.dto.ts` → `CountryRequestDto`. Do not invent a filler segment to make a
  canonical DTO look like the others.

  The direction segment is what is NOT optional. A file in `dtos/request/` named
  `<module>.<concern>.dto.ts` while its exports are `<Module><Concern>Request*` is the defect —
  the file and its exports must agree on the direction.

  A DTO genuinely shared by both directions, or a nested value object, sits directly in `dtos/`
  and its exports end in a bare `Schema` / `Dto` (`user.two-factor.dto.ts` →
  `UserTwoFactorSchema` + `UserTwoFactorDto`). **An export ending in `RequestDto` or
  `ResponseDto` does not belong there** — it belongs in the folder its
  direction names.

- **One DTO file holds ONE schema and its `Dto` type, and the file is named for that schema.**
  `user.check-email.request.dto.ts` holds `UserCheckEmailRequestSchema` +
  `UserCheckEmailRequestDto`; its sibling `user.check-username.request.dto.ts` is its own file
  and may build on it with the zod combinators — `.extend()`, `.pick()`, `.omit()`,
  `.partial()` (`rules/dto.md`). A file holding a second schema is the defect.
- **One exception per file.** `<module>.<kebab-error>.exception.ts` — `user.password-not-match.exception.ts`. Never a barrel of exception classes.
- **Controllers** are `<module>.<scope>.controller.ts` → `<Module><Scope>Controller` (`user.admin.controller.ts` → `UserAdminController`). One file per scope, with no concern segment: a scope is one controller whatever its size, and the scope is never folded into a hyphenated word — `user-admin` names no scope this project has.
- **Swagger doc files** are `<module>.<scope>.doc.ts` under `docs/` (`user.admin.doc.ts`), exporting one decorator factory per endpoint.

## Identifier conventions

| Type | Rule | Example |
|---|---|---|
| Class | PascalCase, module-prefixed | `UserDomain`, `UserHttpService`, `UserRepository`, `UserAdminController` |
| Queue class | `<Module>[<Concern>]Queue` | `NotificationQueue`, `NotificationEmailQueue`, `WorkspaceQueue` |
| Queue factory | `<Module>[<Concern>]QueueFactory` | `NotificationQueueFactory`, `WorkspaceQueueFactory` |
| Interface | `I` + PascalCase | `IUser`, `IUserRepository`, `IPaginationQuery` |
| Enum type | `Enum` + PascalCase | `EnumQueue`, `EnumUserStatusCodeError`, `EnumPolicyAction` |
| Enum key AND value | camelCase | `notFound`, `notificationEmail`, `superAdmin` |
| Constant (object, array, primitive) | PascalCase | `AuthJwtAccessGuardKey`, `UserDefaultAvailableSearch` |
| Method / variable / field | camelCase | `findById`, `perPage` |
| Injected field / constructor param | camelCase of the class | `authDomain: AuthDomain`, `sessionCache: SessionCache` |
| Exception class | `<Module><Descriptor>Exception` | `UserNotFoundException` |
| Request schema + type | `<Module>...RequestSchema` / `<Module>...RequestDto` | `UserCreateRequestSchema`, `UserCreateRequestDto` |
| Response schema + type | `<Module>...ResponseSchema` / `<Module>...ResponseDto` | `UserProfileResponseSchema`, `UserProfileResponseDto` |
| Payload interface | `I<Module><Action>Payload` | `INotificationSendPushPayload` |
| Data shape | `I` + PascalCase | `IUser`, `IRequestLog`, `IActivityLogMetadata` |
| Narrowed list read | `I<Module>List` | `IUserList`, `ISessionList` |
| Prisma select constant | `<Module>[<Audience>][<Concern>]Select` | `UserAdminListSelect`, `UserRefSelect` |
| Contract table + its row | `<Module><Concept>Contract` / `I<Module><Concept>Contract` | `ActivityLogActionContract`, `UserCreateContract` |

**`Row` is not a suffix here.** A type describing one record of a narrowed read is named for
what the read returns — `IUserList`, `IAnalyticNearLockout` — never `…Row`. The plural sits in
the method's return type, not in the name of the shape.

**A select constant names its audience only when it has one.** `UserAdminListSelect` serves the
admin list and says so; a constant several audiences read keeps a neutral name and a JSDoc that
claims none. A name that promises an audience the code does not enforce is worse than a plain
one.

A contract is a table the code decides by rather than a value it merely holds: which metadata an
activity action requires, which channels a notification kind allows, which defaults a create mode
writes. It lives in `contracts/` of the module that owns the decision, or of the kit module when
the decision is the kit's (`src/common/file/contracts/`). Its row carries an `I<…>Contract`
interface when the row is a shape; a table whose rows are plain values needs none.

## Rules that get broken most often

- **Every type name starts with `I`.** Interfaces, payload shapes, option bags, data shapes. `IUser`, not `User` (the bare name belongs to the Prisma generated model — colliding with it is the exact confusion the prefix prevents). Data-shape interfaces describe DATA, not domain/HTTP/processor behavior. The one behavioral header is `I*Repository` — the persistence port (`rules/architecture.md`).
- **An `I*` declaration lives under `interfaces/`, not in the class file.** The repository
  port is `interfaces/<module>.[<concern>-]repository.interface.ts` beside
  `repositories/<module>[.<concern>].repository.ts` that `implements` it. Data-shape
  interfaces for a concern sit in `interfaces/<module>[.<concern>].interface.ts`, the module's
  collection. Exporting the interface from the same file as the
  `@Injectable()` class that implements or primarily uses it is the defect — the class file
  imports the interface. Config interfaces beside `registerAs` in `src/configs/*.config.ts`
  stay with the config file (`rules/config.md`).
- **A filename carries at most FOUR dot-separated name parts, an `*.interface.ts` at most
  THREE.** Extra middle segments collapse with `-`, and the last part before the kind stays the
  role: `user.password-repository.interface.ts`,
  `device.ownership-analytic-repository.interface.ts`. A spec mirrors its source name plus
  `.spec.ts` and is counted before that suffix, so it may carry one part more.
- **At most three constants files.** `constants/<module>.constant.ts` holds what the module
  owns — store and metadata keys, Prisma selects, and any other constant of its own;
  `<module>.doc.constant.ts` holds the Swagger `@ApiParam` / `@ApiQuery` arrays
  (`rules/http.md`) and exists only when the module has those arrays;
  `<module>.list.constant.ts` holds the list-endpoint allow-lists and filter defaults
  (`rules/pagination.md`) and exists only when the module has a list endpoint. An empty
  constants file is the defect — delete it. A fourth file split by some other concern is the
  defect — that constant belongs in `<module>.constant.ts`.
- **One contract per file.** `contracts/<module>.<concept>.contract.ts` exports one table
  (`rules/code-style.md` tags it `@public`). Two tables in a file means two files.
- **A data constant never lives in a class file.** A list, a map, a threshold, a set of enum
  members a class reads — it belongs in one of the module's constants files above,
  imported by the class. A module-scope `const` inside a domain, service, repository, controller, guard,
  util, cache or processor file is the defect, whatever its casing. What legitimately sits at
  module scope in those trees is the class itself; a decorator in a `*.decorator.ts`, a schema
  in a `*.validation.ts`, and the exported doc factory functions in a `*.doc.ts` are that file's
  own subject, not data.
- **One interface per file, except the module's own collection.** A behavioural header — an
  `I*Repository` port — is alone in its file. Data shapes and type aliases for a concern collect
  in `interfaces/<module>[.<concern>].interface.ts`, which is what that file is FOR; a shape
  does not get a file of its own to be symmetric with the port.
- **Enums are `Enum`-prefixed PascalCase with camelCase keys AND camelCase string values.** `UPPER_SNAKE_CASE` is wrong on both halves. Error-code enums use numeric values instead (`EnumUserStatusCodeError.notFound = 51000`); see `rules/exceptions.md`.
- **One enum concern per file**, named `<module>.<concern>.enum.ts`. Status-code enums always get their own file: `<module>.status-code.enum.ts`.
- **Constants are PascalCase for everything** — typed objects, arrays, and lone primitives alike. No `UPPER_SNAKE_CASE`, no `camelCase`.
- **DI tokens are rare.** Prefer direct class injection (a repository is injected as a class, never behind `@Inject`). When a token genuinely IS needed, name it PascalCase and wrap the value in `Symbol()`.
- **An injected field is the class name with the first letter lowercased.** Dropping a layer word is wrong: `authService: AuthDomain` is not the field; `authDomain` is. Same for every injectable — `UserHttpService` → `userHttpService`, `ActivityLogRepository` → `activityLogRepository`, `AuthPasswordUtil` → `authPasswordUtil`, `SessionCache` → `sessionCache`, `NotificationEmailQueue` → `notificationEmailQueue`.
- **A DTO file exports a `Schema` const and a `Dto` type, and the file name carries `.dto.ts`.** A DTO is the module's request/response transport shape (`rules/dto.md`).
- **A method that asserts a boolean state answers `Promise<boolean>`, never a nullable row for the caller to truthiness-check.** Existence takes the `exists*` prefix — `existsById`, `existsByEmail`, `existsBySlug`; any other state names the state it asserts — `isUsedById`. A caller that needs the row calls the layer's read method instead: `get*` on a service, `find*` on a repository, with a `select` no wider than that caller reads.
- **A method that runs inside a caller-owned transaction takes the `InTx` suffix** — `createInTx`, `softDeleteByWorkspaceInTx`, `recordInTx` — and a required `tx: IDatabaseTransactionClient` as its first argument. A method without that suffix takes no `tx`. The method that opens a transaction is `DatabaseService.withTransaction` (`rules/database.md`).
- **Payload interface names put the KIND last:** `INotificationSendPushPayload`, never `INotificationPayloadSendPush`.

## `Pattern` and `Regex` on a config key

- **`Pattern` names a placeholder STRING** — a literal carrying `{placeholder}` segments a
  reader fills with `.replace()`. A `RegExp` never takes it.
- **`Regex` names a `RegExp`**: `workspace.slugRegex`, `project.slugRegex`.
- A placeholder string that is a **full URL** takes `Pattern`:
  `workspace.invite.linkPattern`, `workspace.invite.signUpLinkPattern`,
  `workspace.joinRequest.reviewLinkPattern`, `aws.s3.objectUrlPattern`,
  `aws.s3.cdnUrlPattern` (`rules/config.md`).
- A placeholder string that is a relative **fragment** takes `Pattern` when the fragment IS
  the whole value (`doc.jsonUrlPattern`), and is named for the thing it holds when the
  placeholder is incidental to what the key carries (`termPolicy.uploadContentPath`).

The reservation runs one way. A key named `Pattern` is a placeholder string, and a full-URL
placeholder string is named `Pattern`; a placeholder string that is neither is free to take
another name.

## Case

**Everything on the wire and in the code is camelCase.** Request DTO fields, response DTO
fields, query params, route params, Prisma columns, BullMQ job payload fields, i18n keys, and
feature-flag keys. Types stay PascalCase; enum types keep the `Enum` prefix.

| Surface | Case | Example |
|---|---|---|
| request / response DTO field | camelCase | `mobileNumber`, `perPage` |
| query param, route param | camelCase | `?perPage=10`, `:workspaceId` |
| Prisma column | camelCase | `deletedAt`, `createdBy` |
| BullMQ job payload field | camelCase | `userId`, `templateName` |
| i18n key segment | camelCase | `user.error.notFound` |
| feature-flag key and metadata key | camelCase | `loginWithGoogle` |
| enum key AND enum string value | camelCase | `notFound`, `superAdmin` |
| class, interface, enum type, DTO | PascalCase | `UserDomain`, `IUser`, `EnumQueue` |
| constant of any kind | PascalCase | `UserDefaultAvailableSearch` |
| route path segment | kebab-case | `/mobile-number`, `/join-request` |
| folder | kebab-case | `feature-flag/`, `term-policy/` |
| file segment | kebab-case within a dot segment | `user.mobile-number.dto.ts` |

**`UPPER_SNAKE_CASE` exists nowhere** — not for enum keys, not for enum values, not for
constants, not for DI tokens.

**The kebab ↔ camel mapping is one-to-one.** A route segment `mobile-number` is the field
`mobileNumber`. Never collapse a kebab segment to a single lowercase word (`signup`).

### Redis keys

A Redis key is a full `keyPattern` string in a config file, with `{placeholder}` tokens the
consumer fills — `HelperStringService.fillPattern` for two or more, a function-form
`.replace()` for one (`rules/code-style.md`). Canonical form:
`'User:{userId}:Session:{sessionId}'`.

- **Every segment is `PascalCase`.** Never `user:...:session:...` and never an inline
  lowercase segment like `` `${prefix}:lock:${id}` ``.
- **No prefix-append.** Store the whole pattern in config; when one prefix backs two shapes,
  store two patterns.
- Keyv / BullMQ library `namespace` options (`'Cache'`, `'Queue'`) are not app-built keys.

## Everything is renameable — best practice wins

**There is no frozen surface in this repo.** No external client depends on it, so a breaking rename is never a reason to keep a worse name. If the current name is wrong, rename it. Compatibility is not a design input here.

Two names are simply not yours to pick, for a different reason: Prisma-generated types, enums, and delegate accessors are schema-owned (describe the change, the owner applies it), and `IRequestApp`'s express/passport fields are framework augmentation.

### Some renames strand live runtime state — that is a deploy step, not a compat concern

A handful of identifiers are read back out of state that already exists at deploy time. Renaming them is fine; renaming them **silently** loses data. These fail at RUNTIME with `tsc` green:

| Rename | What is already out there, and what must accompany it |
|---|---|
| `EnumQueue` value (queue name) | jobs sitting in the old queue are orphaned — nothing consumes them. Drain the queue before deploying |
| BullMQ job name | the processor dispatch no longer matches in-flight jobs. Drain the queue before deploying |
| BullMQ job payload field (`I<Module><Action>QueuePayload`) | jobs already in Redis reach a processor expecting new field names. Drain the queue before deploying |
| JWT payload field | every issued token decodes wrong — every live session dies. Ship it as a forced re-login, deliberately |
| Pagination cursor payload field | every base64 cursor a client holds fails the shape check; clients mid-scroll cannot advance. Ship in a window where a dead cursor is acceptable |
| i18n key path | the key is the link between an exception's `messagePath` and `languages/*/<module>.json`. Rename both halves together, in every language |

Do the rename. Just name the operational step in your hand-back so it reaches the deploy.

