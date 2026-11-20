# Naming

## Files

`<module>.<noun-or-action>[.<sub>].<role>.ts`. Every file under `src/` carries the `<module>.` prefix except `src/main.ts`, `src/migration.ts`, `src/bootstrap.ts`, `src/instrument.ts`, `src/swagger.ts`, `src/configure.ts`, `src/configs/index.ts` (the six entry files each aliased in `tsconfig.json` `paths`: `@main`, `@migration`, `@bootstrap`, `@instrument`, `@swagger`, `@configure`) and generated code. A dot separates segments; a dash sits only inside one segment for a compound noun (`user.mobile-number.service.ts`). At most four dot-separated name parts, three for `*.interface.ts`; a spec adds `.spec.ts` on top. Folders are kebab-case, plural when they hold a kind of file (`use-cases/`, `dtos/request/`). A feature module keeps its services in `services/` and its use cases in `use-cases/`, both flat, one class per file.

Role suffixes: `.use-case .service .repository .controller .guard .strategy .decorator .interceptor .filter .middleware .pipe .processor .indicator .factory .validation .util .queue .cache .dto .module .enum .constant .interface .exception .contract`; tree-bound: `.config` (`src/configs/`), `.data` and `.seed` (`src/migration/`), `.base` (`src/migration/bases/`, `src/common/queue/bases/`), `.template.hbs` (`templates/`; a per-language template is `<module>.<type>.<lang>.hbs`).

| File | Class |
| --- | --- |
| `<module>[.<concern>].service.ts` under `services/` | `<Module>[<Concern>]Service` |
| `<module>[.<concern>].<action>.use-case.ts` under `use-cases/` | `<Module>[<Concern>]<Action>UseCase`; `<action>` is the entry point's verb phrase (`user.sign-up.use-case.ts`, `UserSignUpUseCase`) with no module noun anywhere in the action (`ProjectCreateUseCase`, `ProjectUpdateSlugUseCase`, never `ProjectCreateProjectUseCase`), and a use case whose action is only the module noun is `<Module>UseCase` in `<module>.use-case.ts` (`HelloUseCase`); `<concern>` only where two use cases of one module share an action (`notification.email.process-send.use-case.ts`); a use case a processor calls is `<module>[.<concern>].process-<action>.use-case.ts`, class `<Module>[<Concern>]Process<Action>UseCase` |
| `<module>[.<concern>].repository.ts` + `<module>.[<concern>-]repository.interface.ts` | `<Module>[<Concern>]Repository` implements `I<Module>[<Concern>]Repository` |
| `<module>[.<concern>].cache.ts` under `caches/` | `<Module>[<Concern>]Cache` (no `Service`) |
| `<module>[.<concern>].queue.ts` under `queues/`; `<module>[.<concern>].queue.factory.ts` under `factories/` | `<Module>[<Concern>]Queue`; `<Module>[<Concern>]QueueFactory` (`NotificationEmailQueueFactory`) |
| `<module>.module.ts` / `<module>.use-case.module.ts` | `<Module>Module` / `<Module>UseCaseModule` |
| `<module>.<scope>.controller.ts` | `<Module><Scope>Controller`, one per scope |
| `<module>.<concern>.middleware.ts` under `middlewares/` | `<Module><Concern>Middleware`, an `@Injectable` class, every one |
| `<module>[.<concern>].request.dto.ts` / `.response.dto.ts` | `<Module>[<Concern>]RequestSchema` + `RequestDto` / `ResponseSchema` + `ResponseDto` |
| `<module>.<noun>.dto.ts` directly in `dtos/` | `<Module><Noun>Schema` + `Dto`, shared by both directions |
| `<module>.<kebab-error>.exception.ts` | `<Module><Descriptor>Exception`, one per file |
| `<module>.enum.ts`, every enum the module owns; `<module>.status-code.enum.ts` alone | `Enum<Module><Concern>` (queue names `Enum<Module>Queue`); `Enum<Module>StatusCodeError` |
| `contracts/<module>.<concept>.contract.ts` | `<Module><Concept>Contract` + row `I<Module><Concept>Contract`, one per file |

