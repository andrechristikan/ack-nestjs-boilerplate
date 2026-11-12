# 0049. Request context is passed by the caller and snapshotted in the job payload

- Status: superseded by 0050
- Date: 2026-11-12

## Context

`ActivityLogService` and `SessionService` read the actor, the workspace, and the request log from the CLS store. A BullMQ job runs outside the request, so the store is empty: the admin import job would record activity with a `null` actor and fail at runtime, a defect no signature shows.

## Decision

The controller reads `IRequestContext` (actor, workspace, request log) once through `@RequestContextCurrent()` and passes it to the use case, which forwards it to every service that needs it. A job payload snapshots the context its processor needs as `context`. No service, use case, effect builder, or processor reads `RequestStoreService`; guards, middlewares, interceptors, param decorators, and the kit (audit stamping, messages, the logger) still do.

## Considered options

- the caller passes the context and the payload snapshots it (chosen)
- services read the CLS store: rejected, the store is empty in a job and the failure surfaces only at runtime.
- the job rebuilds the CLS store from its payload (`ClsService.run`): rejected, hidden state another job can forget to set.

## Consequences

- `recordEffect(input, context)` and the session writes take the context from their caller.
- `IUserImportByAdminPayload` carries `context`, never a separate actor or request log.
- `.claude/rules/security.md`, `activity-log.md`, `http.md`, and `queue.md` carry it.
