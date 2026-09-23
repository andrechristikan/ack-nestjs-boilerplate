# Evals

One case per workflow skill, run by hand after a harness change. No CI job.

```
.claude/evals/
├── README.md
├── ack-code-pinned-repair/     prompt.md · graders/skill-used.md · graders/pinned-repair.md
├── ack-spec-coverage-gap/      prompt.md · graders/skill-used.md · graders/coverage-gap.md
├── ack-doc-stale-doc/          prompt.md · graders/skill-used.md · graders/stale-doc.md
├── ack-pr-description/         prompt.md · graders/skill-used.md · graders/description.md
└── ack-harness-rule-change/    prompt.md · graders/skill-used.md · graders/rule-change.md
```

Each `prompt.md` is a realistic owner prompt with `name`, `tags`, `runs`, `max_turns`, and
`allowed_tools` in its frontmatter. `graders/skill-used.md` is a `tool_used: Skill` grader
that passes when the skill fired; the second grader is an `llm` rubric stating the
acceptance criterion as PASS and FAIL conditions.

## Run

From the repository root:

```bash
claude plugin eval . --eval-dir .claude/evals --runs 1 --ablation none
claude plugin eval . --eval-dir .claude/evals --case ack-code-pinned-repair --runs 1 --ablation none
```

Verify the target argument on first run: `claude plugin eval` loads a plugin directory
(one with `plugin.json` or `.claude-plugin/plugin.json`) or a skills-directory plugin, and
this repository is neither by default. If `.` is refused, point the target at the form
that loads `.claude/skills/` and record the working command here.

Each run starts in an empty workspace and loads nothing from the project's `.claude/`
beyond the plugin under test. A case therefore proves that the skill fires on natural
phrasing and that the reply has the expected shape; it does not exercise `src/`. Tools
beyond `Read`, `Glob`, `Grep`, and `Skill` need `--allow-tools`. Results land in
`.claude/evals/results/` unless `--output-dir` moves them.
