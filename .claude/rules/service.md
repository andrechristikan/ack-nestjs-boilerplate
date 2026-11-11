---
paths:
    - 'src/modules/*/services/**'
    - 'test/unit/modules/*/services/**'
---

# Services

A service holds one module's business rules and typed exceptions; many use cases and higher-ranked services call it. Its place in the layer chain and what it injects: `layering.md`, Roles and Dependency order.

## Shape

- Path: `services/<module>[.<concern>].service.ts`, class `<Module>[<Concern>]Service` (`naming.md`).
- A noun for one module: a method needing a higher-ranked module's service is a use case (`use-case.md`).
- No `IRequestApp`, `Job`, response envelope, or response DTO in a signature. `DatabaseService` is `withTransaction` only; a model query on `client` is the defect (`database.md`, Access).
- Stages no activity-log row: a method whose action records one returns the stages as data, and the use case stages them (`activity-log.md`).
- Throws the typed exception of the subject that failed (`exceptions.md`).

## Methods

- A method, private included, that calls no repository, cache, queue, service, `RequestStoreService`, `FileService`, `AwsS3Service`, `JwtService`, or `SentryService` and returns a value is a util method once it exceeds three lines or has two call sites; the same shape inline in two methods or two services is one util method.
- An assert is a util predicate plus the throw: `if (!this.roleUtil.outranks(actor, target)) throw new RoleRankForbiddenException()`. A method that throws its subject's exception and otherwise returns its narrowed input is an assert and stays in the service (`UserTwoFactorService.getProvidedMethod`, `src/modules/user/services/user.two-factor.service.ts`).
- A method returning its argument or a single util call is deleted.
- A method joining a caller's transaction is `*InTx(tx, ...)` and forwards `tx` to its own repositories and lower-ranked services.
- An outbound HTTP call is native `fetch` with `signal: AbortSignal.timeout(...)` on the module's `timeoutInMs` config key, no HTTP client dependency. The service owning the call wraps a thrown fetch error (`AuthSocialService.requestGithub`); the module's util maps a response to an exception and returns it, never throws (`AuthUtil.toGithubUnavailableException`).

## Shared transactions

- When two or more use cases run the same sequence over this module's and lower-ranked services, that sequence is one method here: it opens `withTransaction` and calls each participant as `*InTx(tx, ...)`; the use cases call it.
- A sequence that also touches a higher-ranked module keeps its lower part here as an `*InTx` method; each use case opens the transaction and sequences the higher-ranked calls around it.
- Whoever opens the transaction maps a guarded transition's write conflict (`database.md`, Transactions).
