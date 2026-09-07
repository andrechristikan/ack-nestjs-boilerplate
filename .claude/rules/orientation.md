# Orientation — where the code is, and which rule governs it

Two questions every task answers before it writes anything: where does this live, and which
rules bind it. The first half of this file answers the first. **"Rules every task reads"** and
**"Rules by surface"** below answer the second, and they are the ONE map — an agent, a skill, or
a session reads them here rather than carrying its own copy.

## Finding code — prefer `graphify query` (HARD)

When the need is **find a file, find code, map a flow, or orient in unfamiliar
surface**, prefer:

```bash
graphify query "<question>"
```

before broad `Grep` / `Glob` / `find` / opening every candidate file. `graphify-out/`
exists in this repo — use it. Invoke the `graphify` skill when the query needs
unfamiliar orientation or the graph looks stale for the surface in hand.

## Prefer graphify for

- "Where does X live?" / "What calls Y?" / "Which docs cover Z?"
- Mapping an HTTP / queue / CLI flow end to end
- Locating a moved or renamed class before treating a path as gone
- Finding related modules, guards, filters, or registration sites
- Surfacing which `docs/*.md` belong to the work before reading the whole tree

## Grep / Glob / find stay correct for

- A path already known (SCOPE block, plan path, exact file the owner named)
- Verifying one concrete identifier after graphify (or a doc claim) pointed here
- Mechanical inventory with a fixed pattern (`find src -name '*.status-code.enum.ts'`,
  `ls src/modules/<feature>/`)
- Diff and git commands that name the surface (`git diff -- <scoped-path>`)

## Pattern

1. Ask the graph: `graphify query "<question>"`
2. Open the paths it returns
3. Use targeted `Grep` / `Read` only to confirm or finish the hop

Do not skip step 1 because Grep feels faster. Broad search first burns context and
misses cross-file edges the graph already holds.

## Rules every task reads

```
.claude/rules/architecture.md
.claude/rules/naming.md
.claude/rules/case-convention.md
.claude/rules/code-style.md
.claude/rules/comments.md
.claude/rules/null-safety.md
```

Six, because they bind every file in `src/` regardless of what it does. An agent adds its own
standing reads on top — `agent-communication.md` for how it reports, `testing.md` or
`testing-spec-style.md` for what it may write — and those live in the agent, not here.

## Rules by surface

Read the rows the work actually touches. Reading the file is the point: a rule quoted from
memory is how most rule violations get written, and a change can break a rule no checklist
thought to list.

| Touches | Read |
|---|---|
| layer placement, module `imports` / `providers` / `exports` | `nest-wiring.md` |
| another module's service, util, queue class, or repository | `cross-module.md` |
| `src/common/` | `common.md` |
| repository, Prisma query, transaction | `database.md` `concurrency.md` `dates.md` |
| a schema edit, and the push it hands back | `prisma-schema.md` |
| controller, route path, guard, decorator stack | `http.md` `router.md` `security.md` |
| request schema, validation | `validation.md` |
| response schema, serialization | `dto.md` |
| Swagger doc factory | `swagger.md` |
| a paginated list | `pagination.md` |
| an exception, a status code | `exceptions.md` `status-code.md` |
| an enum, or a `switch` over one | `enum.md` |
| BullMQ processor or enqueue | `queue.md` `concurrency.md` |
| notification, email, push, template | `notification.md` `queue.md` |
| file upload, CSV import, S3 presign | `file.md` |
| feature flag | `feature-flag.md` |
| i18n message, language JSON | `i18n.md` |
| config key, env var | `config.md` |
| cached value | `cache.md` |
| logging, Sentry | `logging.md` |
| credential, token, session, activity log | `security.md` |
| `src/migration/` | `seeding.md` |
| a spec | `testing.md` `testing-spec-style.md` |
| `docs/*.md`, `.claude/**` | `authoring.md` |

**Both halves bind whoever decides the shape, not only whoever types it.** A plan, a design, or
an answer given in conversation commits the same violation the code would — earlier, and in a
form the next reader treats as settled.
