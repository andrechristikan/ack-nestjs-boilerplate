# ACK NestJS Boilerplate

An opinionated, production-shaped NestJS starter. It is a boilerplate: no external client
depends on it, so build the correct shape and change every call site.

@../AGENTS.md

## Claude-specific

Every session starts in plan mode (`permissions.defaultMode` in `.claude/settings.json`);
`/ack-code` keeps its plan-first phase. The VS Code and Cursor extensions ignore `defaultMode`.

### Skills

Type the name; nothing chains automatically. Each skill ends with a Next line. Do not start
a skill the owner did not name.

- `/ack-code`: every `src/` and run-surface change, test-first, seeds included.
- `/ack-spec`: create or repair unit, integration, or e2e tests for code that exists.
- `/ack-doc`: `docs/*.md`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, and `.github/**` except `copilot-instructions.md`.
- `/ack-pr`: GitHub pull requests end to end: description, create, comment, review replies,
  version notes. Merge stays an ask and is never done unasked.
- `/ack-harness`: `.claude/**`, `AGENTS.md`, `.github/copilot-instructions.md`.

Knowledge skills (`ack-add-module`, `ack-add-status-code`, `ack-add-queue`, `ack-add-seed`,
`ack-add-notification`) hold procedures, load on demand, and are not user-invocable.

Workflow skills call `superpowers:*` skills as steps. Superpowers, caveman, and
avoid-ai-writing are plugins installed once per machine; enabling them in
`.claude/settings.json` does not install them:

- `claude plugin install superpowers@claude-plugins-official`
- `claude plugin marketplace add JuliusBrussee/caveman`, then
  `claude plugin install caveman@caveman`
- `claude plugin marketplace add conorbronsdon/avoid-ai-writing`, then
  `claude plugin install avoid-ai-writing@conorbronsdon-skills`

### Agents

Skills dispatch the agents in `.claude/agents/`:

- `explorer`: locates code, reads a third-party contract, assesses approaches.
- `coder`: implements a named `src/` change test-first, seeds included, and repairs the run
  surface the change makes stale.
- `tester`: writes or repairs tests under `test/` for code that exists; does not edit `src/`.
- `reviewer`: judges a named scope at the depth the dispatch sets; reports, does not fix.
- `writer`: reader-facing prose: `docs/`, the root people files, `.github/**` except
  `copilot-instructions.md`, PR and version text.
- `harness`: the AI configuration: `.claude/**`, `AGENTS.md`,
  `.github/copilot-instructions.md`.

No agent can ask a question. An agent missing something stops and hands the question back;
the session asks the owner and dispatches again. Anything an agent notices outside its
dispatch is one line in its hand-back.

graphify (`uv tool install graphifyy`, then `graphify claude install`) writes a knowledge
graph to `graphify-out/`; `explorer` may run `graphify query "<question>"` to map an
end-to-end flow. Nothing requires it.

### Gotchas

- `tsc` aborts on a `tsconfig.json` error and reports zero source errors because it checked
  nothing. Read the raw output and the exit code.
- A grep count is not a verification: `| grep -c 'error TS'` prints `0` on empty output from
  a crashed runner too.
- `pnpm spell` always exits 0 (`|| true`). Read its output.
- `pnpm deadcode` is knip: unused files, exports, types, enum members, and dependencies warn
  and exit 0; unlisted dependencies, unresolved imports, unlisted binaries, and duplicate
  exports exit 1.
- A scoped `pnpm test:cov <path>` exits 1 with every spec passing because the 100% threshold
  is global. Read the `Tests` line and the per-file rows, not the exit code.
- `coverage.enabled` is `false` in `vitest.config.ts`, so `pnpm test` applies no threshold.
- `npx <pkg>@<version>` runs the local binary when the package is installed.
- Claude worktrees live under `.claude/worktrees/` (gitignored). A recursive grep from the
  repository root reads them; exclude that directory.

### Etiquette

- A commit message is one conventional subject line, `<type>(<scope>): <description>`, no
  body, no footer, 100 characters max. `.commitlintrc` is the source for types and subject
  case; scope is the module name.
- Commits and staging go through `ask`: propose the subject and wait. A finished task is not
  a commit request. Stage only what the owner names. Branch before committing on `main`.
- The working tree on disk is the source, unstaged and untracked files included; list
  changes with `git status --short`, `git diff HEAD --name-only`,
  `git ls-files --others --exclude-standard`.
- Diff with no second ref: `git diff <base>` includes uncommitted and staged work;
  `<base>..HEAD` omits it. Git stays read-only except in `/ack-pr`.
- A commit touching neither `src/` nor `test/` passes `--no-verify`: the `pre-commit` gate
  runs over the whole repository whatever is staged (`AGENTS.md`). A commit touching either
  tree goes through the hooks, and a red gate is fixed, not skipped.
- `lint-staged` restages what prettier touches, so a granular commit series is not possible.
- Working artifacts are gitignored: `.superpowers/` for specs and plans, plan mode's own
  files under `.superpowers/plans/`, `generated/docs/` for agent reports and PR text,
  `graphify-out/` for the graph. Do not cite them from `docs/`, `.claude/`, or a PR
  description.
- Reply in English by default; match the language of the owner's turn. Artifacts stay English.
- When something is wrong, say so with a recommendation. State the assumption you act on;
  ask when two readings would produce different work.

### Rules

Rules load by path from `.claude/rules/`; the four unscoped ones bind every file:
`layering.md`, `cross-module.md`, `null-safety.md`, `naming.md`. `authoring.md` binds every
prose tree, this file included.
