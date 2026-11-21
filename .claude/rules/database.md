---
paths:
    - 'src/common/database/**'
---

# Database kit

Access and transactions: `transaction.md`. Statements and the schema: `repository.md`.

- `client` is built once by `DatabaseClientFactory.create()` with the extension from `DatabaseExtensionFactory.build()` (`src/common/database/factories/database.extension.factory.ts`). Its constructor passes `datasourceUrl: databaseUtil.buildClientUrl(database.url)`, which appends `serverSelectionTimeoutMS` and `connectTimeoutMS` from `database.serverSelectionTimeoutInMs` and `database.connectTimeoutInMs`.
- `DatabaseService.withTransaction` keeps, per `tx`, the callbacks registered through `afterCommit(tx, callback)` and runs them in order once `$transaction` has resolved, before it returns; a rolled-back transaction runs none. A callback never throws (`OutboxService.dispatch` catches its own errors). `afterCommit` is the one after-commit hook: no commit listener is registered at boot, and no client extension replaces `$transaction`.
- `DatabaseService.onModuleInit` awaits `$connect()`, then `$runCommandRaw({ ping: 1 })`, so the app does not boot while MongoDB is unreachable; either failure is one `AppUnknownException`.
- Every Prisma `query` event at or above `database.slowQueryThresholdInMs` logs one `warn` line carrying no query text or parameter. A faster query logs at `verbose` only under `database.debugEnabled`.
- `toException`, the `AppGeneralFilter` mapping (`filter.md`), maps `DatabaseWriteConflictCode` to `DatabaseWriteConflictException` (409); a `DatabaseUnavailableCodes` member or a `PrismaClientInitializationError` to `DatabaseUnavailableException` (503), as is a `DatabaseRawQueryFailedCode` error whose message holds a `DatabaseUnavailableMessages` entry (a server-selection timeout), any other one returning `null`; P2023, inconsistent column data such as a malformed ObjectId, to its own 400 `database` exception; P2028, a transaction API failure, to its own 503 `database` exception. The once-per-window gate is `DatabaseService.isFirstUnavailableInWindow` (`exceptions.md`, The hierarchy).
