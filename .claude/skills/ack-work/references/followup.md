# ack-work follow-up: docs and harness

Runs after every route that changed files, before the commit subject. It asks the owner whether `writer` updates `docs/` and whether `harness` updates the AI configuration; each runs only on the owner's yes.

## 1. Ask Jev

Write one paragraph that says what changed for a reader: behaviour, endpoints, guards, config keys, status codes allocated, commands, file layout. Then run:

```bash
bash .claude/hooks/jev.sh followup <<'JSON'
{"request": "<the request>", "change": "<the paragraph>", "files": ["<every changed path from git status --short>"]}
JSON
```

It prints nothing when `TYPESAFE_API_KEY` is unset or `JEV_ROUTER_DISABLED=1`, a `Jev unavailable` line when the call fails, and otherwise:

```
<jev_followup>
writer: <pages Jev judges stale, with the probability>
check: <pages Jev cannot settle>
harness: yes | no | unsettled (<probability>)
</jev_followup>
```

## 2. Decide

| Jev says | Do |
| --- | --- |
| `writer:` pages | they are in the proposed docs scope |
| `check:` pages | open each page beside the change; stale ones join the proposed docs scope |
| `harness: yes` | ask the owner with `AskUserQuestion`, the drafted requirement as the question; on yes, step 4 |
| `harness: unsettled` | judge it with the question below, then as `yes` or `no` |
| nothing, or `Jev unavailable` | decide both with the questions below; the docs question is still asked |

Once the `check:` pages are open, one `AskUserQuestion` names the proposed docs scope: the `writer:` pages and the stale `check:` pages, or the pages the docs question below found. On yes, step 3; a no goes to the hand-back. An empty scope asks nothing.

The questions, the same ones Jev answers:

- Docs: does the change alter something a `docs/*.md` page or `README.md` documents, such as an endpoint, a guard, a config key, a status code, a flow, or a command? Search `docs/` for the changed module and identifiers. A status code `coder` allocated always puts `docs/status-codes.md` in scope.
- Harness: does the change add, rename, or remove a command, a script, a file path pattern, a module layout, or a coding convention that `.claude/**` or `AGENTS.md` describes?

## 3. Docs, through `writer`

On the owner's yes, dispatch `writer` with the template in `.claude/skills/ack-doc/SKILL.md`, step 2: `Scope` the pages, `Context` the paragraph, `Diagram: none`, `Decisions:` pasted from the plan file, plus the Every dispatch block. Then run that skill's step 3 reader test and step 4 for each CONFLICT. `writer` runs on its frontmatter model.

## 4. Harness, through `harness`

On the owner's yes, dispatch `harness` with the template in `.claude/skills/ack-harness/SKILL.md`, step 2, the requirement drafted from the paragraph, every file named, `Decisions:` pasted from the plan file, and the Every dispatch block, then run that skill's step 3 verify block.

## Hand back

- The `<jev_followup>` block, or the direct decision and why.
- The proposed docs scope, the owner's answer, the pages `writer` changed, and each CONFLICT.
- The harness requirement and its result, or the owner's no.
