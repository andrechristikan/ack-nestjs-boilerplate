## Description
<!-- What does this PR do? Why is it needed? -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Performance improvement
- [ ] Documentation
- [ ] CI/CD
- [ ] Other (describe):

## Related Issue
<!-- Link the issue this PR resolves, e.g: Closes #123 -->

## Affected Modules
<!-- Which modules does this PR touch? e.g. auth, user, session, device -->

## How Has This Been Tested?
<!-- Describe how you tested your changes -->
- [ ] Manual testing
- [ ] Unit test
- [ ] Integration test
- [ ] E2E test

## Checklist

### General
- [ ] I have read [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] Code follows the existing architecture and patterns
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm spell` passes
- [ ] `pnpm deadcode` passes
- [ ] No `any` types introduced (`noImplicitAny: true`)
- [ ] Null values handled properly (`strictNullChecks: true`)
- [ ] No breaking changes (or documented below)

### Architecture (if applicable)
- [ ] Services implement an interface (`IXxxService`)
- [ ] Repositories inject `DatabaseService` directly (no `@Inject`)
- [ ] Services inject repository as class (not `DatabaseService`)
- [ ] Path aliases used — no relative imports (`../`, `./`)
- [ ] DTOs use `RequestDto` / `ResponseDto` suffix
- [ ] Enums use `Enum` prefix with PascalCase, camelCase keys

### Security (if applicable)
- [ ] Decorator order follows project convention (Doc → TermPolicy → Policy → Role → ActivityLog → User → JWT → FeatureFlag → ApiKey → HttpCode → Method)
- [ ] Sessions invalidated on security-sensitive operations (password change/reset, logout, device removal)
- [ ] Rate limiting applied on sensitive endpoints (`@Throttle()`)
- [ ] No sensitive data logged (password, token, apiKey, secret)
- [ ] Input validated via class-validator DTOs

### Database (if applicable)
- [ ] Prisma schema changes: ran `pnpm db:generate`
- [ ] Callback transaction used for conditional logic (not array syntax)
- [ ] Seed data updated if new model added

### i18n (if applicable)
- [ ] New messages added to `src/languages/en/*.json` with nested structure
- [ ] Error messages use i18n key format (`module.error.key`)

## Breaking Changes
<!-- If any, describe what breaks and how to migrate -->

## Screenshots / API Response
<!-- If UI or API response changed, show before/after -->

## Additional Notes
<!-- Anything else the reviewer should know -->
