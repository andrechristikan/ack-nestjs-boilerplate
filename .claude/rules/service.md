---
paths:
    - 'src/modules/*/services/**'
    - 'test/unit/modules/*/services/**'
---

# Services

A service holds one module's application logic: its operations and invariants, typed exceptions, asserts, and `*InTx` methods; many use cases and the services of higher modules call it. The test: a line that reads or writes one module's rows or throws its exception is application logic, in that module's service; a line that chooses which service call runs next is business logic, in the use case (`use-case.md`). Its place in the layer chain and what it injects: `layering.md`, Roles and Dependency order.

## Shape

- Path: `services/<module>[.<concern>].service.ts`, class `<Module>[<Concern>]Service` (`naming.md`).
- A noun for one module: a method needing a higher module's service is a use case (`use-case.md`).
- No `IRequestApp`, `Job`, response envelope, or response DTO in a signature. `DatabaseService` is `withTransaction` only; a model query on `client` is the defect (`database.md`, Access).
- A method needing the request takes the contexts it reads first, in the `http.md` order, after `tx` on an `*InTx` method (`code-style.md`, Functions and parameters); the actor is `authContext.userId`, never an actor id beside it. A parameter naming another user (a target) stays.
- Adds the activity entries of its own action in that action's transaction (`activity-log.md`).
- Throws the typed exception of the subject that failed (`exceptions.md`).

## Methods

- A pure method (calls no repository, cache, queue, service, `FileService`, `AwsS3Service`, `JwtService`, or `SentryService`) is a util method when it has two or more callers (a caller is a class, `layering.md`, Roles) or a caller outside the module; otherwise it stays here, private when a service calls it, public when a use case does. The same body written in two classes is one util method. Two subjects whose rule can change apart keep their own copy: the same statements over each subject's own config are two methods (`drawSlugCandidates` and `isSlugAllowed` in `WorkspaceService` and `ProjectService`; a username follows its own rule). A method a util may not hold (it calls a `src/modules/` util or awaits anything but a `Helper*` call, `layering.md`, Roles) stays in the service (`UserRegistrationService.prepareSignUp`, `src/modules/user/services/user.registration.service.ts`). An `<action>Effect` builder stays a service method whatever its callers (`outbox.md`, Effects).
- An assert is a predicate plus the throw: `const outranks = this.outranks(actor, target); if (!outranks) throw new RoleRankForbiddenException();` (`RoleService.assertActorOutranks`). A method that throws its subject's exception and otherwise returns its narrowed input is an assert and stays in the service (`UserTwoFactorService.getProvidedMethod`, `src/modules/user/services/user.two-factor.service.ts`).
- A method returning its argument or a single util call is deleted.
- A method joining a caller's transaction is `*InTx(tx, ...)` and forwards `tx` to its own repositories and lower modules' services.

## Shared transactions

- When two or more use cases run the same sequence over this module's and lower modules' services and the sequence's subject is this module's entity, that sequence is one method here: it opens `withTransaction` and calls each participant as `*InTx(tx, ...)`; the use cases call it (`SessionService.removeDeviceOwnership`, `src/modules/session/services/session.service.ts`).
- When the subject belongs to a lower module, no service holds the sequence: each use case opens its own transaction and calls each module's `*InTx` method (`use-case.md`, Transactions).
- A sequence that also touches a higher module keeps its lower part here as an `*InTx` method; each use case opens the transaction and sequences the higher module's calls around it.
- Whoever opens the transaction maps a guarded transition's write conflict (`database.md`, Transactions).
