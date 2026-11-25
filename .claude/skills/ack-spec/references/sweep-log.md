# Sweep log and coverage reading

## The sweep log

`generated/report-src-sweep.md` records a `src/` defect the run that found it cannot fix within its boundaries: one that needs a design, an owner-only command, or held work, and that no plan or spec covers. In `/ack-spec`, whose `tester` changes no behavior, that is every defect it finds and a line no input can reach without changing `src/`. It is gitignored and holds open defects only.

Create the file with this header and these two headings when it is missing:

```
# src sweep: open items

Append a new finding as an open row; delete a row once its defect is fixed. No SOLVED marker.

## Open
## Held
```

A finding is one open row under a `## <source> (<date>)` heading of its run, between `## Open` and `## Held`:

```
- [ ] `<path>:<line>`: <the fact, one sentence, no proposal>
```

Rules:

- Append a new finding; delete a row once its defect is fixed. No SOLVED marker, no `[x]`. Do not reorder or reword an open row; its one edit is a moved `file:line` (table below).
- One row per defect; a defect spanning files names each `file:line` in the same row.
- The fact describes what the code does, not what it should do; the decision is the owner's.

End of every run, whether or not the run added a row, validate the whole file: re-read every open row and open the file it names.

| State of the defect     | Action                             |
| ----------------------- | ---------------------------------- |
| gone                    | delete the row                     |
| still there, line moved | keep `[ ]`, update the `file:line` |
| still there, unchanged  | leave the row as it is             |

Name every row deleted and every row still open in the hand-back.

## Coverage reading

- Thresholds, the exit code of a scoped run, and what coverage excludes: `.claude/rules/testing.md`, Layout and runs.
- The per-file row has four numbers: statements, branches, functions, lines. A file is at 100 only when all four read 100. `Uncovered Line #s` names the lines still open.
- Clear the Vitest cache (`pnpm exec vitest --clearCache`) before trusting a gap that a previous run did not show.
- Quote the totals with the exact command that produced them.
