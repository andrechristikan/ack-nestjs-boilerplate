---
name: ack-spec
description: Backfill, repair, or relocate meaningful Vitest unit specs for existing code in one named scope. Uses coverage to find unprotected contracts and moves the suite toward ratcheted 100% coverage without changing production behavior. NOT for new behavior or bug fixes, whose implementer owns TDD.
disable-model-invocation: true
---

Specs only. `src/` is not yours and not the agent's, for any reason (HARD).

## Which workflow is this?

Use this workflow when existing production behavior needs missing unit coverage, a spec is stale,
or a structural refactor left a spec misplaced.

- A new behavior or production bug fix belongs to `/ack-feature` or `/ack-fix`; the implementer
  writes the failing spec before the code.
- A spec that no longer represents the intended contract belongs here.
- A failure that reveals wrong production behavior is reported and handed to `/ack-fix`. Do not
  weaken the existing contract or create a characterization test for an obvious accident.

## 1 - Establish the scope

Name the module, source subjects, or failing specs. Read `vitest.config.mts`,
`.claude/rules/testing.md`, `.claude/rules/testing-spec-style.md`, the matching project docs, and
the source contracts before judging the suite.

Run the smallest current suite first:

```bash
pnpm test test/modules/<feature>
```

Vitest treats a positional argument as a filename substring filter. Pass the test directory or
full spec path so unrelated files are not loaded.

When the request is coverage backfill, collect a scoped baseline that includes the relevant
source even when a file is never imported:

```bash
pnpm test test/modules/<feature> --coverage \
  --coverage.include='src/modules/<feature>/{services,guards,utils}/**/*.ts'
```

Select the include glob from the layer policy in `rules/testing.md`. Do not include controllers,
repositories, declarations, or other excluded surfaces to manufacture work.

## 2 - Select contracts

Use uncovered lines and branches as navigation, then read the code and rank the missing
behavior by risk. Start with security, authorization, state transitions, validation,
serialization, error mapping, external-I/O orchestration, and queue dispatch.

The target for a pass is a named set of meaningful contracts, not a raw percentage. The
long-term goal remains 100% branches, functions, lines, and statements, reached incrementally
by ratcheting established thresholds. Do not plan duplicate permutations, private-method tests,
framework behavior tests, or assertions on incidental implementation details.

## 3 - Dispatch

Dispatch `test-writer` with the exact source and test scope, the reason for the pass, the
contracts selected in step 2, and the baseline command/result. For relocation-only work, say
`RELOCATE ONLY` and forbid new cases.

The dispatch also carries any known disagreement among code, docs, and existing specs. The
agent reports the conflict rather than deciding that production code or a stale spec wins by
default.

## 4 - Verify

Re-run the narrow spec, then the module. Re-run the same scoped coverage command when coverage
informed the work. Read the per-file branches as well as the four headline dimensions and
confirm that every new case would fail if its claimed behavior were broken.

Run the repository checks after the scoped work is green:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm spell
```

A change to `test/vitest.setup.ts` or another shared test helper requires the full suite even
before the final checks because it affects every spec.

## Completion standard

- Every selected contract has a focused assertion through the public surface.
- No unit spec opens a database, Redis connection, queue worker, filesystem resource, or
  network connection.
- No `.only`, unjustified `.skip`, or placeholder `.todo` remains.
- Coverage does not regress in the named scope. Any remaining material uncovered branch is
  identified with its risk and reason.
- `src/`, `docs/`, `prisma/`, `vitest.config.mts`, and shared setup remain unchanged unless the
  owner explicitly opened a separate configuration task.
- The scoped suite and repository checks are green, or every failure is reported exactly.

## Boundaries

- Never change production behavior.
- Never lower thresholds, narrow configured coverage collection, or add coverage-ignore
  comments.
- Never call private methods or expose them for coverage.
- Never delete or weaken a meaningful failing spec to reach green.
- No gate, flow review, or application boot. This workflow changes unit specs only.
- Never stage or commit unless the owner asks in that exchange.

## Hand back

Specs changed; contracts protected; scoped and full commands with results; coverage dimensions
when collected; remaining material gaps; every production defect or contract conflict, each
with `file:line`.

## Next

| Then run   | When                                                                              |
| ---------- | --------------------------------------------------------------------------------- |
| `/ack-fix` | A failing meaningful spec or backfill analysis exposes wrong production behavior. |
