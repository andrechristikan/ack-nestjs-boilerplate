# 0050. Scoped request context, its snapshot to services and jobs

- Status: accepted
- Date: 2026-11-13

## Context

Seven overlapping param decorators handed a use case its caller. The actor arrived twice, non-null from the token and nullable in the request context, so use cases carried both and the admin import job narrowed a nullable actor.

## Decision

One param decorator, `@RequestContextCurrent(scope)`, builds the context of the route's scope (`public`, `user`, `workspace`, `project`, `projectMember`) from what its guards stored, typed so every field those guards guarantee is non-null. The context is the first parameter of every controller handler and use case; services, `recordEffect`, and job payloads take its ids-only `snapshot`.

## Considered options

- one scoped decorator, the context first, an ids-only snapshot below the use case (chosen)
- a param decorator per concern beside the context: rejected, the actor arrives twice and a use case takes an actor id beside a context holding it.
- one context type with a nullable actor in every scope: rejected, every use case behind a JWT checks the actor for `null`.
- the full context in a job payload: rejected, a delayed or retried job decides on rows copied at request time (0019).

## Consequences

- `IUserImportByAdminPayload.context` is a user snapshot, so neither the processor nor its use case checks the actor.
- A scope the route's guards do not satisfy throws `RequestContextMissingException` on the first call.
- It supersedes 0049. `.claude/rules/http.md`, `guards.md`, `use-case.md`, `service.md`, `activity-log.md`, `queue.md`, `security.md`, and `naming.md` carry it.
