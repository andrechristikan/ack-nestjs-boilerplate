New names in this example, not in the checkout: the `isActive` country field, the inactive-country rejection, and `generated/docs/pr-country-inactive.md`.

# Example: a PR description

`writer` writes `generated/docs/pr-country-inactive.md` for the change in `.claude/skills/ack-work/references/example-plan.md`. It fills `.github/pull_request_template.md` as on disk: the same headings and checkbox labels, every HTML comment dropped, each `…` replaced. A row whose surface the change does not touch stays unticked with `none`.

```markdown
## Summary

- `country`: a country carries an `isActive` flag, `true` by default, and the country response includes it.
- `user`: these flows reject an inactive country with status code `50901` and HTTP 400:
    - sign-up
    - social sign-in on first login
    - admin user create
    - profile update
    - mobile-number add
    - mobile-number update

## Related Issue

n/a

## Scope

### Type of change

- [ ] Bug fix
- [x] New feature
- [ ] Refactor
- [ ] Security improvement
- [ ] Documentation
- [ ] Other (describe):

### Module(s)

`country`, `user`

### Entry points

- [x] HTTP / endpoint:
    - `POST /api/v1/public/user/sign-up`
    - `POST /api/v1/public/user/login/social/google`
    - `POST /api/v1/public/user/login/social/apple`
    - `POST /api/v1/admin/user/create`
    - `PUT /api/v1/shared/user/profile/update`
    - `POST /api/v1/shared/user/mobile-number/add`
    - `PUT /api/v1/shared/user/mobile-number/:mobileNumberId/update`
- [ ] Queue / job: none
- [ ] CLI: none
- [ ] Other (describe): none

## Out of scope

- A route that sets `isActive`.
- Filtering the public country list: it returns every country.
- Admin user import: it resolves a country by alpha-2 code with no active check.

## How Has This Been Tested?

### Tests

- [x] Unit test (scope): the `country` and `user` specs, including the inactive-country rejection and the response schema.
- [ ] Manual / other (describe): none

### How to run

1. Run `pnpm db:generate`, then `pnpm db:migrate` to add `isActive` to the `Countries` collection.
2. Run `pnpm test test/unit/modules/country test/unit/modules/user`.
3. Run `pnpm start:dev`, set one country's `isActive` to `false` in `pnpm db:studio`, and call `POST /api/v1/public/user/sign-up` with its id: the answer is 400 with status code `50901`.

## Checklist

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] Boot (`pnpm start:dev`)
- [x] Database / seed: no change, or owner commands noted: `pnpm db:migrate` adds `isActive`; the country seed is unchanged.
- [x] Config / env: no change, or keys noted (also `.env.example`): no change.
- [x] Layering and HTTP/DTO rules followed for touched modules
- [x] No secrets in logs or response DTOs
- [x] New or changed status codes land in the module enum and use the enum member
- [x] New or changed i18n keys added to every language file (nested `module.error.key`)

## Breaking Changes

n/a: the country response gains one field, and every country is active by default.

## Additional Notes

`50901` is the `inactive` member of the `country` block; no number is allocated.
```
