# Security

This file is the rule set. Flow narrative: `docs/authentication.md`,
`docs/authorization.md`, `docs/two-factor.md`, `docs/security-and-middleware.md`,
`docs/activity-log.md` — explorer or planner opens the named file when the behaviour is
not settled here.

## Credentials

A credential is a password hash, a 2FA secret or its IV, a recovery code, a raw access or refresh token, an API key secret, or a presign signature.

- **A credential MUST NOT appear in a log line** — not in `logger.debug`, not inside an error message, not inside a `JSON.stringify`. Pino redacts known secret keys, but redaction is a safety net, not a licence: log retention becomes credential retention the moment a field is named something the redactor does not know.
- **A credential MUST NOT reach the wire.** A response carries only what its zod schema declares (`rules/dto.md`), which is what keeps an overfetched column off the response — that protection holds only while every route declares its schema on `@Response` / `@ResponsePaging`.
- **A credential MUST NOT land on `request.<field>`.** Whatever a guard assigns there is readable by every downstream controller, interceptor, logger, and error reporter for the rest of the request.
- Pass credentials as explicit plain values across a call, never bundled inside a payload object that drags every other field along and makes the crossing invisible at the call site.

## Session invalidation — never skip it

Every one of these MUST invalidate the affected sessions:

- password change
- password reset / forgot-password completion
- logout
- device removal
- role or status change that revokes access

Skipping it leaves a live token for an account the user believes they secured. It is silent, and nothing fails until it matters.

## Authorization

The decorator stack in `rules/http.md` is the enforcement order and it is exact. Beyond that:

- **A guard reads transport inputs and delegates the decision.** Resolving an entity and deciding a business rule inline puts the rule where no other caller can reuse it and no test can reach it.
- CASL abilities are built from the `Policy` rows attached to the caller's role — one row per `subject` carrying its `action` list; `@PolicyProtected` names the subject and actions a route requires. Do not re-implement an ability check by hand in a service.
- Feature flags gate a route via `@FeatureFlagProtected('<key>')`; `rules/feature-flag.md` owns the key shape.

## Activity log

- Feature domains enqueue with `ActivityLogDomain.stage`. The global `ActivityLogInterceptor`
  (`APP_INTERCEPTOR`) awaits flush when the CLS stage queue is non-empty.
- Default `stage` is success-path only (call after business success). `stage({ onError: true })`
  is one call that covers both paths: flushed on success and on error — do not stage again in a
  catch. Error-path flush writes only events with `onError: true`; other staged events are
  discarded.
- Per-action contracts resolve `user` / `workspace` (`payload` | `target` | `none`) and validate
  metadata with zod; contract failure throws.
- `workspace=payload` reads only `WorkspaceStoreKey`.
- Activity metadata is never returned in response DTOs.
- **Never log a secret into activity metadata.** It is durable storage, queried by admins.

## Request store

Per-request state lives in one CLS-backed `RequestStoreService` in `@common`, keyed by constants (`RequestLogStoreKey`, `RequestLanguageStoreKey`, `RequestVersionStoreKey`, `RequestIdStoreKey`, `RequestCorrelationIdStoreKey`, `ActivityLogStageStoreKey`, `WorkspaceStoreKey`, `WorkspaceMemberStoreKey`). Do not create a per-module CLS store; add a key to the shared one — the `workspace` module's own key constants (`workspace.constant.ts`) are the pattern to follow, not an exception to it.

Geo-location and user-agent are resolved once per request into `RequestLogStoreKey` as an `IRequestLog`, then threaded to the repository as the last method parameter. Do not re-parse them downstream.
