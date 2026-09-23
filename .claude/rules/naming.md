# Naming

## Files

`<module>.<noun-or-action>[.<sub>].<role>.ts`. Every file under `src/` carries the `<module>.` prefix except
`src/main.ts`, `src/migration.ts`, `src/instrument.ts`, `src/swagger.ts` (each aliased in `tsconfig.json`
`paths`) and generated code. A dot separates segments; a dash sits only inside one segment for a compound noun
(`user.mobile-number.domain.ts`). At most four dot-separated name parts, three for `*.interface.ts`; a spec adds
`.spec.ts` on top. Folders are kebab-case, plural when they hold a kind of file (`domains/`, `dtos/request/`).

Role suffixes: `.domain .service .repository .controller .guard .strategy .decorator .interceptor .filter
.middleware .pipe .processor .indicator .factory .validation .util .queue .cache .dto .module .enum .constant
.interface .exception .contract`; tree-bound: `.config` (`src/configs/`), `.data` and `.seed` (`src/migration/`),
`.base` (`src/migration/bases/`, `src/queues/bases/`).

| File | Class |
|---|---|
| `<module>[.<concern>].domain.ts` under `domains/` | `<Module>[<Concern>]Domain` |
| `<module>[.<concern>].http.service.ts` / `.processor.service.ts` | `<Module>[<Concern>]HttpService` / `ProcessorService` |
| `<module>[.<concern>].repository.ts` + `<module>.[<concern>-]repository.interface.ts` | `<Module>[<Concern>]Repository` implements `I<Module>[<Concern>]Repository` |
| `<module>[.<concern>].cache.ts` under `caches/` | `<Module>[<Concern>]Cache` (no `Service`) |
| `<module>[.<concern>].queue.ts` / `.queue.factory.ts` | `<Module>[<Concern>]Queue` / `QueueFactory` |
| `<module>.<layer>.module.ts` | `<Module>RepositoryModule` / `DomainModule` / `HttpModule` / `ProcessorModule` |
| `<module>.<scope>.controller.ts` | `<Module><Scope>Controller`, one per scope |
| `<module>[.<concern>].request.dto.ts` / `.response.dto.ts` | `<Module>[<Concern>]RequestSchema` + `RequestDto` / `ResponseSchema` + `ResponseDto` |
| `<module>.<noun>.dto.ts` directly in `dtos/` | `<Module><Noun>Schema` + `Dto`, shared by both directions |
| `<module>.<kebab-error>.exception.ts` | `<Module><Descriptor>Exception`, one per file |
| `<module>.<concern>.enum.ts`; `<module>.status-code.enum.ts` alone | `Enum<Module><Concern>`; `Enum<Module>StatusCodeError` |
| `contracts/<module>.<concept>.contract.ts` | `<Module><Concept>Contract` + row `I<Module><Concept>Contract`, one per file |

A DTO's `<concern>` is an action, a noun, or absent for the module's canonical shape; the direction segment is
not optional, and file and exports agree on it. At most two constants files: `<module>.constant.ts` (store
keys, selects, everything the module owns) and `<module>.list.constant.ts` (list allow-lists and filter
defaults, only with a list endpoint); a data constant never lives in a class file. `I*` declarations live under
`interfaces/`: the repository port alone, data shapes collected in `<module>[.<concern>].interface.ts`.

## Identifiers

| Kind | Rule | Example |
|---|---|---|
| class | PascalCase, module-prefixed | `UserDomain`, `UserAdminController` |
| interface, data shape, payload | `I` + PascalCase; kind word last | `IUser`, `INotificationSendPushPayload` |
| enum type; key and string value | `Enum` + PascalCase; camelCase both | `EnumQueue.notificationEmail` |
| constant of any kind | PascalCase | `UserDefaultAvailableSearch`, `AuthJwtAccessGuardKey` |
| method, variable, field, injected field | camelCase; injected field is the class name lowercased | `authDomain: AuthDomain` |
| narrowed list read; Prisma select constant | `I<Module>List`, never `…Row`; `<Module>[<Audience>][<Concern>]Select` | `IUserList`, `UserAdminListSelect` |
| boolean state method; transaction method | `exists*` or the state asserted, `Promise<boolean>`; `*InTx` with `tx` first | `existsByEmail`, `createInTx` |
| DI token (rare); OpenAPI scheme const | PascalCase in `Symbol()`; PascalCase const, camelCase value | `ApiKeyDocSecurityName = 'xApiKey'` |

`UPPER_SNAKE_CASE` exists nowhere. Everything on the wire is camelCase: DTO fields, query and route params,
Prisma columns, job payload fields, i18n keys, flag keys. Route path segments and folders are kebab-case, mapped
one-to-one to camelCase (`sign-up` ↔ `signUp`, never `signup`). A config key named `Pattern` is a `{placeholder}`
string, `Regex` a `RegExp`. A Redis key is a config `keyPattern` with PascalCase segments, no prefix-append.

## Renaming

No frozen surface: rename a wrong name and change every call site; Prisma-generated names are schema-owned
(`database.md`). A rename that strands live state names its deploy step in the hand-back: drain the queue for
an `EnumQueue` value, job name, or payload field; forced re-login for a JWT payload field; a dead-cursor window
for a cursor payload field; both halves together, in every language, for an i18n key.
