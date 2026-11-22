---
paths:
    - 'src/modules/*/services/**'
    - 'test/unit/modules/*/services/**'
---

# Services

The test: a line that reads or writes one module's rows or throws its exception is application logic, in that module's service; a line that chooses which service call runs next is business logic, in the use case (`use-case.md`). Its place in the layer chain and what it injects: `layering.md`, Roles and Levels.

## Shape

- A noun for one module (`layering.md`, Roles).
- No `IRequestApp`, `Job`, response envelope, or response DTO in a signature; a list read hands on the repository's `IResponsePaginationReturn<T>` (`pagination.md`).
- A method needing the request takes the contexts it reads, in the `http.md` order; the actor is `authContext.userId`, never an actor id beside it. A parameter naming another user (a target) stays. A row a guard loaded comes from its context, whole, and is never read again (`guards.md`, Contexts).
- A metadata sub-key used as a gate holds a boolean and is asserted in the service, never in the decorator (what it throws: `feature-flag.md`, Restrictions): its own awaited check beside the method's read in one `Promise.all`, or its own method the use case awaits beside its other checks (`WorkspaceJoinRequestService.assertJoinRequestAllowed`, `src/modules/workspace/services/workspace.join-request.service.ts`). Written into the decorator it would gate one route instead of every caller.
- `feature-flag` is `@Global()`, a level below every plain module, so a service of one injects `FeatureFlagService` (`layering.md`, Levels), only to assert a flag or metadata sub-key its own module owns (`WorkspaceInviteService.validateInviteToken` asserts `invitationAllowed`, `src/modules/workspace/services/workspace.invite.service.ts`), or to read a boolean sub-key that decides whether its own subject applies, or a numeric sub-key its module owns, as `feature-flag.md`, Metadata, gives, before the use case opens the flow's transaction. A sub-key that gates an operation stays an assert.
- A service never reads a JSON file, concatenates a message, or builds a user-facing sentence (an email template's subject and body are template text, `i18n.md`): `MessageService.setMessage(path, options)` is the one entry point (`i18n.md`).

## Methods

- A pure method (calls no repository, cache, queue, service, `FileService`, `AWSS3Service`, `JwtService`, or `SentryService`) is a util method when `layering.md`, Roles, makes it one; otherwise it stays here, private when a service calls it, public when a use case does. The same body written in two classes is one util method. Two subjects whose rule can change apart keep their own copy: the same statements over each subject's own config are two methods (`drawSlugCandidates` and `isSlugAllowed` in `WorkspaceService` and `ProjectService`; a username follows its own rule). A method a util may not hold (`layering.md`, Roles) stays in the service (`UserRegistrationService.prepareSignUp`, `src/modules/user/services/user.registration.service.ts`). An `<action>Effect` builder lives in the module's queue class (`effects.md`, Effects).
- An assert is a predicate plus the throw: `const outranks = this.outranks(actor, target); if (!outranks) throw new RoleRankForbiddenException();` (`RoleService.assertActorOutranks`). A method that throws its subject's exception and otherwise returns its narrowed input is an assert and stays in the service (`UserAuthService.assertSocialLoginAllowed`, `src/modules/user/services/user.auth.service.ts`).
- A method returning its argument or a single util call is deleted.

## Shared transactions

- When two or more use cases run the same sequence over this module's services and a lower level's, and the sequence's subject is this module's entity, that sequence is one `*InTx` method here, calling each participant as `*InTx(tx, ...)`; each use case opens the transaction and calls it.
- A sequence over two modules of one level belongs to no service: each use case opens its own transaction and calls each module's `*InTx` method (`use-case.md`, Transactions). This module's part of it is one `*InTx` method here.
