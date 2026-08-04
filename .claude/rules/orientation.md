# Orientation — prefer `graphify query` (HARD)

When the need is **find a file, find code, map a flow, or orient in unfamiliar
surface**, prefer:

```bash
graphify query "<question>"
```

before broad `Grep` / `Glob` / `find` / opening every candidate file. `graphify-out/`
exists in this repo — use it. Invoke the `graphify` skill when the query needs
unfamiliar orientation or the graph looks stale for the surface in hand.

## Prefer graphify for

- "Where does X live?" / "What calls Y?" / "Which docs cover Z?"
- Mapping an HTTP / queue / CLI flow end to end
- Locating a moved or renamed class before treating a path as gone
- Finding related modules, guards, filters, or registration sites
- Surfacing which `docs/*.md` belong to the work before reading the whole tree

## Grep / Glob / find stay correct for

- A path already known (SCOPE block, plan path, exact file the owner named)
- Verifying one concrete identifier after graphify (or a doc claim) pointed here
- Mechanical inventory with a fixed pattern (`find src -name '*.status-code.enum.ts'`,
  `ls src/modules/<feature>/`)
- Diff and git commands that name the surface (`git diff -- <scoped-path>`)

## Pattern

1. Ask the graph: `graphify query "<question>"`
2. Open the paths it returns
3. Use targeted `Grep` / `Read` only to confirm or finish the hop

Do not skip step 1 because Grep feels faster. Broad search first burns context and
misses cross-file edges the graph already holds.
