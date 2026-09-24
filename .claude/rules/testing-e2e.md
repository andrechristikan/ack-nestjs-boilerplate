# Testing — E2E

This is the E2E contract: real `AppModule`, real Postgres and Redis, called over Supertest. It
governs `test/e2e/**/*.e2e-spec.ts` and `test/e2e/support/**`. `testing.md` and
`testing-spec-style.md` govern `test/**/*.spec.ts` instead — mocked collaborators, no I/O. Do
not carry conventions from one tree into the other.

## Runtime

- `pnpm test:e2e` runs `vitest.e2e.config.mts`, matching `test/**/*.e2e-spec.ts` only.
  `testTimeout` is 30000ms, `hookTimeout` is 60000ms, `pool: 'forks'`, `isolate: true`.
  `isolate` resets the JS module registry per file — it does not reset Postgres or Redis.
- `test/e2e/setup.ts` loads `.env.e2e` and selects the `test` application environment before any
  spec file runs.
- Environment lifecycle:

  ```bash
  cp .env.e2e.example .env.e2e   # first run only, if .env.e2e is absent
  pnpm test:e2e:env:up
  pnpm test:e2e:db:reset
  pnpm test:e2e
  pnpm test:e2e:env:down
  ```

  The Compose project uses host ports `55432` (PostgreSQL), `56379` (Redis), and `5311` (JWKS),
  isolated from the development Compose project.
- `pnpm test:e2e:db:reset` applies the current Prisma schema and seeds the baseline roles,
  policies, feature flags, countries, and term policies. A spec may rely on that baseline
  existing; it never has to create baseline roles or policies itself.
- No coverage is configured for this project. Never add `--coverage` to an E2E invocation.

## External boundaries

SES, S3, Firebase, and Sentry are disabled in the test profile. A route that would call one of
them is asserted through a recording adapter, never a live third-party call. Until a recording
adapter exists for a given boundary, a route reaching it is out of scope for a behavioral case
and gets a hand-back note instead of a skipped assertion.

## Data isolation (HARD)

The E2E database is reset once per `test:e2e:db:reset` invocation, not once per spec file.
Every spec file in the same run shares the same Postgres and Redis state. Consequences:

- A spec creates its own fixtures with unique values — suffix emails, slugs, and names with a
  random or per-test token. Never assume a fixed identifier is free.
- A spec never assumes it is the only one that has touched a table. Never assert an exact row
  count on an admin or list endpoint; filter by the fixture's own identifiers and assert on
  that subset.
- A spec cleans up what it created when the state would otherwise leak into another spec's
  assertions (a unique-constraint column, a global list a later spec also lists). Cleanup lives
  in the same spec's `afterAll`/`afterEach`, not a cross-file convention.

## Auth pattern

A shared support helper acquires a bearer token by logging in as a seeded role through the real
login endpoint, rather than each spec hand-rolling its own login request. Build that helper
under `test/e2e/support/` the first time a spec needs an authenticated route, and reuse it after
— do not duplicate login-request boilerplate across spec files.

## Shared support layer

`test/e2e/support/` holds:

- application creation and teardown (`app.ts`);
- Supertest request builders and header helpers — bearer, `x-api-key`, `x-workspace-id`,
  language, correlation id (`request.ts`);
- an authenticated-token helper (see "Auth pattern" above);
- deterministic fixture factories for user, role, API key, workspace, project, session, device,
  policy, term-policy, invite, join-request, and notification data;
- database and fixture cleanup helpers;
- response-envelope, pagination, validation, and exception assertions;
- multipart upload and CSV request builders;
- recording adapters for SES, S3, Firebase, queue dispatch, and Sentry.

Helpers stay explicitly imported — no global setup magic. Endpoint-specific request bodies,
state transitions, and assertions stay in the route's own spec file. A spec needing a helper
this list describes that does not exist yet builds it here, generic to its stated purpose,
rather than inlining the same logic per spec.

## Test case policy

Each route in scope gets one representative success case plus every material authentication,
authorization, workspace, feature-flag, term-policy, validation, and business-rule failure it
can produce. Boundary cases cover UUIDs, pagination, dates, file size/count, and CSV row limits
where the behavior changes.

State-changing routes assert both the HTTP response and the persisted state through the real
Prisma client. Workflow tests reuse the shared fixture factories but never share mutable state
between test cases.

## Style

Existing sibling `*.e2e-spec.ts` files are the style guide, the same way sibling unit specs
govern `testing-spec-style.md` work. `test/e2e/public/hello.e2e-spec.ts` is the current
canonical shape: app lifecycle in `beforeAll`/`afterAll` via `createE2eApplication` /
`closeE2eApplication`, requests through the `e2eGet`/`e2ePost`/... builders, assertions against
the response envelope with `toMatchObject`.
