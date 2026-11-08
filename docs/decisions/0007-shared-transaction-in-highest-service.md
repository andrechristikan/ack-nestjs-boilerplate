# 0007. Shared cross-module transaction in the highest service

- Status: accepted
- Date: 2026-11-08

## Context

Two or more use cases run the same cross-module sequence, such as the sign-up body that exists in three places. A use case may not call another use case. Placing the sequence in the highest participating module's service is wrong when the sequence's subject belongs to a lower-ranked module.

## Decision

When two or more use cases run the same cross-module sequence and its subject is the highest participating module's entity, a service of that module opens the transaction. It calls its own and lower-ranked services as `*InTx(tx, ...)`. When the subject belongs to a lower-ranked module, each use case opens its own transaction and sequences the per-module `*InTx` calls.

## Considered options

- a service of the highest participating module owns a sequence two or more use cases share when the subject is that module's entity (chosen)
- the sequence always in the highest participating module's service: rejected, it puts a lower module's subject, user creation, into a higher module's service, `WorkspaceService` creating users.
- a module's statements copied per use case: rejected, logic left unshared becomes duplicated code; the per-module parts stay once in their services.
- a shared use case: rejected, a use case calling another use case brings the private-helper problem back one layer up.

## Consequences

`UserCreateByAdminUseCase` and `UserImportByAdminUseCase` each sequence `UserRegistrationService.createInTx`, `WorkspaceService.createOwnedForUsersInTx`, and the term-policy acceptance in their own transaction. The login tail stays in `UserAuthService`, and device removal stays in `SessionService.removeDeviceOwnership`: its subject is the session, since the transaction revokes the device's sessions and then drops the ownership. `service.md`, `use-case.md`, `cross-module.md`, and `database.md` carry the rule.
