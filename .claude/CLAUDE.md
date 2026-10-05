# ACK NestJS Boilerplate

An opinionated, production-shaped NestJS starter. It is a boilerplate: no external client
depends on it, so build the correct shape and change every call site.

@../AGENTS.md

## Claude-specific

Sessions start in `acceptEdits` (`permissions.defaultMode` in `.claude/settings.json`): a file edit applies
without a prompt, and Bash runs under the `allow`, `ask`, and `deny` rules and the hooks. `/ack-plan` plans
first through superpowers; `/ack-build` builds an approved plan or a pin. `/plan` and Shift+Tab enter plan mode
on demand; its files land in `.superpowers/plans/`. The VS Code and Cursor extensions ignore `defaultMode`.

### Skills

Type the name; nothing chains automatically. Each skill ends with a Next line. Do not start a skill the owner did not name.

- `/ack-plan`: settles a `src/` change in the session: interrogation, explorer, brainstorming,
  writing-plans, owner approval; ends with a plan path.
- `/ack-build`: builds an approved plan or a pin through coder and reviewer, test-first where
  `src/` behaviour changes, seeds and the run surface included; review after every task.
- `/ack-review`: judges a named scope at a chosen depth through reviewer, four checks, verdict
  PASS or FAIL; findings come back as pins.
- `/ack-debug`: pins a symptom with the owner, finds its cause through debugger, and ends
  with a pin for `/ack-build` or a request for `/ack-plan`.
- `/ack-spec`: create or repair unit, integration, or e2e tests for code that exists.
- `/ack-doc`: `docs/*.md`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, and `.github/**` except `copilot-instructions.md`.
- `/ack-pr`: GitHub pull requests end to end: description, create, comment, review replies,
  version notes. Merge stays an ask and is never done unasked.
- `/ack-harness`: `.claude/**`, `AGENTS.md`, `.github/copilot-instructions.md`; `diagnose`
  reads a session transcript first.

The procedures for adding a module, status code, queue, seed, or notification live in
`.claude/skills/ack-build/references/add-<topic>.md`; `coder` reads the one a task names. Workflow skills call
`superpowers:*` skills at the step that names them, or through an agent's `skills:` preload, and nowhere
else; outside a workflow skill (a question, a small edit, a script) the session works without them. A
skill already in the session's context is not invoked again for a reply, a clarifying question, or a
later step of the same run; its text is present and applies. `writer` preloads `caveman:caveman`,
`humanizer:humanizer`, `example-skills:doc-coauthoring`, and `diagram-design:diagram-design`; outside `writer`,
`doc-coauthoring` and `diagram-design` run when the owner names them. Plugins (`enabledPlugins`, `.claude/settings.json`):

- GitHub marketplaces in `extraKnownMarketplaces`, registered when the folder is trusted:
  `caveman@caveman`, `humanizer@humanizer`, `diagram-design@diagram-design`
- external source, once per machine: `claude plugin install superpowers@claude-plugins-official`
- user scope, once per machine: `claude plugin marketplace add anthropics/skills`, then
  `claude plugin install example-skills@anthropic-agent-skills --scope user`, which carries `doc-coauthoring`

### Agents

Skills dispatch the agents in `.claude/agents/`:

- `explorer`: locates code, reads a third-party contract, assesses approaches.
- `debugger`: reproduces a pinned symptom and finds its root cause with evidence; reports a
  pin, does not fix.
- `coder`: implements a named `src/` change, test-first where behaviour changes, seeds included;
  writes the test and run-surface files a plan task lists and repairs the run surface the change
  makes stale, `.github/workflows/` and `.github/dependabot.yml` included.
- `tester`: writes or repairs tests under `test/` for code that exists; does not edit `src/`.
- `reviewer`: judges a named scope at the depth the dispatch sets; reports, does not fix.
- `writer`: reader-facing prose: `docs/`, the root people files, `.github/` markdown except
  `copilot-instructions.md`, stale-fact repairs in `.github/` YAML, PR and version text.
- `harness`: the AI configuration: `.claude/**`, `AGENTS.md`, `.github/copilot-instructions.md`.

No agent can ask a question: one missing something stops and hands the question back, and the session
asks the owner and dispatches again. Anything outside its dispatch is one line in its hand-back.

graphify (`uv tool install graphifyy`, then `graphify claude install`) writes a knowledge
graph to `graphify-out/`; `explorer` may run `graphify query "<question>"` to map an
end-to-end flow. Nothing requires it.

### Gotchas

- `tsc` aborts on a `tsconfig.json` error and reports zero source errors because it checked nothing, and
  `| grep -c 'error TS'` prints `0` on a crashed runner's empty output too. Read the raw output and exit code.
- The `Stop` hook `.claude/hooks/verify.sh` runs `pnpm typecheck` and `pnpm test` when a file under `src/` or
  `test/` differs from `HEAD` or is untracked, and blocks the stop on a failure.
- `pnpm spell` always exits 0 (`|| true`). Read its output.
- `pnpm deadcode` is knip: unused files, exports, types, enum members, and dependencies warn
  and exit 0; unlisted dependencies, unresolved imports, unlisted binaries, and duplicate
  exports exit 1.
- A scoped `pnpm test:cov <path>` exits 1 with every spec passing because the 100% threshold
  is global. Read the `Tests` line and the per-file rows, not the exit code.
- `pnpm test` runs unit only, needs no Docker, and applies no threshold (`coverage.enabled` is
  `false`). `pnpm test:integration` and `pnpm test:e2e` need a running Docker daemon; the
  first run pulls the images and can take minutes before a spec starts.
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
- Diff with no second ref: `git diff <base>` includes uncommitted and staged work; `<base>..HEAD` omits
  it. Reviews and diffs keep git read-only (no fetch, no pull); only `/ack-pr` fetches and moves refs.
- A commit touching neither `src/` nor `test/` passes `--no-verify`: the `pre-commit` gate runs over the
  whole repository whatever is staged (`AGENTS.md`). `--no-verify` skips `commit-msg` (commitlint) too, so
  check the subject against `.commitlintrc` first. A commit touching either tree goes through the hooks,
  and a red gate is fixed, not skipped.
- `lint-staged` restages what prettier touches, so a granular commit series is not possible.
- Working artifacts are gitignored: `.superpowers/` for specs and plans, `generated/docs/`
  for agent reports and PR text, `graphify-out/` for the graph. Do not cite them from
  `docs/`, `.claude/`, or a PR description.
- Reply in English by default; match the language of the owner's turn. Artifacts stay English.
- When something is wrong, say so with a recommendation. State the assumption you act on;
  ask when two readings would produce different work.

### Rules

Rules load by path from `.claude/rules/`; the four unscoped ones bind every file:
`layering.md`, `cross-module.md`, `null-safety.md`, `naming.md`. `authoring.md` binds every
prose tree, this file included.
