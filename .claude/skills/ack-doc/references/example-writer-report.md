New names in this example, not in the checkout: `Country.isActive`, `CountryInactiveException`, `country.error.inactive`, the `Country availability` section, and the `pnpm migration:country` script (PHANTOM, absent by definition); the PHANTOM, CONTRADICTS, and CONFLICT doc lines are written for this example, so their line numbers stay `<line>`.

# Example: a writer report

`writer` hands this back to step 2 of `SKILL.md` after a run over `docs/reference/status-codes.md`, `docs/reference/database.md`, and `docs/concepts/api-key.md`, with `Context: Country gained isActive; CountryInactiveException throws 50901`. The six classes are the ones `.claude/agents/writer.md`, Docs, defines. Commit hashes in the CONFLICT evidence depend on the history, so they stay in angle brackets.

```markdown
## Findings by class

- ACCURATE: `docs/reference/database.md:<line>`: `Country` maps to the `Countries` collection (`prisma/schema.prisma:<line>`).
- STALE: `docs/reference/status-codes.md:<line>`: `inactive` `50901` read "Reserved enum member; no exception or i18n path."; repaired to 400 (`BAD_REQUEST`), `country.error.inactive`, "Country is not available." (`CountryInactiveException`).
- MISSING: `docs/reference/database.md`: no page said which requests reject a country whose `isActive` is `false`; added the `Country availability` section after the model table.
- PHANTOM: `docs/reference/database.md:<line>`: named a `pnpm migration:country` script that `package.json` `scripts` lacks; removed, and the line now points at `pnpm migration {module} --type seed`.
- CONTRADICTS: `docs/reference/database.md:<line>`: the example shape declared `isActive?: boolean | null`, which `.claude/rules/null-safety.md` (rule 2) forbids; repaired to `isActive: boolean`.
- CONFLICT: `docs/concepts/api-key.md:<line>` says the public country list answers without an API key; `src/modules/country/controllers/country.public.controller.ts:<line>` carries `@ApiKeyProtected()`. Left unresolved.

## Files changed

- `docs/reference/status-codes.md`
- `docs/reference/database.md`

## Rule files read

`.claude/rules/authoring.md`, `.claude/rules/cross-module.md`, `.claude/rules/discipline.md`, `.claude/rules/layering.md`, `.claude/rules/naming.md`, `.claude/rules/null-safety.md`.

## `pnpm lint:docs`

Exit 0. No line names `docs/reference/status-codes.md` or `docs/reference/database.md`; Vale ends `✖ 0 errors, <n> warnings and 0 suggestions in <n> files.`

## `pnpm spell`

Exit 0. No output.

## CONFLICT evidence

- Code side: `git log -S'ApiKeyProtected' --oneline -- src/modules/country/controllers/country.public.controller.ts` prints `<sha> <subject>`, the commit that put the guard on the route.
- Doc side: `git log -S'without an API key' --oneline -- docs/concepts/api-key.md` prints `<sha> <subject>`, older than the code commit.
- A disagreement about authorization: the owner decides which side is wrong.

## Humanizer spans touched

- `docs/reference/database.md`, `Country availability`: two sentences reworded.
- `docs/reference/status-codes.md:<line>`: none.

## Reader questions, `docs/reference/database.md`, `Country availability`

1. Which field marks a country inactive?
2. What value does a seeded country get?
3. Which requests reject an inactive country?
4. Which status code and HTTP status does the rejection carry?
5. Does the public country list hide an inactive country?
6. Does the admin user import check the field?

## Noticed outside the scope

- `docs/concepts/pagination.md:<line>`: the cursor token is described as AES-256-GCM over the last row's sort values and a query fingerprint; outside this scope, unchecked.
```

Step 3 of `SKILL.md` sends the six reader questions to a fresh reader with `docs/reference/database.md` alone; step 4 puts the CONFLICT to the owner.
