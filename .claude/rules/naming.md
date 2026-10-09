# Naming

## Files

`<module>.<noun-or-action>[.<sub>].<role>.ts`. Every file under `src/` carries the `<module>.` prefix except `src/main.ts`, `src/migration.ts`, `src/instrument.ts`, `src/swagger.ts`, `src/configure.ts` (each aliased in `tsconfig.json` `paths`: `@main`, `@migration`, `@instrument`, `@swagger`, `@configure`) and generated code. A dot separates segments; a dash sits only inside one segment for a compound noun (`user.mobile-number.domain.ts`). At most four dot-separated name parts, three for `*.interface.ts`; a spec adds `.spec.ts` on top. Folders are kebab-case, plural when they hold a kind of file (`domains/`, `dtos/request/`).

Role suffixes: `.domain .service .repository .controller .guard .strategy .decorator .interceptor .filter .middleware .pipe .processor .indicator .factory .validation .util .queue .cache .dto .module .enum .constant .interface .exception .contract`; tree-bound: `.config` (`src/configs/`), `.data` and `.seed` (`src/migration/`), `.base` (`src/migration/bases/`, `src/queues/bases/`), `.template.hbs` (`templates/`; a per-language template is `<module>.<type>.<lang>.hbs`).

| File | Class |
| --- | --- |
| `<module>[.<concern>].domain.ts` under `domains/` | `<Module>[<Concern>]Domain` |
| `<module>[.<concern>].http.service.ts` / `.processor.service.ts` | `<Module>[<Concern>]HttpService` / `ProcessorService` |
| `<module>[.<concern>].repository.ts` + `<module>.[<concern>-]repository.interface.ts` | `<Module>[<Concern>]Repository` implements `I<Module>[<Concern>]Repository` |
| `<module>[.<concern>].analytic.repository.ts` + `<module>.[<concern>-]analytic-repository.interface.ts` | `<Module>[<Concern>]AnalyticRepository` implements `I<Module>[<Concern>]AnalyticRepository` |
| `<module>[.<concern>].cache.ts` under `caches/` | `<Module>[<Concern>]Cache` (no `Service`) |
| `<module>[.<concern>].queue.ts` / `.queue.factory.ts` | `<Module>[<Concern>]Queue` / `QueueFactory` |
| `<module>.<layer>.module.ts` | `<Module>RepositoryModule` / `DomainModule` / `HttpModule` / `ProcessorModule` |
| `<module>.<scope>.controller.ts` | `<Module><Scope>Controller`, one per scope |
| `<module>.<concern>.middleware.ts` under `middlewares/` | `<Module><Concern>Middleware`, an `@Injectable` class, every one |
| `<module>[.<concern>].request.dto.ts` / `.response.dto.ts` | `<Module>[<Concern>]RequestSchema` + `RequestDto` / `ResponseSchema` + `ResponseDto` |
| `<module>.<noun>.dto.ts` directly in `dtos/` | `<Module><Noun>Schema` + `Dto`, shared by both directions |
| `<module>.<kebab-error>.exception.ts` | `<Module><Descriptor>Exception`, one per file |
| `<module>.enum.ts`, every enum the module owns; `<module>.status-code.enum.ts` alone | `Enum<Module><Concern>`; `Enum<Module>StatusCodeError` |
| `contracts/<module>.<concept>.contract.ts` | `<Module><Concept>Contract` + row `I<Module><Concept>Contract`, one per file |

A DTO's `<concern>` is an action, a noun, or absent for the module's canonical shape; the direction segment is not optional, and file and exports agree on it. A list request DTO is `<module>.list.request.dto.ts`, or one `<module>.<scope>-list.request.dto.ts` per scope when several scopes list. At most two constants files: `<module>.constant.ts` (store keys, selects, everything the module owns) and `<module>.list.constant.ts` (list allow-lists and filter defaults, only with a list endpoint); a data constant never lives in a class file. `I*` declarations live under `interfaces/`: the repository port alone, data shapes collected in `<module>[.<concern>].interface.ts`.

Under `test/`, a spec with a subject file is that file's name plus `.spec.ts` and mirrors its `src/` path under `test/<type>/`. An e2e spec for a flow across several routes is `test/e2e/flows/<module>.<flow>.spec.ts` (`user.login-profile.spec.ts`); integration and e2e are held (`testing.md`), so their names are the planned ones. Every other file starts with `test.`: `test.[<type>.][<noun>.]<role>.ts`, role `setup` or `global-setup` at the root of `test/<type>/`, `helper` in a `helpers/` folder; the type segment is present everywhere except `test/helpers/`. `test/helpers/test.provided-context.d.ts` will type `inject()`. A binary fixture is `test.<type>.<noun>.fixture.<ext>` in that type's `helpers/`.

## Identifiers

| Kind | Rule | Example |
| --- | --- | --- |
| class | module-prefixed | `UserDomain`, `UserAdminController` |
| interface, data shape, payload | kind word last | `IUser`, `INotificationSendPushPayload` |
| constant of any kind | PascalCase | `UserDefaultAvailableSearch`, `AuthJwtAccessGuardKey` |
| injected field | the class name in camelCase | `authDomain: AuthDomain` |
| metadata key; CLS store key; passport strategy key | `<Module>[<Concern>]MetaKey`, `StoreKey`, `GuardKey`; the value equals the name | `PolicyRequiredMetaKey = 'PolicyRequiredMetaKey'`; `UserStoreKey = 'UserStoreKey'` |
| guard-mounting decorator; param decorator | `<Module>[<Concern>]Protected()`; `<Module>[<Concern>]Current(field?)` for what a guard stored, `<Module>[<Concern>]Payload(field?)` for the authenticated credential | `WorkspaceMemberProtected()`; `WorkspaceCurrent()`, `AuthJwtPayload('sessionId')` |
| repository read; domain or HTTP service read | `find*`, `count*`, `exists*`, `group*`; `get*` | `findOneById`; `getListOffsetByAdmin` |
| method serving one audience | `By<Audience>` suffix | `createByAdmin`, `getListCursorBySystem` |
| narrowed list read; Prisma select constant | `I<Module>List` when narrower than the single-row shape, `I<Module>` when list and single-row reads share one neutral select, never `…Row`; `<Module>[<Audience>][<Concern>]Select` | `IUserList` + `UserAdminListSelect`; `IApiKey` + `ApiKeySelect` |
| boolean state method; transaction method | `exists*` or the state asserted, `Promise<boolean>`; `*InTx` with `tx` first | `existsByEmail`, `createInTx` |
| DI token (rare); OpenAPI scheme const | PascalCase in `Symbol()`; PascalCase const, camelCase value | `ApiKeyDocSecurityName = 'xApiKey'` |

A name this project declares is `UPPER_SNAKE_CASE` only when it is an environment variable (`AppEnvSchema` keys, `src/app/dtos/app.env.dto.ts`). Everything on the wire is camelCase: DTO fields, query and route params, Prisma columns, job payload fields, i18n keys, flag keys. Route path segments and folders are kebab-case, mapped one-to-one to camelCase (`sign-up` ↔ `signUp`, never `signup`). A config key named `Pattern` is a `{placeholder}` string, `Regex` a `RegExp`. A Redis key is a config `keyPattern` with PascalCase segments, no prefix-append.

## Renaming

No frozen surface: rename a wrong name and change every call site; Prisma-generated names are schema-owned (`database.md`); a queue, job name, or payload field rename follows `queue.md`. An i18n key rename changes both halves, in every language, in the same change (`i18n.md`).
