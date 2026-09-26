# `src/common/` — the shared module

`src/common/` is the project's **shared module**: the one place cross-cutting, module-agnostic
capability lives — `database/`, `cache/`, `redis/`, `pagination/`, `request/`, `response/`,
`logger/`, `message/`, `helper/`, `file/`, `doc/`, `aws/`, `firebase/`, `sentry/`.

`AppModule` imports `CommonModule` once; `common.module.ts` composes the global pieces, each
child bringing its own `forRoot()`. `doc/` is decorator primitives with no module. `AwsModule`
is not composed there — a feature that injects `AwsS3Service` or `AwsSESService` imports
`AwsModule`. Being shared is exactly why the composed kit must stay thin. **It is not a
parking lot for anything that happens to be imported in several places.**

## Promotion into `src/common/` (HARD)

- A shape with a **natural owner module stays in that module** and is imported across, however
  many modules import it. **A natural owner disqualifies promotion on its own — caller count
  is not the test.**
- Promote only when the concept is genuinely module-agnostic (no natural owner) **AND** has
  three or more external callers.

## The import direction

`src/common/` is **tier 1** (`rules/architecture.md`): a repository and a service of any layer
inject the kit `CommonModule` composes, with no `imports:` entry. `AwsS3Service` and
`AwsSESService` need `AwsModule` on the feature that uses them. A util takes the narrower
half — the part that computes in memory, `Helper*`, `MessageService`, `DatabaseUtil` — and
never `FileService` and never a cache, because a util shapes data and does no IO
(`rules/architecture.md`). That openness only holds because the direction is one-way.

- `src/common/` MAY import a feature module for composition (`common.module.ts` wiring) or a
  feature's compile-time enum.
- It MUST NOT import a feature's runtime code — **not a service, not a repository, not a util,
  not even from a `@Global()` feature** — and MUST NOT bind a feature type as a generic
  default. **A shared module that knows one feature's internals is no longer shared.**

`common.module.ts` imports these feature domain modules as composition (`AuthDomainModule`,
`ApiKeyDomainModule`, `RoleDomainModule`, `PolicyDomainModule`, `FeatureFlagDomainModule`,
`TermPolicyDomainModule`, `SessionDomainModule`, `ActivityLogDomainModule`,
`NotificationDomainModule`). That is the composition exception above, and it is
the reason those modules are reachable app-wide without a per-module import. Do not read it as
a licence for a `src/common/` service to call one.

## A feature never re-implements the kit

Reach for the `Helper*Service` family (`HelperDateService`, `HelperStringService`,
`HelperHashService`, `HelperEncryptionService`, `HelperNumberService`, `HelperArrayService`),
`PaginationService`, `MessageService`, `ResponseMetadataService`, `DatabaseService`,
`FileService`, `AwsS3Service`, `AwsSESService`, `FirebaseService` and `SentryService` before
writing your own. The reusable request field schemas are
`src/common/request/validations/request.<name>.validation.ts` (`RequestUuidSchema`,
`RequestRequiredStringSchema`, `RequestBooleanStringSchema`, `RequestEncryptionSecretSchema`,
…) — a feature schema composes them rather than restating the check (`rules/dto.md`). A hand-rolled second copy of one of these is a defect regardless of how well
it works.

## One connection per backing service

`DatabaseService` is the one Prisma injection point (`rules/database.md`). Redis is opened
once and shared by the cache (`db:0`) and BullMQ (`db:1`) — **never open a second Redis
connection** (`rules/cache.md`, `rules/queue.md`). S3 goes through `AwsS3Service`, never a
hand-built `S3Client` (`rules/file.md`).

## Status codes

`src/common/` sub-trees own status-code blocks of their own — `file`, `pagination`, `request`,
`response`, `aws`, `database`, `helper`. They allocate from the same 5-digit layout as feature modules
(`rules/status-code.md`), and a `common/` exception is a `common/` exception: a repository's
`DatabaseUniqueValueGenerationFailedException` is not a feature exception
(`rules/database.md`).
