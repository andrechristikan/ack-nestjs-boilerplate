# Sweep log and coverage reading

## The sweep log

`generated/docs/report-src-sweep.md` records a `src/` defect that is not repaired in the
run that found it: a flow change, a decision the owner has not made, a line no input can
reach. It is gitignored and additive.

Create the file with these five headings when it is missing:

```
## CHANGE
## STYLE
## RENAME
## DELETE
## ADD
```

A finding is one open row under the matching heading:

```
- [ ] `src/<path>:<line>` — <the fact, one sentence, no proposal>
```

Rules:

- Append only. Do not rewrite, reorder, or delete a row, including a SOLVED one.
- One row per defect; a defect spanning files names each `file:line` in the same row.
- The fact describes what the code does, not what it should do; the decision is the owner's.

End of every run, whether or not the run added a row, validate the whole file: re-read
every open row and open the `src/` it names.

| State of the defect | Mark |
|---|---|
| gone | change `[ ]` to `[x]` and append ` SOLVED` to the row |
| still there, line moved | keep `[ ]`, update the `file:line` |
| still there, unchanged | leave the row as it is |

Name every row marked SOLVED and every row still open in the hand-back.

## Coverage reading

- `pnpm test` applies no threshold: `coverage.enabled` is `false` in `vitest.config.ts`.
  Only `pnpm test:cov` collects coverage, and the 100% thresholds are global.
- A scoped `pnpm test:cov <filter>` exits 1 with every spec passing, because files outside
  the filter count as uncovered. Read the `Tests` line and the per-file rows, not the exit
  code and not the global summary.
- The per-file row has four numbers: statements, branches, functions, lines. A file is at
  100 only when all four read 100. `Uncovered Line #s` names the lines still open.
- `coverage.include` is `src/**/*.ts` minus `coverage.exclude` in `vitest.config.ts`
  (modules, enums, interfaces, constants, contracts, controllers, processors,
  repositories, docs, `src/generated`, `src/migration`, `src/router`, `src/configs`,
  `src/languages`, root `src/*.ts`). An excluded file is not a gap and gets no spec.
- Clear the Vitest cache (`pnpm exec vitest --clearCache`) before trusting a gap that a
  previous run did not show.
- Quote the totals with the exact command that produced them.
