# Naming

## Files

`<module>.<noun-or-action>[.<sub>].<role>.ts`. Every file under `src/` carries the `<module>.` prefix except `src/main.ts`, `src/migration.ts`, `src/instrument.ts`, `src/swagger.ts`, `src/configure.ts` (each aliased in `tsconfig.json` `paths`: `@main`, `@migration`, `@instrument`, `@swagger`, `@configure`) and generated code. A dot separates segments; a dash sits only inside one segment for a compound noun (`user.mobile-number.service.ts`). At most four dot-separated name parts, three for `*.interface.ts`; a spec adds `.spec.ts` on top. Folders are kebab-case, plural when they hold a kind of file (`use-cases/`, `dtos/request/`). A feature module keeps its services in `services/` and its use cases in `use-cases/`, both flat, one class per file.

Role suffixes: `.use-case .service .repository .controller .guard .strategy .decorator .interceptor .filter .middleware .pipe .processor .indicator .factory .validation .util .queue .cache .dto .module .enum .constant .interface .exception .contract`; tree-bound: `.config` (`src/configs/`), `.data` and `.seed` (`src/migration/`), `.base` (`src/migration/bases/`, `src/queues/bases/`), `.template.hbs` (`templates/`; a per-language template is `<module>.<type>.<lang>.hbs`).

| File | Class |
| --- | --- |
| `<module>[.<concern>].service.ts` under `services/` | `<Module>[<Concern>]Service`, the module's rules |
| `<module>[.<concern>].<action>.use-case.ts` under `use-cases/` | `<Module>[<Concern>]<Action>UseCase`, implements `IAppUseCase`, one public method `execute`; `<action>` is the entry point's verb phrase (`user.sign-up.use-case.ts`, `UserSignUpUseCase`) with no module noun anywhere in the action (`ProjectCreateUseCase`, `ProjectUpdateSlugUseCase`, never `ProjectCreateProjectUseCase`), and a use case whose action is only the module noun is `<Module>UseCase` in `<module>.use-case.ts` (`HelloUseCase`); `<concern>` only where two use cases of one module share an action (`notification.email.process-workspace-invite.use-case.ts`); a use case a processor calls is `<module>[.<concern>].process-<action>.use-case.ts`, class `<Module>[<Concern>]Process<Action>UseCase` |
| `<module>[.<concern>].repository.ts` + `<module>.[<concern>-]repository.interface.ts` | `<Module>[<Concern>]Repository` implements `I<Module>[<Concern>]Repository` |
| `<module>[.<concern>].analytic.repository.ts` + `<module>.[<concern>-]analytic-repository.interface.ts` | `<Module>[<Concern>]AnalyticRepository` implements `I<Module>[<Concern>]AnalyticRepository` |
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

