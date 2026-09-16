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

## A recursive search from the repo root reads other branches (HARD)

`.claude/worktrees/` holds git worktrees of other branches — a full second checkout each, with
its own `src/`, `docs/` and `.claude/`, and each carrying uncommitted work of its own.
`git worktree list` names them.

Two consequences bind every task:

- **A recursive sweep started at the repository root walks into them.** `grep -r`, `find` and
  `Glob` return `src/` code and rule text from a branch that is not the one in hand. Scope
  every sweep to the tree you mean — `src/`, `test/`, `docs/`, or
  `.claude/rules .claude/agents .claude/skills .claude/CLAUDE.md`, never a bare `.` or
  `.claude`. A hit whose path contains `worktrees/` is another branch's file and is never
  evidence about this one.
- **A file under heavy edit in another worktree is a collision waiting to happen.** Before
  planning a change that rewrites a shared file — `src/common/**` most of all — check
  `git -C <worktree> status --porcelain` for it, and say so rather than discovering it at merge
  time.

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
.claude/rules/code-style.md
.claude/rules/null-safety.md
```

Four, because they bind every file in `src/` regardless of what it does. An agent adds its own
standing reads on top — `agent-communication.md` for how it reports, `testing.md` or
`testing-spec-style.md` for what it may write — and those live in the agent, not here.

## Rules by surface

Read the rows the work actually touches. Reading the file is the point: a rule quoted from
memory is how most rule violations get written, and a change can break a rule no checklist
thought to list.

| Touches | Read |
|---|---|
| layer placement, module `imports` / `providers` / `exports` | `nest-wiring.md` |
| another module's domain, util, queue class, or repository | `cross-module.md` |
| `src/common/` | `common.md` |
| repository, Prisma query, transaction | `database.md` `concurrency.md` `dates.md` |
| a schema edit, and the push it hands back | `prisma-schema.md` |
| controller, route path, guard, decorator stack | `http.md` `router.md` `security.md` |
| request schema, validation | `validation.md` |
| response schema, serialization | `dto.md` |
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
| a unit spec (`test/**/*.spec.ts`) | `testing.md` `testing-spec-style.md` |
| an E2E spec (`test/e2e/**`) | `testing-e2e.md` `http.md` `router.md` `security.md` `validation.md` `dto.md` `exceptions.md` |
| `docs/*.md`, `.claude/**` | `authoring.md` |

**Both halves bind whoever decides the shape, not only whoever types it.** A plan, a design, or
an answer given in conversation commits the same violation the code would — earlier, and in a
form the next reader treats as settled.

## Standing extras by role

The four and the surface table above are the shared map. These extras live on the role, and this
table is the index so none is skipped:

| Role | Also always reads |
|---|---|
| `explorer` | `security.md` (research queries), `agent-communication.md` |
| `planner` | `agent-communication.md` |
| `coder` | `testing.md` `testing-spec-style.md` (TDD spec of this plan), `agent-communication.md` |
| `seed-writer` | `seeding.md`, `agent-communication.md` |
| `doc-writer` | `authoring.md`, `agent-communication.md` |
| `reviewer` | `agent-communication.md` |
| `reviewer-e2e` | `agent-communication.md`. Every HTTP path also: `http.md` `router.md` `security.md` `validation.md` `dto.md` `exceptions.md` |
| `test-writer` | `testing.md` `testing-spec-style.md` `agent-communication.md` |
| `e2e-writer` | `testing-e2e.md` `agent-communication.md`. Every route also: `http.md` `router.md` `security.md` `validation.md` `dto.md` `exceptions.md` |
| `ack-code` | the map, then the extras of whoever it dispatches |
| `ack-spec` | `testing.md` `testing-spec-style.md` |
| `ack-e2e` | `testing-e2e.md` `http.md` `router.md` `security.md` `validation.md` `dto.md` `exceptions.md` |
| `ack-docs` / `ack-claude-config` | `authoring.md` |

A skill takes this map before it dispatches. An agent takes the four, its extras, then every
surface row the work touches — the FILE, not a memory of it.

## Docs are not a standing read (HARD)

`docs/*.md` and the root `README.md` are for people. They are never loaded into a session
and never a standing read for an agent.

**explorer and planner** open a named doc only when a rule's "Flow narrative" pointer is
the question in hand and the rule file does not settle it. One file, the one the rule
names. Never the `docs/` tree.

Every other agent — `coder`, `seed-writer`, `test-writer`, `reviewer`, `reviewer-e2e`,
`e2e-writer` — does not read `docs/` to do its job. `doc-writer` is the exception: those files
are its subject.
