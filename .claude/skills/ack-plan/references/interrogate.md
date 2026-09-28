# ack-plan interrogation checklist

Ask only what the owner has not named and the code cannot answer. Each line names what to ask
and where the answer's shape is decided.

## Surface

- Route scope: `/public`, `/system`, `/admin`, `/user`, or `/shared`
  (`src/router/http/router.http.<scope>.module.ts`; `.claude/rules/http.md`,
  `.claude/rules/layering.md`).
- Workspace scoping: does the route resolve its subject from the `x-workspace-id` header
  through `@WorkspaceProtected()` or `@WorkspaceMemberProtected(...roles)` and carry
  `@FeatureFlagProtected('workspace')` (`.claude/rules/cross-module.md`,
  `.claude/rules/feature-flag.md`, `.claude/rules/http.md`).
- Who may call it: role (`@RoleProtected`), CASL policy ability (`@PolicyProtected`),
  term-policy gating (`@TermPolicyAcceptanceProtected`), API key (`@ApiKeyProtected`,
  `@ApiKeySystemProtected`) (`.claude/rules/security.md`, `.claude/rules/http.md`).

## Shape

- Request and response: the zod DTO fields, which are optional, which are nullable
  (`.claude/rules/dto.md`, `.claude/rules/null-safety.md`).
- A list endpoint: pagination type, the `search` and `orderBy` allow-lists, filter defaults
  (`.claude/rules/dto.md` Pagination).
- Status codes and exceptions: which failures are new, which module owns each subject
  (`ack-add-status-code`, `.claude/rules/exceptions.md`).
- i18n: every new message key, in every language directory under `src/languages/`
  (`.claude/rules/i18n.md`).

## Data

- Prisma delta: model, field, index, relation; the data consequence for existing rows; soft
  delete and what cascades (`.claude/rules/database.md`).
- A seed and its `remove` pair (`ack-add-seed`, `.claude/rules/seeding.md`).
- Config keys and env variables the change reads (`.claude/rules/config.md`).

## Side effects

- Activity log row: which action, which subject (`.claude/rules/security.md` Activity log).
- Notification kind and channel (`ack-add-notification`, `.claude/rules/queue.md`).
- Queue job: name, payload, retry (`ack-add-queue`, `.claude/rules/queue.md`).
- Cache key: what it caches and what invalidates it (`.claude/rules/config.md` Cache).

## Failure

- One failure path per happy path, each with the status it returns: invalid input, missing
  subject, forbidden, conflict, downstream timeout (`.claude/rules/exceptions.md`).
- Concurrency: a double submit, two writers on one row, and whether the call is idempotent
  (`.claude/rules/database.md` Transactions).

## Close

- Out of scope, stated as a list.
- Docs: `yes` or `no`.
- Review depth: `rules and boot` or `end to end`. `end to end` is worth it when a hand-off
  crosses a module, a queue, or a cascade.
