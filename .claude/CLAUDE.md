# ACK NestJS Boilerplate

@../AGENTS.md

## Claude-specific

Sessions start in `acceptEdits` (`permissions.defaultMode` in `.claude/settings.json`): a file edit applies without a prompt, and Bash runs under the `allow`, `ask`, and `deny` rules and hooks. `/plan` and Shift+Tab enter plan mode; its files land in `.superpowers/plans/`. The VS Code and Cursor extensions ignore `defaultMode`.

### Skills

`ack-work` is the one skill the session may invoke, from a `<jev_route>` reminder or on its own judgment when the request is code work. The owner types the other four: each carries `disable-model-invocation: true`, so its description stays out of the model's context. No agent preloads or invokes an `/ack-*` skill, and no skill starts another: each ends with a Next line naming the command the owner types. A fork runs in a subagent: it sees no conversation and cannot call `AskUserQuestion`; every question is a hand-back, and the owner re-runs it with the answer in the argument.

| Skill | Mode | Reason |
| --- | --- | --- |
| `/ack-work` | session | asks the owner at a plan, a decision, a fix, and a harness change |
| `/ack-spec` | fork | tester and coverage loop; needs no owner answer |
| `/ack-doc` | session | an ambiguous scope and every CONFLICT ask the owner |
| `/ack-pr` | session | `git push` and `gh pr` writes run on the owner's go-ahead |
| `/ack-harness` | session | settling the requirement and `diagnose` need the owner's conversation |

- `/ack-work`: routed code work through explorer, debugger, planner, coder, and reviewer, then writer and harness when the change needs them.
- `/ack-spec`: creates or repairs unit tests for code that exists; test and coverage prove it.
- `/ack-doc`: `docs/*.md`, root people files, `.github/**` but `copilot-instructions.md`; writer, then a reader test.
- `/ack-pr`: pull requests end to end: description, create, comment, review replies, version notes; merge is an ask.
- `/ack-harness`: `.claude/**`, `AGENTS.md`, `copilot-instructions.md` through harness; `diagnose` reads a transcript.

Every `ack-work` route that writes stops at the plan-file gate for the owner's yes (`.claude/skills/ack-work/references/gate.md`). `coder` reads the `.claude/skills/ack-work/references/add-<topic>.md` a task names (module, status code, queue, seed, notification). The `superpowers` plugin's using-superpowers session-start text does not apply outside an `/ack-*` skill; inside one, a `superpowers:*` skill runs only at the step that names it or through an agent's `skills:` preload. A skill in context is not invoked again for a reply, a clarifying question, or a later step of the same run: its text applies. Outside `writer`, which preloads them, `doc-coauthoring` and `diagram-design` run when the owner names them. Plugins: `enabledPlugins` (`.claude/settings.json`) enables but does not download a plugin; `extraKnownMarketplaces` registers marketplaces when the folder is trusted. Once per machine, run `claude plugin install <name>@<marketplace> --scope project` for `superpowers@claude-plugins-official`, `caveman@caveman`, `humanizer@humanizer`, `diagram-design@diagram-design`, and `example-skills@anthropic-agent-skills`; `typesafe@typesafe-ai` and `andrej-karpathy-skills@karpathy-skills` take `--scope user`.

### Routing

- `.claude/hooks/jev.sh route` is the `UserPromptSubmit` hook on every prompt; it calls TypeSafe's Jev only when `TYPESAFE_API_KEY` is set, and a settled route adds a `<jev_route>` reminder that starts `ack-work` with the route and each agent's model and effort. `jev.sh followup` names the docs pages and the harness change the work needs.
- A slash command or a prompt shorter than `min_request_chars` gets no `Jev:` line; any other prompt shows one (route, `off`, `unavailable`, or `no clear route`). Without Jev, `ack-work` decides both from its own tables. Keep `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` unset: they override the per-call `effort` and `model`.
- `JEV_ROUTER_DISABLED=1` turns Jev off. Questions and thresholds live in `.claude/hooks/jev.json`; tune them with `/typesafe:typesafe-ai`. An agent's floor is its frontmatter `model` and `effort`.

### Agents

Skills dispatch the agents in `.claude/agents/`:

- `explorer`: locates code, reads a third-party contract, assesses approaches.
- `planner`: writes a `feature` plan file from the approved design.
- `debugger`: reproduces a symptom, finds its root cause, reports a pin.
- `coder`: implements a pin or a plan task in `src/`, test-first where behaviour changes, seeds and the run surface included.
- `tester`: writes or repairs unit tests under `test/unit/` for code that exists.
- `reviewer`: judges a scope at a depth; reports, does not fix.
- `writer`: `docs/`, the root people files, `.github/` markdown, PR and version text.
- `harness`: the AI configuration: `.claude/**`, `AGENTS.md`, `.github/copilot-instructions.md`.

