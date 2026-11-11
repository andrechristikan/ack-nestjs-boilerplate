# Decision Records

Each line is one accepted decision: its number, title, chosen option, and rejected options. The record `NNNN-<slug>.md` beside this file holds the context, the reason each option was rejected, and the consequences.

- 0001 · Write conflict loser answers once · chosen: the loser gets the guard's exception once · rejected: a transaction retry in any flow (logout included)
- 0002 · S3 without bucket versioning · chosen: `AwsS3Service` ignores bucket versioning · rejected: version-aware list and delete
- 0003 · One signed-in user per device · chosen: a login signs out every other user on the device · rejected: several accounts signed in on one device
- 0004 · Use case, service, repository · chosen: one use case per action, rules in services shared downward on a declared order · rejected: domains as orchestrators, domain events for orchestration, grouped multi-method use cases, a separate `src/application/` tier
- 0005 · Workspace above user · chosen: `WorkspaceService` may inject `UserService`, user calls into workspace are use cases · rejected: user above workspace
- 0006 · Two modules per feature · chosen: `<Module>Module` and `<Module>UseCaseModule` · rejected: one module per feature, four modules per feature
- 0007 · Shared cross-module transaction in the highest service · chosen: a service of the highest participating module owns a sequence two or more use cases share · rejected: the sequence copied per use case, a shared use case
- 0008 · `DatabaseService` outside repositories is `withTransaction` only · chosen: every statement goes through a repository · rejected: `databaseService.client` in a service or use case
- 0009 · The `<module>.` file prefix stays · chosen: `user.sign-up.use-case.ts` · rejected: short names (`sign-up.use-case.ts`)
- 0010 · Feature dependency order · chosen: kernel, device, session, auth, password-history, notification, term-policy, user, workspace, project, analytic · rejected: password-history in the kernel, `AuthPasswordUtil` in the kit
- 0011 · `@Global()` only for guard-injected modules · chosen: eight modules global, notification not · rejected: notification global, everything global
- 0013 · Thick outbox, BullMQ as the worker · chosen: an `Outbox` row in the transaction, the job carries `{ outboxId }`, dispatch after commit · rejected: no outbox (post-commit enqueue), a thin outbox deleting rows after enqueue, the payload copied into the job
- 0014 · Outbox history is kept · chosen: rows stay after completion · rejected: a cleanup job, a retention period
- 0015 · Pending rows recovered by boot drain and a one-minute sweep · chosen: the sweep re-dispatches rows `pending` after 30 seconds · rejected: boot drain alone, retry on the next request
- 0016 · Dedupe by `jobId` and `idempotencyKey` · chosen: `jobId = idempotencyKey` and a read inside the transaction before the insert · rejected: a unique index on the key
- 0017 · Step state lives in the row · chosen: `OutboxService.updateData` · rejected: `job.updateData`
- 0019 · Notify by reference · chosen: the processor resolves the recipient on the first attempt and records it · rejected: a producer snapshot for every kind
- 0020 · Security alert snapshot · chosen: the three credential-reset kinds snapshot live-session tokens before the revoke and are mandatory · rejected: resolving after the revoke, every registered device, honouring opt-outs on a credential reset
- 0021 · Admin import is a job, export is not · chosen: import answers with an `outboxId` and notifies the admin with `userImportResult` · rejected: synchronous import, asynchronous export
- 0022 · Cache invalidation is a job · chosen: API-key and feature-flag invalidation through `cache.invalidate` · rejected: a fatal synchronous delete
- 0023 · No event bus · chosen: BullMQ through the outbox is the one async mechanism · rejected: `@nestjs/event-emitter`, `@nestjs/cqrs`
- 0024 · MongoDB is the only authority; Redis is a cache · chosen: a miss or a non-connection error reads the row, writes are Mongo transactions invalidating after commit · rejected: Redis as the session authority, write-through as the consistency mechanism
- 0025 · Redis and MongoDB are both required · chosen: a connection error, a command timeout included, answers 503 fast · rejected: fail-open on an outage, Mongo-based rate limiting
- 0026 · Session cache in front of the row · chosen: a hit with a matching `jtiDigest` is trusted, anything else reads the row, TTL 15 minutes · rejected: no session cache, the raw jti stored
- 0027 · One transaction per flow, cross-module allowed · chosen: the use case or the highest service opens one transaction · rejected: two transactions where one suffices, a compensating write after commit
- 0028 · Two-factor challenge is a row · chosen: `TwoFactorChallenge` claimed inside the verify transaction · rejected: the challenge as Redis state (`GETDEL`)
- 0029 · Keyv direct, no cache-manager · chosen: `CacheService.readThrough` over the Keyv client · rejected: `cache-manager`
- 0030 · Health follows Redis · chosen: Redis down marks health down · rejected: an informational indicator
- 0031 · Boundary lint reads the module graph · chosen: the lint derives the graph from each feature's module file and fails a cycle · rejected: the feature order hard-coded in `eslint.config.mjs`, the order in a separate data file, the order outside lint
- 0032 · Every use case implements `IAppUseCase` · chosen: `IAppUseCase<TArgs, TResult>` with `execute(...args: TArgs): Promise<TResult>` · rejected: a single input object, a marker interface
- 0033 · Queues register in their feature · chosen: each feature registers its queues with its own factory, the kit holds the shared config · rejected: the kit holding every feature queue, one kit factory, one fast-fail connection for workers
- 0034 · GitHub sign-in exchanges a body-carried code in the guard · chosen: the client sends `code`, `redirectUri`, and `codeVerifier` in the body, the guard exchanges the code once before body validation, the access token is discarded · rejected: the code in `Authorization`, validating the full social body before the exchange, the exchange in the use case, revoking the token best-effort
