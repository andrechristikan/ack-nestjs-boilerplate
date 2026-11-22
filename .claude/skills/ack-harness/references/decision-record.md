# A decision

Policy: `.claude/rules/authoring.md`, Decisions.

1. Write the rule sentence first, in the rule that owns the concept: the chosen option, and each rejected option as a prohibition (`a write conflict is never retried`).
2. Every rejected option keeps its reason in an entry. A consequence that binds code is a rule sentence, never an entry line.
3. Pick the file whose scope the choice shares from `.claude/decisions/README.md` and read the entries under its `##` heading; rewrite the one for this choice when it exists, else add one, a sentence per rejected option:

```markdown
### <title, naming the chosen option>

Rule: `<rule>.md`, <section>.

- <rejected option>: <why, one sentence>
- <rejected option>: <why>
```

4. A new file or `##` heading takes its line in `README.md`.
5. Take each reason from a source the owner names. An entry carries no number, status, date, context, or consequence, and repeats nothing the rule states.
6. A decision the owner reverses: change the rule, and rewrite or delete the entry. No superseded entry stays.
