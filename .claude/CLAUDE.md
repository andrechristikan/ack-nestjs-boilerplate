# ACK NestJS Boilerplate

An opinionated, production-shaped NestJS starter. It is a boilerplate: no external client depends on it, so build the correct shape and change every call site.

@../AGENTS.md

## Claude-specific

Sessions start in `acceptEdits` (`permissions.defaultMode` in `.claude/settings.json`): a file edit applies without a prompt, and Bash runs under the `allow`, `ask`, and `deny` rules and the hooks. `/plan` and Shift+Tab enter plan mode on demand; its files land in `.superpowers/plans/`. The VS Code and Cursor extensions ignore `defaultMode`.

### Skills

Only the owner starts an `/ack-*` skill, by typing its name: each carries `disable-model-invocation: true`, so its description stays out of the model's context. No agent preloads or invokes one, and no skill starts another: each ends with a Next line naming the command the owner types. A fork runs in a subagent: it does not see the conversation and cannot call `AskUserQuestion`; every question is a hand-back, and the owner re-runs it with the answer in the argument.

| Skill | Mode | Reason |
| --- | --- | --- |
| `/ack-build` | fork | long coder loop plus one final review; needs no owner answer |
| `/ack-spec` | fork | tester and coverage loop; needs no owner answer |
| `/ack-review` | fork | one reviewer dispatch with a large report; the verdict is a hand-back |
| `/ack-plan` | session | interrogation, brainstorming, and plan approval ask the owner |
| `/ack-doc` | session | an ambiguous scope and every CONFLICT ask the owner |
| `/ack-pr` | session | `git push` and `gh pr` writes run on the owner's go-ahead |
| `/ack-harness` | session | settling the requirement and `diagnose` need the owner's conversation |

- `/ack-plan`: interrogation, explorer, brainstorming, writing-plans, owner approval; a symptom goes to debugger first.
- `/ack-build`: a plan or a pin through coder, test-first where `src/` behaviour changes, seeds and run surface too.
- `/ack-review`: judges a scope at a chosen depth through reviewer: PASS or FAIL, findings as pins.
- `/ack-spec`: creates or repairs unit, integration, or e2e tests for code that exists; test and coverage prove it.
- `/ack-doc`: `docs/*.md`, root people files, `.github/**` but `copilot-instructions.md`; writer, then a reader test.
- `/ack-pr`: pull requests end to end: description, create, comment, review replies, version notes; merge is an ask.
- `/ack-harness`: `.claude/**`, `AGENTS.md`, `copilot-instructions.md` through harness; `diagnose` reads a transcript.

`coder` reads the `.claude/skills/ack-build/references/add-<topic>.md` a task names (module, status code, queue, seed, notification). Workflow skills call `superpowers:*` skills at the step that names them or through an agent's `skills:` preload, nowhere else; outside one (a question, a small edit, a script) the session works without them. A skill in context is not invoked again for a reply, a clarifying question, or a later step of the same run: its text applies. Outside `writer`, which preloads them, `doc-coauthoring` and `diagram-design` run when the owner names them. Plugins: `enabledPlugins`, `extraKnownMarketplaces` (registered when the folder is trusted), `.claude/settings.json`. Once per machine: `claude plugin install superpowers@claude-plugins-official`, `claude plugin marketplace add anthropics/skills`, and `claude plugin install example-skills@anthropic-agent-skills --scope user` (`doc-coauthoring`).

### Agents

Skills dispatch the agents in `.claude/agents/`:

- `explorer`: locates code, reads a third-party contract, assesses approaches.
- `debugger`: reproduces a pinned symptom and finds its root cause with evidence; reports a pin, does not fix.
- `coder`: implements a named `src/` change, test-first where behaviour changes, seeds included; writes the test and run-surface files a plan task lists and repairs the run surface the change makes stale, `.github/workflows/` and `.github/dependabot.yml` included.
- `tester`: writes or repairs tests under `test/` for code that exists; does not edit `src/`.
- `reviewer`: judges a named scope at the depth the dispatch sets; reports, does not fix.
- `writer`: reader-facing prose: `docs/`, the root people files, `.github/` markdown except `copilot-instructions.md`, stale-fact repairs in `.github/` YAML, PR and version text.
- `harness`: the AI configuration: `.claude/**`, `AGENTS.md`, `.github/copilot-instructions.md`.

