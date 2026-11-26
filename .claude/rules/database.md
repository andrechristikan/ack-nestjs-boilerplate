---
paths:
    - 'src/common/database/**'
---

# Database kit

Access and transactions: `transaction.md`. Statements and the schema: `repository.md`.

- `client` is built once by `DatabaseClientFactory.create()` with the extension from `DatabaseExtensionFactory.build()` (`src/common/database/factories/database.extension.factory.ts`). Its constructor passes `datasourceUrl: databaseUtil.buildClientUrl(database.url)`, which appends `serverSelectionTimeoutMS` and `connectTimeoutMS` from `database.serverSelectionTimeoutInMs` and `database.connectTimeoutInMs`.
- `DatabaseService.withTransaction` keeps, per `tx`, the callbacks registered through `beforeCommit(tx, callback)` and `afterCommit(tx, callback)`. Inside `$transaction`, after `fn` resolves, it awaits each before-commit callback in order on the Prisma `tx`; one that rejects rolls the transaction back. Once `$transaction` has resolved, it runs the after-commit callbacks in order, before it returns; a rolled-back transaction runs none. An after-commit callback never throws (`OutboxService.dispatch` catches its own errors). The two are the one commit hooks: no commit listener is registered at boot, and no client extension replaces `$transaction`. Any module may register either. An after-commit callback suits a best-effort step that follows the commit and whose loss is recovered or harms nothing: the outbox dispatch, which the sweep repeats. An update outside MongoDB that must not be lost is an outbox row, never an after-commit callback alone.
- `DatabaseService.onModuleInit` awaits `$connect()`, then `$runCommandRaw({ ping: 1 })`, so the app does not boot while MongoDB is unreachable; either failure is one `AppUnknownException`.
- Every Prisma `query` event at or above `database.slowQueryThresholdInMs` logs one `warn` line carrying no query text or parameter. A faster query logs at `verbose` only under `database.debugEnabled`.
- `DatabaseRepositoryBase.toException(error)` (`src/common/database/bases/database.repository.base.ts`) returns, never throws: a new instance of the class its repository's contract names for the error's code, or for a P2002 whose field (`DatabaseUtil.isUniqueCollision`) its per-field map names, else `new AppUnknownException(error)` (`repository.md`, Writes).
