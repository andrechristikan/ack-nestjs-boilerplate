# 0007. Shared cross-module transaction in the highest service

- Status: accepted
- Date: 2026-11-07

## Context

Two or more use cases run the same cross-module sequence, such as the sign-up body that exists in three places. A use case may not call another use case.

## Decision

When two or more use cases run the same cross-module sequence, a service of the highest participating module opens the transaction. It calls its own and lower-ranked services as `*InTx(tx, ...)`.

## Considered options

- a service of the highest participating module owns a sequence two or more use cases share (chosen)
- the sequence copied per use case: rejected, logic left unshared becomes duplicated code.
- a shared use case: rejected, a use case calling another use case brings the private-helper problem back one layer up.

## Consequences

A sequence that also touches a higher-ranked module keeps its lower part in the service, and the use case sequences the higher-ranked calls around it.