No agent can ask a question: one missing something stops and hands the question back, and the session asks the owner and dispatches again. Anything outside its dispatch is one line in its hand-back.

### Gotchas

- `tsc` aborts on a `tsconfig.json` error and reports zero source errors because it checked nothing, and `| grep -c 'error TS'` prints `0` on a crashed runner's empty output too. Read the raw output and exit code.
- The `Stop` hook `.claude/hooks/verify.sh` runs `pnpm typecheck` and `pnpm test` when a file under `src/` or `test/` differs from `HEAD` or is untracked, and blocks the stop on a failure.
- `pnpm spell` always exits 0 (`|| true`). Read its output.
- `pnpm deadcode` is knip: unused files, exports, types, enum members, and dependencies warn and exit 0; unlisted dependencies, unresolved imports, unlisted binaries, and duplicate exports exit 1.
- A scoped `pnpm test:cov <path>` exits 1 with every spec passing because the 100% threshold is global. Read the `Tests` line and the per-file rows, not the exit code.
- `pnpm test` runs unit only, needs no Docker, and applies no threshold (`coverage.enabled` is `false`). `pnpm test:integration` and `pnpm test:e2e` need a running Docker daemon.
- A Bash call's `timeout` is 10 minutes at most, and `BASH_DEFAULT_TIMEOUT_MS` (`.claude/settings.json` `env`) makes 10 minutes the default. A call still running at its timeout is moved to the background by Claude Code and reports when it ends, so a test run is never wrapped in GNU `timeout`. The first `pnpm test:integration` or `pnpm test:e2e` on a machine pulls the Testcontainers images and can take that long.
- `npx <pkg>@<version>` runs the local binary when the package is installed.
- Claude worktrees live under `.claude/worktrees/` (gitignored); a recursive grep from the root reads them, so exclude it.

### Etiquette

- A commit message is one conventional subject line, `<type>(<scope>): <description>`, no body, no footer, 100 characters max. `.commitlintrc` is the source for types and subject case; scope is the module name.
- Commits and staging go through `ask`: propose the subject and wait. A finished task is not a commit request. Stage only what the owner names. Branch before committing on `main`.
- The working tree on disk is the source, unstaged and untracked files included; list changes with `git status --short`, `git diff HEAD --name-only`, `git ls-files --others --exclude-standard`.
- Diff with no second ref: `git diff <base>` includes uncommitted and staged work; `<base>..HEAD` omits it. Reviews and diffs keep git read-only (no fetch, no pull); only `/ack-pr` fetches and moves refs.
- A commit touching neither `src/` nor `test/` passes `--no-verify`: the `pre-commit` gate runs over the whole repository whatever is staged (`AGENTS.md`). `--no-verify` skips `commit-msg` (commitlint) too, so check the subject against `.commitlintrc` first. A commit touching either tree goes through the hooks, and a red gate is fixed, not skipped.
- `lint-staged` restages what prettier touches, so a granular commit series is not possible.
- Working artifacts are gitignored: `.superpowers/` holds every superpowers skill output (spec, plan, sdd brief and ledger); `generated/docs/` holds agent reports, the sweep log, and PR, comment, and version text; neither holds the other's files. What prose may not cite: `.claude/rules/authoring.md`, Documentation prose and Harness files.
- Run every command in the foreground, bounded (`timeout 90` on a boot, which never ends on its own; GNU coreutils, `brew install coreutils` on stock macOS). `run_in_background` is denied (`guard-bash.sh`). Start no process the call leaves behind (`&`, `nohup`); a call Claude Code moves to the background at its timeout is the one exception and is waited for. Wait for each Agent hand-back, never poll (`Monitor`, `Workflow` denied); no wakeup, no cron job.
- Reply in English by default; match the language of the owner's turn. Artifacts stay English.
- When something is wrong, say so with a recommendation. State the assumption you act on; ask when two readings would produce different work.

### Rules

Rules load by path from `.claude/rules/`; the four unscoped ones bind every file: `layering.md`, `cross-module.md`, `null-safety.md`, `naming.md`. `authoring.md` binds every prose tree, this file included. `bash .claude/hooks/rules.sh <path>...` prints the rule files binding those paths; every dispatch's `Rules to read:` is its output.