An agent missing something hands the question back; the session asks the owner and dispatches again.

### Gotchas

- `tsc` aborts on a `tsconfig.json` error and reports zero source errors, and `| grep -c 'error TS'` prints `0` on a crashed runner's empty output. Read the raw output and exit code.
- The `Stop` hook `.claude/hooks/verify.sh` runs `pnpm typecheck` and the unit specs of the changed modules when a file under `src/` or `test/` differs from `HEAD` or is untracked, and blocks the stop on failure. A changed path outside `src/modules/<name>/`, `src/common/<name>/`, and their `test/unit/` mirrors runs the full suite; pre-commit always does.
- `pnpm spell` always exits 0 (`|| true`). Read its output.
- `pnpm deadcode` is knip: unused files, exports, types, enum members, and dependencies warn and exit 0; unlisted dependencies, unresolved imports, unlisted binaries, and duplicate exports exit 1.
- A scoped `pnpm test:cov <path>` exits 1 with every spec passing because the 100% threshold is global. Read the `Tests` line and the per-file rows, not the exit code.
- `pnpm test` runs unit only, needs no Docker, and applies no threshold (`coverage.enabled` is `false`). Integration and e2e are held (`.claude/rules/testing.md`): no script, Vitest project, or folder exists, so `.github/workflows/test-integration.yml` and `test-e2e.yml` fail calling those scripts.
- A Bash call's `timeout` is 10 minutes at most, and the default through `BASH_DEFAULT_TIMEOUT_MS` (`.claude/settings.json` `env`). Claude Code moves a call running at its timeout to the background and reports when it ends, so a test run is never wrapped in GNU `timeout`.
- `npx <pkg>@<version>` runs the local binary when the package is installed.
- Claude worktrees live under `.claude/worktrees/` (gitignored); exclude it from a recursive root grep.
- The root `.env`, `keys/`, `generated/vault/`, and `.claude/settings.local.json` are unreadable, and a command that prints the environment is denied (`Read` deny, `guard-bash.sh`). Diagnose a boot auth failure from `docker-compose exec -T <service> printenv`, printing no secret, or a boot with the URL set in the environment, which `.env` never overrides; the owner fixes `.env`.

### Etiquette

- A commit message is one conventional subject line, `<type>(<scope>): <description>`, no body, no footer, 100 characters max. `.commitlintrc` is the source for types and subject case; scope is the module name.
- Commits and staging go through `ask`: propose the subject and wait. A finished task is not a commit request. Stage only what the owner names. Branch before committing on `main`.
- The working tree on disk is the source, unstaged and untracked files included; list changes with `git status --short`, `git diff HEAD --name-only`, `git ls-files --others --exclude-standard`.
- Diff with no second ref: `git diff <base>` includes uncommitted and staged work; `<base>..HEAD` omits it. Reviews and diffs keep git read-only (no fetch, no pull); only `/ack-pr` fetches and moves refs.
- Every commit in a series leaves `pre-commit` green (`AGENTS.md`, Commit gates). A commit touching neither `src/` nor `test/` passes `--no-verify`, which skips `commit-msg` (commitlint) too, so check the subject against `.commitlintrc` first. A commit touching either tree goes through the hooks, and a red gate is fixed, not skipped.
- Working artifacts are gitignored. `.superpowers/` takes only `plans/` (`YYYY-MM-DD-<slug>.md`), `specs/` (designs), and `sdd/` (build ledgers and briefs). `generated/docs/` holds agent reports, the sweep log, and PR, comment, and version text, never a plan. What prose may not cite: `.claude/rules/authoring.md`, Documentation prose and Harness files.
- Run every command in the foreground, bounded (`timeout 90` on a boot, which never ends on its own; `brew install coreutils` on stock macOS). Start no process the call leaves behind (`&`, `nohup`); a call Claude Code moves to the background at its timeout is the one exception and is waited for. Wait for each Agent hand-back, never poll; no wakeup, no cron job.
- Reply in English by default; match the language of the owner's turn. Artifacts stay English.
- When something is wrong, say so with a recommendation. State the assumption you act on; ask when two readings would produce different work.

### Rules

Rules load by path from `.claude/rules/`; the five unscoped ones bind every file: `layering.md`, `cross-module.md`, `null-safety.md`, `naming.md`, `discipline.md`. `authoring.md` binds every prose tree. `bash .claude/hooks/rules.sh <path>...` prints the rule files binding those paths.
