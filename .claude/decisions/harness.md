# Harness decisions

## Decision records

### Decisions are reasons only, one file per scope

Rule: `authoring.md`, Decisions.

- Numbered records with a status, a date, a context, and consequences: a record and a rule would state the same thing twice.
- A decision index imported into `AGENTS.md`: it loads in every session, where the rules already carry each decision that binds code.
- Two grouped files, architecture and security: one file holds unrelated scopes, and a reader of one scope loads every other.

## Review and agents

### `reviewer` runs at opus, high, on every dispatch

Rule: `.claude/agents/reviewer.md`, frontmatter; `.claude/CLAUDE.md`, Levels.

- Effort medium: the reviewer is the only judge of a build and may miss no rule.
- The reviewer's effort set per review by Jev: a low-effort review misses a rule, and the reviewer is the only judge.

### Agents read MongoDB and Redis through read-only MCP servers

Rule: `AGENTS.md`, Prisma schema; `.claude/agents/reviewer.md` and `.claude/agents/debugger.md`, `tools:`.

- A database or Redis shell for an agent: every write stays the owner's.

## Hooks and checks

### A hook gates every write on the rules read whole

Rule: `.claude/hooks/rules-gate.sh`, registered in `.claude/settings.json`.

- The reader runs `rules.sh` on its own word: an agent told to read each rule it prints searched the rule files for keywords and read few of them whole.
- Claude Code's path-scoped loading alone: a file read through Bash loads no rule, and a new file's rules arrive after it is written.
- A `SubagentStop` hook running the gates: `coder` runs its gates and `/ack-review` runs them again.

### The code follows the rule, never the count of sites

Rule: `discipline.md`, Boilerplate stance.

- Rewording a rule to what most sites do: a site count measures what was written, not what is right, and an audit would then ratify each drift it finds.

### `discipline.md` is locked by an `ask` permission

Rule: `discipline.md`; `.claude/settings.json`, `permissions.ask`; `.claude/hooks/guard-bash.sh`.

- A sentence alone: nothing stops an edit.
- A `guard-write.sh` deny opened by an environment variable: every rightful change needs a manual step outside the conversation.

### A generated file is no check

Rule: `discipline.md`, Checks.

- A Swagger operation count or `paths` diff as proof that a change is behavior-neutral: the file is rewritten at every boot, so checking it proves nothing.

### Docs are linted by `markdownlint-cli2`, `remark-validate-links`, and Vale through one blocking `pnpm lint:docs`, and spell-checked by `cspell`

Rule: `authoring.md`, Documentation prose; `.claude/agents/writer.md`, Finish and hand back.

- `lychee` for the links: a Rust binary with no pnpm install, so the pre-commit hook cannot run it.
- A model-only check: a model reading the pages misses a broken link, a broken anchor, or a banned word that a tool finds on every run.

### Vale installs through the npm wrapper `@vvago/vale`

Rule: `package.json`, `devDependencies`; `pnpm-workspace.yaml`, `allowBuilds`.

- `brew install vale` with `errata-ai/vale-action` in CI: each developer installs it by hand, versions drift, and a commit hook cannot require it; a community wrapper whose download script needs `allowBuilds` costs less.

## Authoring

### The owner's working agreements live in `.claude/CLAUDE.md`, Etiquette, and the hard rules in `discipline.md`

Rule: `.claude/CLAUDE.md`, Etiquette; `discipline.md`, Hard rules.

- Claude's memory alone, for the working agreements or the hard rules: a memory binds one tool on one machine, and another machine or contributor never reads it, where a rule binds every agent, every skill, and the review.

### Every tree is spelled American English

Rule: `authoring.md`, Language.

- British spelling: the owner chose the US form for every tree, a `src/` enum value included, so one `cspell` dictionary (`en`) reads code and prose alike.

### Each page holds one Diátaxis type, through the copied `documentation` skill, with pages flat in `docs/*.md`

Rule: `authoring.md`, Page types; `.claude/agents/writer.md`, `skills:`.

- Folders per type and a documentation website: both are held with the monorepo feature.
