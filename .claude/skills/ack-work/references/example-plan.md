New names in this example, not in the checkout: the plan file, `Country.isActive`, `CountryInactiveException`, `country.inactive.exception.ts` and its spec, and the `country.error.inactive` key.

# Example: a `feature` plan file

`planner` writes `.superpowers/plans/2026-11-05-country-inactive.md` in this shape: the gate fields in `gate.md` order, then one `- [ ]` task each. A schema change makes it a `feature`. Each `Rules to read:` block is the output of `bash .claude/hooks/rules.sh` over that task's Files.

````markdown
# Country inactive flag

**Requirement:** `Country` gains `isActive`, `true` by default. `CountryDomain.getOne` throws `CountryInactiveException` for a country whose `isActive` is `false`, so every flow resolving a country by id through it rejects an inactive one: public sign-up, social sign-in first login, admin user create, shared profile update, shared mobile-number add and update. `CountryResponseSchema` carries `isActive`. Out of scope: a route that sets `isActive`; filtering the public country list; `CountryDomain.getIdByAlpha2Code` (admin import).

**Decisions:**

- Reuse `EnumCountryStatusCodeError.inactive` (50901) with HTTP 400.
- The public country list keeps returning every country.
- Admin import resolves by alpha-2 code with no active check.

**Files:**

- Write: `prisma/schema.prisma`, `src/modules/country/dtos/response/country.response.dto.ts`, `src/modules/country/domains/country.domain.ts`, `src/languages/en/country.json`.
- Create: `src/modules/country/exceptions/country.inactive.exception.ts`, `test/unit/modules/country/exceptions/country.inactive.exception.spec.ts`.
- Write, the `Country` fixtures: `test/unit/modules/country/domains/country.domain.spec.ts`, `test/unit/modules/country/services/http/country.http.service.spec.ts`, `test/unit/modules/country/dtos/response/country.response.dto.spec.ts`, and under `test/unit/modules/user/`: `domains/user.domain.spec.ts`, `domains/user.mobile-number.domain.spec.ts`, `domains/user.profile.domain.spec.ts`, `dtos/response/user.mobile-number.response.dto.spec.ts`, `dtos/response/user.profile.response.dto.spec.ts`, `services/http/user.auth.http.service.spec.ts`, `services/http/user.http.service.spec.ts`, `services/http/user.mobile-number.http.service.spec.ts`, `services/http/user.profile.http.service.spec.ts`, `services/http/user.registration.http.service.spec.ts`.
- Leave alone: `src/modules/country/enums/country.status-code.enum.ts` (the member exists), `src/modules/country/dtos/request/country.request.dto.ts` (picks `name`, `continent`, `timezone`), `src/migration/seeds/migration.country.seed.ts` (the column default fills `isActive`).

**Names:**

- Prisma field: `isActive Boolean @default(true)` on `Country`.
- Response field: `isActive: z.boolean()` in `CountryResponseSchema`, described `Whether a user may pick the country`.
- Exception: `CountryInactiveException`; `statusCode` `EnumCountryStatusCodeError.inactive`; `httpStatus` `HttpStatus.BAD_REQUEST`; message path `country.error.inactive`.
- Message: `error.inactive` in `src/languages/en/country.json`: `Country is not available.`

**Agents:** `explorer` (`assess`) opus, high; `planner` sonnet, medium; `coder` sonnet, medium; `reviewer` sonnet, high; `writer` sonnet, medium.

**Review depth:** rules and boot

## Tasks

- [ ] Task 1: `isActive` on the model, the response schema, and every `Country` fixture
    - Files: `prisma/schema.prisma`, `src/modules/country/dtos/response/country.response.dto.ts`, the three country specs and the ten user specs under Files.
    - Rules to read:
        ```
        .claude/rules/code-style.md
        .claude/rules/concurrency.md
        .claude/rules/cross-module.md
        .claude/rules/database.md
        .claude/rules/discipline.md
        .claude/rules/dto.md
        .claude/rules/enum.md
        .claude/rules/layering.md
        .claude/rules/naming.md
        .claude/rules/null-safety.md
        .claude/rules/service.md
        .claude/rules/testing.md
        ```
    - Procedure: none; the schema edit follows `.claude/rules/database.md`.
    - Acceptance:
        - `pnpm db:generate` exit 0.
        - `pnpm typecheck` exit 0.
        - `pnpm test test/unit/modules/country test/unit/modules/user` green, `country.response.dto.spec.ts` asserting `isActive`.
- [ ] Task 2: `CountryInactiveException` from `CountryDomain.getOne`
    - Files: `src/modules/country/exceptions/country.inactive.exception.ts`, `test/unit/modules/country/exceptions/country.inactive.exception.spec.ts`, `src/modules/country/domains/country.domain.ts`, `test/unit/modules/country/domains/country.domain.spec.ts`, `src/languages/en/country.json`.
    - Rules to read:
        ```
        .claude/rules/code-style.md
        .claude/rules/concurrency.md
        .claude/rules/cross-module.md
        .claude/rules/database.md
        .claude/rules/discipline.md
        .claude/rules/exceptions.md
        .claude/rules/i18n.md
        .claude/rules/layering.md
        .claude/rules/naming.md
        .claude/rules/null-safety.md
        .claude/rules/testing.md
        ```
    - Procedure: `.claude/skills/ack-work/references/add-status-code.md`, steps 2 and 3: reuse `inactive`, create the exception from `src/modules/country/exceptions/country.not-found.exception.ts`, add the key.
    - Acceptance:
        - `pnpm typecheck` exit 0.
        - `pnpm test test/unit/modules/country` green, naming `country.inactive.exception.spec.ts` and the `getOne` inactive case.
        - `grep -rn 'inactive' src/modules/country/ src/languages/` lists the enum member, the exception, and `en/country.json`.
````
