# ACK NestJS Boilerplate

@../AGENTS.md

## Claude-specific

Sessions start in `acceptEdits` (`permissions.defaultMode` in `.claude/settings.json`): a file edit applies without a prompt, and Bash runs under the `allow`, `ask`, and `deny` rules and hooks. `/plan` and Shift+Tab enter plan mode; its files land in `.scratch/plans/`. The VS Code and Cursor extensions ignore `defaultMode`.

### Skills

The owner types every `/ack-*` skill: each carries `disable-model-invocation: true`. No agent invokes one, and no skill starts another: each ends with a Next line naming the command the owner types. A feature runs through three, each in a fresh session:

| Skill | Runs in | Does |
| --- | --- | --- |
| `/ack-design` | session | question rounds with the owner, the test seams, the spec |
| `/ack-plan` | session, `reviewer` | tickets, the plan index, a cold read, the owner's approval |
| `/ack-build` | session, `coder`, `reviewer` | every ticket test-first, gates, review |

The rest stand alone, when the owner calls one:

| Skill | Runs in | Does |
| --- | --- | --- |
| `/ack-debug` | session, `debugger`, `coder`, `reviewer` | a symptom to its root cause, then the fix |
| `/ack-spec` | fork, as `tester` | unit specs for code that exists; the code wins |
| `/ack-doc` | session, `writer` | docs against the code; the code wins |
| `/ack-pr` | session, `writer` | a pull request, its description, comments, version notes |
| `/ack-harness` | session | `.claude/**`, `AGENTS.md`, the Copilot digest, decision records |

- A request for a feature or a cross-module change that arrives without a skill: name `/ack-design` and wait. A question, a lookup, or an edit inside one file needs none.
- A fork runs in a subagent: it sees no conversation and cannot call `AskUserQuestion`; every question is a hand-back, and the owner re-runs it with the answer in the argument.
- `coder` reads the `.claude/skills/ack-build/references/add-<topic>.md` a ticket names: module, status code, queue, seed, notification.

### Copied skills

The other folders under `.claude/skills/` are third-party skills copied by the `skills` CLI and pinned in `skills-lock.json`. Their licence texts are in `.claude/skills/licenses/`.

- They are never edited (`guard-write.sh` denies it). An `ack-*` skill or an agent follows one by path or preloads it, and states its departures.
- Where a copied skill and a rule, an `ack-*` skill, or an agent file differ, the copied skill loses.
- `pnpm skills:update` updates them; `/ack-harness` then re-reads each departure.
- `ponytail` runs at `full` wherever code is written, `ultra` in `/ack-design` and `/ack-harness`. `caveman` shapes agent hand-backs only: the session and every file stay in full sentences.

### Work artifacts

`.scratch/` is the local tracker, gitignored. One folder per feature, kebab-case:

- `.scratch/<feature>/spec.md`: the spec, from `/ack-design`.
- `.scratch/<feature>/issues/<NN>-<slug>.md`: one ticket per file, from `/ack-plan`. `**Status:**` is `ready-for-agent`, then `done`.
- `.scratch/<feature>/plan.md`: the index a person reads: approval, ticket order, the level each ticket runs at, status, evidence.

A platform issue is created only when the owner asks; `gh issue create` is an `ask`. `generated/docs/` holds the sweep log and PR, comment, and version text, never a spec, a plan, or an agent report.

### Levels

- `/ack-plan` sets the model and effort `coder` and `reviewer` run each ticket at. TypeSafe's Jev is optional there, through `bash .claude/hooks/jev.sh level`, never as a hook.
- Without `TYPESAFE_API_KEY`, or with `JEV_ROUTER_DISABLED=1`, it prints `off`; a failed call prints `unavailable`; `/ack-plan` then uses its own table.
- No agent runs below its frontmatter `model` and `effort`, or above opus, high (`max` in `.claude/hooks/jev.json`, beside the questions and thresholds).
- Keep `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` unset: they override the per-call `effort` and `model`.

### Agents

Skills dispatch the agents in `.claude/agents/`:

- `coder`: builds one ticket or one pin in `src/`, test-first, seeds and the run surface included.
- `reviewer`: judges a plan, a feature, a pin, or the harness; reports, does not fix.
- `debugger`: reproduces a symptom, finds its root cause, reports a pin.
- `tester`: writes or repairs unit specs under `test/unit/` for code that exists.
- `writer`: `docs/`, the root people files, `.github/` markdown, PR and version text.