A DTO's `<concern>` is an action, a noun, or absent for the module's canonical shape; the direction segment is not optional, and file and exports agree on it. A list request DTO is `<module>.list.request.dto.ts`, one `<module>.<scope>-list.request.dto.ts` per scope when several scopes list, or `<module>.[<scope>-]<noun>-list.request.dto.ts` when the module lists more than one noun (`workspace.member-list`, `workspace.admin-member-list`). At most two constants files: `<module>.constant.ts` (store keys, selects, everything the module owns) and `<module>.list.constant.ts` (sort presets, search allow-lists, filter defaults, and a list's cursor scope, only with a list endpoint); a data constant never lives in a class file, except a Lua script or a raw query, which sits in the method that runs it, and a pipeline's stages (`analytic.md`). An internal read's cursor scope sits beside its select in `<module>.constant.ts`. `I*` declarations live under `interfaces/`: the repository port alone, data shapes collected in `<module>[.<concern>].interface.ts`. A config interface `IConfig<Namespace>` sits in its `src/configs/<kebab>.config.ts` (`config.md`).

## Identifiers

| Kind | Rule | Example |
| --- | --- | --- |
| class | module-prefixed | `UserService`, `UserSignUpUseCase`, `UserAdminController` |
| interface, data shape, payload | kind word last | `IUser`, `INotificationPushCleanupTokenEncryptedPayload` |
| constant of any kind | PascalCase | `UserDefaultAvailableSearch`, `AuthJwtAccessGuardKey` |
| injected field | the class name in camelCase | `authService: AuthService`, `userSignUpUseCase: UserSignUpUseCase` |
| metadata key; CLS store key; passport strategy key | `<Module>[<Concern>]MetaKey`, `StoreKey`, `GuardKey`; the value equals the name | `PolicyRequiredMetaKey = 'PolicyRequiredMetaKey'`; `ProjectContextStoreKey = 'ProjectContextStoreKey'` |
| cursor scope | `<Module><Endpoint>CursorScope`, PascalCase; the value equals the name | `SessionSharedListCursorScope = 'SessionSharedListCursorScope'` |
| sort preset constant and its enum | `<Module>[<Concern>]OrderBy` keyed by `Enum<Module>[<Concern>]OrderBy`, `Cursor` as the concern only where the cursor presets differ | `DeviceOrderBy` and `EnumDeviceOrderBy`, `DeviceCursorOrderBy` and `EnumDeviceCursorOrderBy` |
| guard-mounting decorator; param decorator | `<Module>[<Concern>]Protected()` (`RequestThrottle`, whose guard evaluates its limit only under `{ user: true }`, keeps its name); `<Module>[<Concern>]Context()` for request state | `WorkspaceProtected()`; `WorkspaceContext()`, `AuthJwtRefreshContext()` |
| repository read; service read | `find*`, `count*`, `exists*`, `group*`; `get*`, an analytic service read named after its metric (`usersActive`) | `findOneById`; `getListOffsetByAdmin` |
| method or use case serving one audience | `By<Audience>` suffix | `createByAdmin`, `getListCursorBySystem`, `UserCreateByAdminUseCase` |
| narrowed list read; Prisma select constant | `I<Module>List` when narrower than the single-row shape, `I<Module>` when list and single-row reads share one neutral select, never `…Row`; `<Module>[<Audience>][<Concern>]Select` | `IUserList` + `UserAdminListSelect`; `IApiKey` + `ApiKeySelect` |
| boolean state method; transaction method | `exists*` or the state asserted, `Promise<boolean>`; `*InTx` with `tx` first | `existsByEmail`, `createInTx` |
| DI token (rare); OpenAPI scheme const | PascalCase in `Symbol()`; PascalCase const, camelCase value | `ApiKeyDocSecurityName = 'xApiKey'` |

A name this project declares is `UPPER_SNAKE_CASE` only when it is an environment variable (`AppEnvSchema` keys, `src/app/dtos/app.env.dto.ts`). Everything on the wire is camelCase: DTO fields, query and route params, Prisma columns, job payload fields, i18n keys, flag keys. Route path segments and folders are kebab-case, mapped one-to-one to camelCase (`sign-up` ↔ `signUp`, never `signup`). A config key named `Pattern` is a `{placeholder}` string, `Regex` a `RegExp`. A slug holds lower-case letters, digits, and `-` (`workspace.slugRegex`, `project.slugRegex`): the pattern refuses every other character, an upper-case letter included, no layer converts a slug, and `HelperStringService.generateSlug` returns lower case. A Redis key is a config `keyPattern` with PascalCase segments, no prefix-append.

An `OrThrow` suffix is Prisma's only (`findUniqueOrThrow`), never on a name this project declares.

## Renaming

No frozen surface: rename a wrong name and change every call site; Prisma-generated names are schema-owned (`repository.md`); a queue, job name, or payload field rename follows `queue.md`. An i18n key rename follows `i18n.md`.
