# 0051. Each module owns its request context, passed per parameter

- Status: accepted
- Date: 2026-11-14

## Context

0050 nested an ids-only `snapshot` in each scoped context. One context type family in the request kit then had to know every feature (the user row, the workspace, the project, the API key, the session, the social email), through a feature import, a generic, a kit-owned copy, or one store object every guard merged into.

## Decision

Each module owns its context, its `<Module>[<Concern>]ContextStoreKey`, and its `<Module>[<Concern>]Context()` param decorator: the kit `@RequestContext()` (request log, language), `@ApiKeyContext()`, `@AuthJwtAccessContext()`, `@AuthJwtRefreshContext()` (the raw refresh token included), `@AuthSocialContext()`, `@UserContext()`, `@WorkspaceContext()`, `@ProjectContext()`. Its guard or middleware translates the credential or header; no JWT or provider payload is stored. A handler, use case, and service take the contexts they read, in that order, after `tx`. `ActivityLogService.recordEffect` takes the four contexts it reads, `null` where absent.

## Considered options

- a context per module, passed per parameter (chosen)
- one context type family in the kit, passed whole: rejected, the kit must know every feature.
- one store object every guard merges into: rejected, the same feature knowledge in the kit, and one type holding every feature.
- an activity-log input shape each caller assembles: rejected, every caller repeats the same mapping.

## Consequences

- Lint `parameterOrderRestrictions` keeps every `I*Context` parameter before the others but `tx`.
- The JWT guards write `RequestActorStoreKey` for the logger, audit stamping, and the per-user throttle.
- `.claude/rules/http.md`, `guards.md`, `security.md`, `use-case.md`, `service.md`, and `activity-log.md` carry it.