The session locates code with the built-in `Explore` agent. An agent missing something hands the question back; the session asks the owner and dispatches again.

### Gotchas

- `tsc` aborts on a `tsconfig.json` error and reports zero source errors, and `| grep -c 'error TS'` prints `0` on a crashed runner's empty output. Read the raw output and exit code.
- The `Stop` hook `.claude/hooks/verify.sh` runs `pnpm typecheck` and the unit specs of the changed modules when a file under `src/` or `test/` differs from `HEAD` or is untracked, and blocks the stop on failure. A changed path outside `src/modules/<name>/`, `src/common/<name>/`, and their `test/unit/` mirrors runs the full suite; pre-commit always does.
- `pnpm spell` always exits 0 (`|| true`). Read its output.
- `pnpm deadcode` is knip: unused files, exports, types, enum members, and dependencies warn and exit 0; unlisted dependencies, unresolved imports, unlisted binaries, and duplicate exports exit 1.
- A scoped `pnpm test:cov <path>` exits 1 with every spec passing because the 100% threshold is global. Read the `Tests` line and the per-file rows, not the exit code.
- `pnpm test` runs unit only, needs no Docker, and applies no threshold (`coverage.enabled` is `false`). Integration and e2e are held (`.claude/rules/testing.md`): no script, Vitest project, or folder exists, so `.github/workflows/test-integration.yml` and `test-e2e.yml` fail calling those scripts.
- A Bash call's `timeout` is 10 minutes at most, and the default through `BASH_DEFAULT_TIMEOUT_MS` (`.claude/settings.json` `env`). Claude Code moves a call running at its timeout to the background and reports when it ends, so a test run is never wrapped in GNU `timeout`.
- `npx <pkg>@<version>` runs the local binary when the package is installed.
- Claude worktrees live under `.claude/worktrees/` (gitignored). A recursive grep from the root is denied unless it excludes `.claude` (`guard-bash.sh`).
- The root `.env`, `keys/`, `generated/vault/`, and `.claude/settings.local.json` are unreadable, and a command that prints the environment is denied (`Read` deny, `guard-bash.sh`). Diagnose a boot auth failure from `docker-compose exec -T <service> printenv`, printing no secret, and the `apis` log; the owner fixes `.env`.

### Etiquette

- A commit message is one conventional subject line, `<type>(<scope>): <description>`, no body, no footer, 100 characters max. `.commitlintrc` is the source for types and subject case; scope is the module name.
- Commits and staging go through `ask`: propose the subject and wait. A finished task is not a commit request. Stage only what the owner names. Branch before committing on `main`.
- The working tree on disk is the source, unstaged and untracked files included; list changes with `git status --short`, `git diff HEAD --name-only`, `git ls-files --others --exclude-standard`.
- Diff with no second ref: `git diff <base>` includes uncommitted and staged work; `<base>..HEAD` omits it. Reviews and diffs keep git read-only (no fetch, no pull); only `/ack-pr` fetches and moves refs.
- Every commit in a series leaves `pre-commit` green (`AGENTS.md`, Commit gates). A commit touching neither `src/` nor `test/` passes `--no-verify`, which skips `commit-msg` (commitlint) too, so check the subject against `.commitlintrc` first. A commit touching either tree goes through the hooks, and a red gate is fixed, not skipped.
- Run every command in the foreground, bounded (`timeout 60` on the boot's log wait, which never ends on its own; `brew install coreutils` on stock macOS). Start no process the call leaves behind (`&`, `nohup`). Two exceptions: a call Claude Code moves to the background at its timeout, which is waited for, and the compose containers a boot starts (`.claude/rules/docker.md`, Boot), which stay up for the next boot. Wait for each Agent hand-back, never poll.
- Reply in English by default; match the language of the owner's turn. Artifacts stay English.
- When something is wrong, say so with a recommendation. State the assumption you act on; ask when two readings would produce different work.

### Rules

Rules load by path from `.claude/rules/`; the five unscoped ones bind every file: `layering.md`, `cross-module.md`, `null-safety.md`, `naming.md`, `discipline.md`. `authoring.md` binds every prose tree. `bash .claude/hooks/rules.sh <path>...` prints the rule files binding those paths.
