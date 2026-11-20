# Harness decisions

## Decision records

### Decisions are reasons only, one file per scope

Rule: `authoring.md`, Decisions.

- Numbered records with a status, a date, a context, and consequences: a record and a rule would state the same thing twice.
- A decision index imported into `AGENTS.md`: it loads in every session, where the rules already carry each decision that binds code.
- Two grouped files, architecture and security: one file holds unrelated scopes, and a reader of one scope loads every other.

## Review and agents

### `/ack-review` dispatches one `reviewer` at opus, high

Rule: `.claude/CLAUDE.md`, Levels.

- Effort medium: the reviewer is the only judge of a build and may miss no rule.

### Agents read MongoDB and Redis through read-only MCP servers

Rule: `AGENTS.md`, Prisma schema; `.claude/agents/reviewer.md` and `.claude/agents/debugger.md`, `tools:`.

- A database or Redis shell for an agent: every write stays the owner's.

## Hooks and checks

### A hook gates every write on the rules read whole

Rule: `.claude/hooks/rules-gate.sh`, registered in `.claude/settings.json`.

- The reader runs `rules.sh` on its own word: an agent told to read each rule it prints searched the rule files for keywords and read few of them whole.
- Claude Code's path-scoped loading alone: a file read through Bash loads no rule, and a new file's rules arrive after it is written.
- A `SubagentStop` hook running the gates: `coder` runs its gates and `/ack-review` runs them again.

### A generated file is no check

Rule: `discipline.md`, Checks.

- A Swagger operation count or `paths` diff as proof that a change is behaviour-neutral: the file is rewritten at every boot, so checking it proves nothing.