A DTO's `<concern>` is an action, a noun, or absent for the module's canonical shape; the direction segment is not optional, and file and exports agree on it. A list request DTO is `<module>.list.request.dto.ts`, or one `<module>.<scope>-list.request.dto.ts` per scope when several scopes list. At most two constants files: `<module>.constant.ts` (store keys, selects, everything the module owns) and `<module>.list.constant.ts` (list allow-lists, filter defaults, and a list's cursor scope, only with a list endpoint); a data constant never lives in a class file. An internal read's cursor scope sits beside its select in `<module>.constant.ts`. `I*` declarations live under `interfaces/`: the repository port alone, data shapes collected in `<module>[.<concern>].interface.ts`.

The user module's sign-in and sign-up flows are two groups of use cases:

- sign-in, sharing `UserAuthService` (`user.auth.service.ts`): `UserLoginCredentialUseCase`, `UserLoginWithSocialUseCase` with its first-login sign-up, `UserLoginVerifyTwoFactorUseCase`, `UserLoginSetupTwoFactorUseCase`, `UserRefreshUseCase`, `UserLogoutUseCase`.
- sign-up: `UserSignUpUseCase`, `UserCreateByAdminUseCase`, `UserImportByAdminUseCase`.

A util, interface, config key, or service method one flow uses takes that flow's concern, `auth` (sign-in) or `registration` (sign-up); one both use takes its action concern, a config group included (`user.create` holds `timeoutInMs` and `bulkTimeoutInMs`). `onboarding` names nothing in the user module.

Under `test/`, a spec with a subject file is that file's name plus `.spec.ts` and mirrors its `src/` path under `test/<type>/`. An e2e spec for a flow across several routes is `test/e2e/flows/<module>.<flow>.spec.ts` (`user.login-profile.spec.ts`); integration and e2e are held (`testing.md`), so their names are the planned ones. Every other file starts with `test.`: `test.[<type>.][<noun>.]<role>.ts`, role `setup` or `global-setup` at the root of `test/<type>/`, `helper` in a `helpers/` folder; the type segment is present everywhere except `test/helpers/`. `test/helpers/test.provided-context.d.ts` will type `inject()`. A binary fixture is `test.<type>.<noun>.fixture.<ext>` in that type's `helpers/`.

## Identifiers

| Kind | Rule | Example |
| --- | --- | --- |
| class | module-prefixed | `UserService`, `UserSignUpUseCase`, `UserAdminController` |
| interface, data shape, payload | kind word last | `IUser`, `INotificationSendPushEncryptedPayload` |
| constant of any kind | PascalCase | `UserDefaultAvailableSearch`, `AuthJwtAccessGuardKey` |
| injected field | the class name in camelCase | `authService: AuthService`, `userSignUpUseCase: UserSignUpUseCase` |
| metadata key; CLS store key; passport strategy key | `<Module>[<Concern>]MetaKey`, `StoreKey`, `GuardKey`; the value equals the name | `PolicyRequiredMetaKey = 'PolicyRequiredMetaKey'`; `UserStoreKey = 'UserStoreKey'` |
| cursor scope | `<Module><Endpoint>CursorScope`, PascalCase; the value equals the name | `SessionSharedListCursorScope = 'SessionSharedListCursorScope'` |
| guard-mounting decorator; param decorator | `<Module>[<Concern>]Protected()`; `<Module>[<Concern>]Current(field?)` for what a guard stored, `<Module>[<Concern>]Payload(field?)` for the authenticated credential | `WorkspaceMemberProtected()`; `WorkspaceCurrent()`, `AuthJwtPayload('sessionId')` |
| repository read; service read | `find*`, `count*`, `exists*`, `group*`; `get*` | `findOneById`; `getListOffsetByAdmin` |
| method or use case serving one audience | `By<Audience>` suffix | `createByAdmin`, `getListCursorBySystem`, `UserCreateByAdminUseCase` |
| narrowed list read; Prisma select constant | `I<Module>List` when narrower than the single-row shape, `I<Module>` when list and single-row reads share one neutral select, never `…Row`; `<Module>[<Audience>][<Concern>]Select` | `IUserList` + `UserAdminListSelect`; `IApiKey` + `ApiKeySelect` |
| boolean state method; transaction method | `exists*` or the state asserted, `Promise<boolean>`; `*InTx` with `tx` first | `existsByEmail`, `createInTx` |
| DI token (rare); OpenAPI scheme const | PascalCase in `Symbol()`; PascalCase const, camelCase value | `ApiKeyDocSecurityName = 'xApiKey'` |

A name this project declares is `UPPER_SNAKE_CASE` only when it is an environment variable (`AppEnvSchema` keys, `src/app/dtos/app.env.dto.ts`). Everything on the wire is camelCase: DTO fields, query and route params, Prisma columns, job payload fields, i18n keys, flag keys. Route path segments and folders are kebab-case, mapped one-to-one to camelCase (`sign-up` ↔ `signUp`, never `signup`). A config key named `Pattern` is a `{placeholder}` string, `Regex` a `RegExp`. A Redis key is a config `keyPattern` with PascalCase segments, no prefix-append.

An `OrThrow` suffix is Prisma's only (`findUniqueOrThrow`), never on a name this project declares.

## Renaming

No frozen surface: rename a wrong name and change every call site; Prisma-generated names are schema-owned (`database.md`); a queue, job name, or payload field rename follows `queue.md`. An i18n key rename changes both halves, in every language, in the same change (`i18n.md`).
