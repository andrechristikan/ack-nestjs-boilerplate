# `src/common/` — the shared module

`src/common/` is the project's **shared module**: the one place cross-cutting, module-agnostic
capability lives — `database/`, `cache/`, `redis/`, `pagination/`, `request/`, `response/`,
`logger/`, `message/`, `helper/`, `file/`, `doc/`, `aws/`, `firebase/`.

`AppModule` imports `CommonModule` once; `common.module.ts` composes the global pieces, each
child bringing its own `forRoot()`. Being shared is exactly why it must stay thin. **It is not
a parking lot for anything that happens to be imported in several places.**

## Promotion into `src/common/` (HARD)

- A shape with a **natural owner module stays in that module** and is imported across, however
  many modules import it. **A natural owner disqualifies promotion on its own — caller count
  is not the test.**
- Promote only when the concept is genuinely module-agnostic (no natural owner) **AND** has
  three or more external callers.

## The import direction

- `src/common/` MAY import a feature module for composition (`common.module.ts` wiring) or a
  feature's compile-time enum.
- It MUST NOT import a feature's runtime code, and MUST NOT bind a feature type as a generic
  default. **A shared module that knows one feature's internals is no longer shared.**

`common.module.ts` does import feature modules today (`AuthModule`, `ApiKeyModule`,
`RoleModule`, `PolicyModule`, `FeatureFlagModule`, `TermPolicyModule`, `SessionModule`,
`ActivityLogModule`, `NotificationModule`) — that is the composition exception above, and it is
the reason those modules are reachable app-wide without a per-module import. Do not read it as
a licence for a `src/common/` service to call one.

## A feature never re-implements the kit

Reach for `HelperService`, `PaginationService`, `ResponseUtil`, `MessageService`,
`DatabaseService`, `FileService`, `AwsS3Service`, `AwsSESService`, `FirebaseService` before
writing your own. A hand-rolled second copy of one of these is a defect regardless of how well
it works.

## One connection per backing service

`DatabaseService` is the one Prisma injection point (`rules/database.md`). Redis is opened
once and shared by the cache (`db:0`) and BullMQ (`db:1`) — **never open a second Redis
connection** (`rules/cache.md`, `rules/queue.md`). S3 goes through `AwsS3Service`, never a
hand-built `S3Client` (`rules/file.md`).

## Status codes

`src/common/` sub-trees own status-code blocks of their own — `file`, `pagination`, `request`,
`aws`, `database`. They allocate from the same 5-digit layout as feature modules
(`rules/status-code.md`), and a `common/` exception is a `common/` exception: a repository's
`DatabaseUniqueValueGenerationFailedException` is not a feature exception
(`rules/database.md`).
