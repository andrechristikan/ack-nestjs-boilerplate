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

### `reader` runs at sonnet, high

Rule: `.claude/agents/reader.md`, frontmatter.

- Opus for the cold read: the question is whether a builder holding only the ticket must guess, the builder is sonnet, and `advisor` on opus reads third.

### `coder` runs at sonnet, high, on every dispatch

Rule: `.claude/agents/coder.md`, frontmatter; `.claude/rules/harness.md`, Levels.

- An effort per ticket from a Jev score: the score sat at its top value for close to half the tickets, and effort moves a small share of a dispatch's cost.
- Medium, rising after a failed dispatch: a failed dispatch costs a second build and a second review.

### `advisor` runs at opus, high

Rule: `.claude/agents/advisor.md`, frontmatter.

- Fable, medium: the owner runs fable for a limited time, and the harness names no model the owner does not always run.

### Jev routes a decision; it sets no level

Rule: `.claude/rules/harness.md`, Levels; `.claude/hooks/jev.sh`.

- Jev choosing a model or an effort: levels are static.
- An unsure or failed answer acted on: it goes to the owner.

### One `reviewer` runs and reads a build, dispatched by `/ack-build`

Rule: `.claude/agents/reviewer.md`; `.claude/skills/ack-build/SKILL.md`, Review.

- Named depths: three labels for three call sites of one job.
- The session running the gates and the boot: their output lands in the context every later call re-reads.
- A run-only dispatch in the build and a read-only one in the review: two agents orient on the same diff.

### Agents read MongoDB and Redis through read-only MCP servers

Rule: `AGENTS.md`, Prisma schema; `.claude/agents/reviewer.md` and `.claude/agents/debugger.md`, `tools:`; `.claude/hooks/guard-session.sh`.

- A database or Redis shell for an agent: every write stays the owner's.
- The session reading the data itself: the check belongs to the agent that judges the change.

### `Explore` runs on haiku

Rule: `.claude/agents/Explore.md`, frontmatter.

- The built-in on the session's model: a location lookup is mechanical work, and it ran on the session's most expensive model.

### `/ack-quick` takes a small change and a symptom

Rule: `.claude/skills/ack-quick/SKILL.md`.

- A separate debug skill: after the pin, its steps are the same as a small change's.
- Jev stopping the skill on its own: on past pins it flagged more than half of the ones that touched no schema, shape, or second module.

### `researcher` reads the web, on haiku, with the web tools only

Rule: `.claude/agents/researcher.md`, frontmatter.

- The session searching itself: fetched pages stay in the context every later call re-reads.
- `Explore` given the web tools: an agent that reads untrusted pages would hold a shell.
- `Read` in its tools: beside `WebFetch`, a page's instruction could send a repository file out.
- Sonnet: a lookup extracts and cites what a page says, which the cheaper model does.

## Hooks and checks

### A hook gates every write on the rules read whole

Rule: `.claude/hooks/rules-gate.sh`, registered in `.claude/settings.json`.

- The reader runs `rules.sh` on its own word: an agent told to read each rule it prints searched the rule files for keywords and read few of them whole.
- Claude Code's path-scoped loading alone: a file read through Bash loads no rule, and a new file's rules arrive after it is written.
- A `SubagentStop` hook running the gates: `coder` runs its gates and `/ack-review` runs them again.

### A feature runs in one session, with a compaction suggested at a skill boundary

Rule: `.claude/CLAUDE.md`, Skills; `.claude/hooks/context-hint.sh`.

- A fresh session per command: the owner settles a feature in one conversation.
- A hook that blocks the command: the owner decides when a summary is safe.
- A lower automatic compaction threshold: it can fall in the middle of a skill.

### `src/` and `test/` are written through the file tools

Rule: `.claude/hooks/guard-bash.sh`.

- A Bash write allowed and gated at Stop alone: the rules gate, the write guard, and the formatter never see it.

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

### Each page holds one Diátaxis type, through the copied `documentation` skill, in its type folder

Rule: `authoring.md`, Page types; `.claude/agents/writer.md`, `skills:`.

- Pages flat in `docs/`: a later website migration would regroup every page; pages in type folders make it a move.
- A documentation website now: it is held with the monorepo feature.

### Every page opens with frontmatter, its `#` heading, a Table of Contents, and Related Documents

Rule: `authoring.md`, Frame.

- Frontmatter added at the website migration: every page is rewritten now, so the migration moves files and edits none.
- The Table of Contents dropped for one a site generator renders: no website exists, and a page read in the repository has no other outline.

### No page lists endpoints

Rule: `authoring.md`, Documentation prose.

- An endpoint table per feature page: Swagger is generated from the routes and their zod schemas, and a table beside it restates it and drifts from it.

### Production lives on one page

Rule: `authoring.md`, Documentation prose and Page types.

- Production steps beside the feature, installation, and release pages: a reader running the project locally reads hosting steps meant for a deployer, and a deployer collects them from several pages.

### Contributors are listed on a docs page

Rule: `authoring.md`, Final state only.

- The `README.md` `## Contributors` section: the README is the landing page, and a list that grows with each contribution pushes its content down.
- A root `CONTRIBUTORS.md`: it is not a file GitHub treats as a community file.
