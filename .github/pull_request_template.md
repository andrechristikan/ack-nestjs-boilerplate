## Summary
<!-- What changed and why (2–5 lines). Name the module(s). -->

## Related Issue
<!-- Closes #123, or n/a -->

## Scope

### Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Security improvement
- [ ] Documentation
- [ ] Other (describe):

### Module(s)
<!-- Comma-separated `src/modules/<name>` names, plus `common` / shared when that fits. -->
…

### Entry points
- [ ] HTTP / endpoint: …
- [ ] Queue / job: …
- [ ] CLI: …
- [ ] Other (describe):

## Out of scope
<!-- What this PR deliberately does not touch. -->
…

## How Has This Been Tested?

### Tests
- [ ] Unit test — scope: …
- [ ] Manual / other (describe): …

### How to run
<!-- Concrete steps to exercise this change locally. -->
1. …
2. …

## Checklist
<!-- Tick on submit. Skip a row when that surface is out of scope. -->
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] Boot (`pnpm start:dev`)
- [ ] Database / seed — no change, or owner commands noted: …
- [ ] Config / env — no change, or keys noted (also `.env.example`): …
- [ ] Layering and HTTP/DTO rules followed for touched modules
- [ ] No secrets in logs or response DTOs
- [ ] New or changed status codes land in the module enum and use the enum member
- [ ] New or changed i18n keys added to every language file (nested `module.error.key`)

## Breaking Changes
<!-- What breaks and which call sites / clients must update. n/a if none. -->
…

## Additional Notes
<!-- Anything else for reviewers. Omit when empty. -->
