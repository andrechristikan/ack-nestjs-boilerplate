# ACK NestJS Boilerplate

@../AGENTS.md

## Claude-specific

`.claude/settings.json` sets `acceptEdits`; a user-level `auto` replaces it. `ask`, `deny`, and both guards hold in either mode. `/plan` and Shift+Tab enter plan mode; its files land in `.scratch/plans/`. The VS Code and Cursor extensions ignore `defaultMode`.

### Skills

The owner types every `/ack-*` skill (`disable-model-invocation: true`), and no skill starts another: each ends with a Next line naming the command the owner types and what it does. A feature runs seven in order: `/ack-design` (question rounds, the spec), `/ack-plan` (tickets, the plan index, the owner's approval), `/ack-harness` (a requirement settled with the owner, written by the `harness` agent: `.claude/**`, `AGENTS.md`, the Copilot digest, decision entries), `/ack-build` (every ticket test-first), `/ack-review` (`review.md`, findings settled and fixed), `/ack-doc` (docs against the code), `/ack-pr` (a pull request and its text); the owner commits before `/ack-pr`. `/ack-debug` takes a symptom to its root cause and the fix; `/ack-spec`, a fork running as `tester`, writes unit specs for code that exists.

- A request for a feature or a cross-module change that arrives without a skill: name `/ack-design` and wait. A question, a lookup, or an edit inside one file needs none.
- A fork runs in a subagent: it sees no conversation and cannot call `AskUserQuestion`; every question is a hand-back, and the owner re-runs it with the answer in the argument.

### Copied skills

The other folders under `.claude/skills/` are third-party skills copied by the `skills` CLI and pinned in `skills-lock.json`. Their license texts are in `.claude/skills/licenses/`. Editing and updating them: `.claude/rules/harness.md`.

- Where a copied skill and a rule, an `ack-*` skill, or an agent file differ, the copied skill loses.
- `caveman` shapes agent hand-backs only: the session and every file stay in full sentences.
- `documentation` shapes pages inside `writer`, and the `/ack-doc` reader test takes its Step 4 checks.

### Work artifacts

`.scratch/` is the local tracker, gitignored. One folder per feature, kebab-case, `pr`, `requirements`, and `plans` reserved:

- `.scratch/<feature>/spec.md`: the spec, from `/ack-design`.
- `.scratch/<feature>/issues/<NN>-<slug>.md`: one ticket per file, from `/ack-plan`. `**Status:**` is `ready-for-agent`, then `done`.
- `.scratch/<feature>/plan.md`: the plan index, from `/ack-plan`.
- `.scratch/<feature>/review.md`: from `/ack-review`.
- `.scratch/requirements/`: a requirement settled for a later `/ack-harness` or `/ack-doc`. `.scratch/pr/`: PR, comment, and version text.

A platform issue is created only on the owner's word (`gh issue create` is an `ask`). The sweep log is `generated/report-src-sweep.md`.

### Levels

- No agent runs below its frontmatter `model` and `effort`, `reviewer` on the plan's cold read included.
- Keep `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` unset: they override the per-call `effort` and `model`.
- How `coder`'s effort is set: `.claude/rules/harness.md`, Levels.

### Agents

Skills dispatch the agents in `.claude/agents/`; each agent's `description` states its job. The session locates code with the built-in `Explore` agent. An agent missing something hands the question back; the session asks the owner and dispatches again.

### Gotchas

- `tsc` aborts on a `tsconfig.json` error and reports zero source errors, and `| grep -c 'error TS'` prints `0` on a crashed runner's empty output. Read the raw output and exit code.
- The `Stop` hook `.claude/hooks/verify.sh` runs `pnpm typecheck` and the unit specs of the changed modules when a file under `src/` or `test/` that this session wrote through a file tool differs from `HEAD` or is untracked, and blocks the stop on failure; a file changed through Bash is not gated. A stop whose gated files are unchanged since the last green run skips both checks. A changed path outside `src/modules/<name>/`, `src/common/<name>/`, and their `test/unit/` mirrors runs the full suite.
- Claude worktrees live under `.claude/worktrees/` (gitignored).
- A Bash call's `timeout` is 10 minutes at most, also the default (`BASH_DEFAULT_TIMEOUT_MS`, `.claude/settings.json` `env`). Claude Code moves a call running at its timeout to the background and reports when it ends, so a test run is never wrapped in GNU `timeout`.
- `pnpm spell` and `pnpm deadcode` exit codes: `.claude/rules/code-style.md`, Lint. `pnpm test` and `pnpm test:cov`: `.claude/rules/testing.md`, Layout and runs. A boot: `.claude/skills/ack-build/references/boot.md`.

### Etiquette

- A commit message is one conventional subject line, `<type>(<scope>): <description>`, no body, no footer, 100 characters max. `.commitlintrc` is the source for types and subject case; scope is the module name.
- Commits and staging go through `ask`. Propose a subject only when the owner asks for a commit or the running skill's Hand back lists one. A finished task, ticket, or build is not a commit request. Run no `git add`, `git restore --staged`, or `git reset` the owner did not name: a staged set is the owner's review. Branch before committing on `main`.
- The working tree on disk is the source, unstaged and untracked files included; list changes with `git status --short`, `git diff HEAD --name-only`, `git ls-files --others --exclude-standard`.
- Diff with no second ref: `git diff <base>` includes uncommitted and staged work; `<base>..HEAD` omits it. No fetch or pull outside `/ack-pr`, which alone moves refs.
- Every commit in a series leaves `pre-commit` and `commit-msg` green (`AGENTS.md`, Commit gates); a red hook is fixed, not skipped.
- Run every command and Agent call in the foreground, bounded: GNU `timeout` wraps the boot's endless log wait (`.claude/skills/ack-build/references/boot.md`, step 4; `brew install coreutils` on stock macOS). Start no process the call leaves behind (`&`, `nohup`), the compose containers a boot starts aside. Wait for a call Claude Code moves to the background at its timeout and for each Agent hand-back, never poll.
- Reply in the language of the owner's turn, English by default; artifacts stay English.
- When something is wrong, say so with a recommendation. A technical objection is proven on the booted app, then put to the owner; an agent that cannot boot hands it back.
- The session, with the owner:
    - Before an edit outside what the owner approved (a spec, a plan, a review's fix list, a pin, a settled requirement, the typed skill's scope), show the names, shape, wording, and files, and wait for a yes; a picked option approves the direction only.
    - Ask through `AskUserQuestion`, one decision per question: the point in plain words, the code before and after, then options, the recommended first. Ask what is open and each `/ack-review` finding; apply and list a call a rule, a decision entry, or the spec settles.
    - Read a full check (a whole scope, a whole standard) whole, or ask its split first.
    - In a plan split into phases the owner runs one at a time, explain one phase and stop for the per-item reply; announce each finished task as `N/total`.
- Fix in the run a finding fixable within its skill's boundaries; which others are sweep rows: `.claude/skills/ack-spec/references/sweep-log.md`.
- A hand-back names no stale `docs/*` page, no git staging state, no later phase of a phased plan, and no owner command already in the plan; the Next line and the skills it names stay.
- No working agreement lives only in Claude's memory.

### Rules

Rules load by path from `.claude/rules/`; the five unscoped ones load for every file: `layering.md`, `cross-module.md`, `null-safety.md`, `naming.md`, `discipline.md`, which outranks every other rule, skill, and agent file. An edit of it asks the owner (`permissions.ask`); `guard-bash.sh` denies a Bash write to it. `authoring.md` binds every prose tree.
