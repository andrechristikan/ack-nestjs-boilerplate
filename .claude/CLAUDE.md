# ACK NestJS Boilerplate

A boilerplate: no external client depends on it, so build the correct shape and change every call site.

@../AGENTS.md

## Claude-specific

Sessions start in `acceptEdits` (`permissions.defaultMode` in `.claude/settings.json`): a file edit applies without a prompt, and Bash runs under the `allow`, `ask`, and `deny` rules and hooks. `/plan` and Shift+Tab enter plan mode; its files land in `.superpowers/plans/`. The VS Code and Cursor extensions ignore `defaultMode`.

### Skills

Only the owner starts an `/ack-*` skill, by typing its name: each carries `disable-model-invocation: true`, so its description stays out of the model's context. No agent preloads or invokes one, and no skill starts another: each ends with a Next line naming the command the owner types. A fork runs in a subagent: it sees no conversation and cannot call `AskUserQuestion`; every question is a hand-back, and the owner re-runs it with the answer in the argument.

| Skill | Mode | Reason |
| --- | --- | --- |
| `/ack-work` | session | asks the owner at a plan, a decision, a fix, and a harness change |
| `/ack-spec` | fork | tester and coverage loop; needs no owner answer |
| `/ack-doc` | session | an ambiguous scope and every CONFLICT ask the owner |
| `/ack-pr` | session | `git push` and `gh pr` writes run on the owner's go-ahead |
| `/ack-harness` | session | settling the requirement and `diagnose` need the owner's conversation |

- `/ack-work`: routed code work through explorer, debugger, coder, and reviewer, then writer and harness when the change needs them.
- `/ack-spec`: creates or repairs unit tests for code that exists; test and coverage prove it.
- `/ack-doc`: `docs/*.md`, root people files, `.github/**` but `copilot-instructions.md`; writer, then a reader test.
- `/ack-pr`: pull requests end to end: description, create, comment, review replies, version notes; merge is an ask.
- `/ack-harness`: `.claude/**`, `AGENTS.md`, `copilot-instructions.md` through harness; `diagnose` reads a transcript.

`coder` reads the `.claude/skills/ack-work/references/add-<topic>.md` a task names (module, status code, queue, seed, notification). Workflow skills call `superpowers:*` skills at the step that names them or through an agent's `skills:` preload, nowhere else; outside one (a question, a small edit, a script) the session works without them. A skill in context is not invoked again for a reply, a clarifying question, or a later step of the same run: its text applies. Outside `writer`, which preloads them, `doc-coauthoring` and `diagram-design` run when the owner names them. Plugins: `enabledPlugins` (`.claude/settings.json`) enables but does not download a plugin; `extraKnownMarketplaces` registers marketplaces when the folder is trusted. Once per machine, run `claude plugin install <name>@<marketplace> --scope project` for `superpowers@claude-plugins-official`, `caveman@caveman`, `humanizer@humanizer`, `diagram-design@diagram-design`, and `example-skills@anthropic-agent-skills`; `typesafe@typesafe-ai` and `andrej-karpathy-skills@karpathy-skills` take `--scope user`.

### Routing

- `.claude/hooks/jev.sh` sends `/ack-work` requests to TypeSafe's Jev only when `TYPESAFE_API_KEY` is set: `route` (the `UserPromptExpansion` hook) adds a `<jev_route>` reminder with the route and each agent's model and effort; `followup` names the docs pages and the harness change the work needs. `route` runs once per typed `/ack-work`: a later message gets no route, so a new task takes a new `/ack-work`.
- Each `/ack-work` shows a `Jev:` line (route, `off`, `unavailable`, `no clear route`, or `request too short to judge`). Without Jev, `/ack-work` decides both from its own tables. Keep `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` unset: they override the per-call `effort` and `model`.
- `JEV_ROUTER_DISABLED=1` turns Jev off. Questions and thresholds live in `.claude/hooks/jev.json`; tune them with `/typesafe:typesafe-ai`.

### Agents

Skills dispatch the agents in `.claude/agents/`:

- `explorer`: locates code, reads a third-party contract, assesses approaches.
- `debugger`: reproduces a symptom, finds its root cause, reports a pin.
- `coder`: implements a pin or a plan task in `src/`, test-first where behaviour changes, seeds and the run surface included.
- `tester`: writes or repairs unit tests under `test/unit/` for code that exists.
- `reviewer`: judges a scope at a depth; reports, does not fix.
- `writer`: `docs/`, the root people files, `.github/` markdown, PR and version text.
- `harness`: the AI configuration: `.claude/**`, `AGENTS.md`, `.github/copilot-instructions.md`.

No agent can ask a question: one missing something stops and hands the question back, and the session asks the owner and dispatches again. Anything outside its dispatch is one line in its hand-back.

### Gotchas

- `tsc` aborts on a `tsconfig.json` error and reports zero source errors, and `| grep -c 'error TS'` prints `0` on a crashed runner's empty output. Read the raw output and exit code.
- The `Stop` hook `.claude/hooks/verify.sh` runs `pnpm typecheck` and `NODE_ENV=test pnpm test` when a file under `src/` or `test/` differs from `HEAD` or is untracked, and blocks the stop on failure.
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
- `pre-commit` runs `typecheck`, `deadcode`, `spell`, and `test` over the whole tree whatever is staged (`AGENTS.md`), so every commit in a series leaves it green. A commit touching neither `src/` nor `test/` passes `--no-verify`, which skips `commit-msg` (commitlint) too, so check the subject against `.commitlintrc` first. A commit touching either tree goes through the hooks, and a red gate is fixed, not skipped.
- Working artifacts are gitignored. A plan goes to `.superpowers/plans/YYYY-MM-DD-<feature-name>.md`, and nothing else goes under `.superpowers/`. `generated/docs/` holds agent reports, the sweep log, and PR, comment, and version text, never a plan. `.claude/hooks/guard-write.sh` denies any other `.superpowers/` path and a `*-spec.md`, `*-plan.md`, or `*-design.md` under `generated/docs/`. What prose may not cite: `.claude/rules/authoring.md`, Documentation prose and Harness files.
- Run every command in the foreground, bounded (`timeout 90` on a boot, which never ends on its own; `brew install coreutils` on stock macOS). `run_in_background` is denied (`guard-bash.sh`). Start no process the call leaves behind (`&`, `nohup`); a call Claude Code moves to the background at its timeout is the one exception and is waited for. Wait for each Agent hand-back, never poll (`Monitor`, `Workflow` denied); no wakeup, no cron job (`ScheduleWakeup`, `CronCreate` denied).
- Reply in English by default; match the language of the owner's turn. Artifacts stay English.
- When something is wrong, say so with a recommendation. State the assumption you act on; ask when two readings would produce different work.

### Rules

Rules load by path from `.claude/rules/`; the five unscoped ones bind every file: `layering.md`, `cross-module.md`, `null-safety.md`, `naming.md`, `discipline.md`. `authoring.md` binds every prose tree. `bash .claude/hooks/rules.sh <path>...` prints the rule files binding those paths; a dispatch template's `Rules to read:` is its output.
