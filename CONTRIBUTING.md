# Contributing to ACK NestJS Boilerplate

Thank you for your interest in contributing! This document outlines the process and guidelines to contribute effectively.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

This project follows a [Code of Conduct][ref-code-of-conduct]. By participating, you agree to uphold it.

---

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
    ```bash
    git clone https://github.com/YOUR_USERNAME/ack-nestjs-boilerplate.git
    cd ack-nestjs-boilerplate
    ```
3. Add upstream remote
    ```bash
    git remote add upstream https://github.com/andrechristikan/ack-nestjs-boilerplate.git
    ```

---

## How to Contribute

- Bug fix: an issue is opened first when the bug is not already reported.
- Feature: a feature request issue is opened before work starts.
- Documentation: PRs are always welcome.
- Typo: a direct PR is fine.

**Where to start**: improve docs under `/docs`, fix a typo, or ask in [Discussions][ref-discussions] before opening an issue.

---

## Development Setup

### Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | >= 24.15.0 |
| pnpm | >= 10.25.0 (pin `pnpm@12.5.1`) |
| Docker | v28.5.x+ (recommended for local MongoDB, Redis, JWKS, BullBoard) |
| Docker Compose | v2.40.x+ |
| MongoDB | v8.0+ replica set (Compose locally, or Atlas without Docker) |
| Redis | v6.0+ (Compose locally, or a hosted Redis without Docker) |

### Steps

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Set AUTH_TWO_FACTOR_ISSUER in .env (required, empty in .env.example)
# AUTH_TWO_FACTOR_ISSUER=ACKNestJs

# Generate the JWT keys, JWKS files, and MongoDB keyfile under keys/,
# and write the JWT keys and encryption secrets into .env
pnpm generate:secret --direct-insert

# Generate the Prisma client and src/generated/package/package.ts
pnpm generate

# Start infrastructure (MongoDB + Redis + JWKS server + BullBoard)
docker-compose up -d

# Push the schema (needs the MongoDB replica set above already running)
pnpm db:migrate

# Seed the initial data, including the API keys
pnpm migration:seed

# Run in development mode
pnpm start:dev
```

For the full onboarding path (including Docker profiles and key material), see [Installation](docs/installation.md).

---

## Coding Standards

This project uses **TypeScript** with `strict`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess` on. These standards apply:

- The code follows the **SOLID principles** and the **Repository Design Pattern** already established in this codebase.
- All database interactions go through **Prisma ORM** and the repository layer.
- Every new module has the existing **modular structure** in `src/`.
- Run the linter before submitting:
    ```bash
    pnpm lint
    pnpm lint:fix
    ```
- Run the tests:
    ```bash
    pnpm test
    ```
    - It runs the unit suite under `test/unit/`.
    - The integration and e2e suites are held, so none exists: `package.json` defines no `test:integration` or `test:e2e` script, and `test/` holds `unit/` and `helpers/`.
- `any` is a lint error in `src/` (`@typescript-eslint/no-explicit-any`).
- Every public method and function carries explicit types (`explicit-function-return-type`, `explicit-module-boundary-types`).

### Strict null convention

- `undefined` is allowed only at the input boundary (request DTO body, query DTO). Every deeper layer uses `T | null`.
- These stay `?: Type`:
    - request lifecycle fields (`user?` on `IRequestApp`)
    - external spec fields (JWT claims, Prisma generated types)
    - exception options and option bags (for example `IAppBaseExceptionOptions`)
    - an additive domain-level filter param
- `variable?: string | null` is ambiguous and never appears: the input boundary uses `?: string`, and the internal layers use `string | null`.
- A response schema field uses `.optional()` when it is genuinely absent and `.nullable()` when it is present-or-null. `data?` on `ResponseDto<T>` is the optional wrapper field.
- Repository filter params use `Type | null`. The repository normalizes `null` to `{}` before Prisma, not the caller.
- A repository patch shape leaves a field unchanged when it is `null`.
- A create shape stores `null` as given.
- A literal `undefined` in our own logic (a return, a `??` fallback, a ternary branch, an arrow body) is a lint error, so the code writes `null`.
- `undefined` stays where a third party owns the contract, such as a Prisma `where` or `data` argument.
- `src/configs/` config interfaces use `field: Type | null`, and callers pass the value or `null` explicitly.
- Exception and options-bag interfaces outside `src/configs/` may use `field?: Type`.

---

## Commit Message Guidelines

This project follows [Conventional Commits][ref-conventional-commits]:

```
<type>(<scope>): <short description>
```

**Types:**

| Type       | When to use                                |
| ---------- | ------------------------------------------ |
| `feat`     | New feature                                |
| `fix`      | Bug fix                                    |
| `hotfix`   | Urgent production fix                      |
| `docs`     | Documentation changes                      |
| `refactor` | Code refactor (no feature/fix)             |
| `perf`     | Performance improvement                    |
| `style`    | Formatting only, no change in code meaning |
| `test`     | Adding or updating tests                   |
| `build`    | Build system or compiler changes           |
| `ci`       | CI/CD pipeline changes                     |
| `chore`    | Build process, dependencies                |
| `revert`   | Revert a previous commit                   |

The list above is the complete `type-enum` in `.commitlintrc`. Any other type is rejected by the `commit-msg` hook.

**Examples:**

```
feat(auth): add refresh token rotation
fix(user): resolve pagination offset issue
docs(readme): update docker setup instructions
```

---

## Pull Request Process

1. Create a branch from `development`:
    ```bash
    git fetch upstream
    git checkout -b feat/your-feature-name upstream/development
    ```
2. Make your changes
3. Ensure the husky pre-commit gates pass. The hook runs, in order:
    - `pnpm lint:staged`
    - `pnpm typecheck`
    - `pnpm deadcode`
    - `pnpm spell`
    - `NODE_ENV=test pnpm test`
4. Push the branch to your fork and open a PR against `development`.
5. Fill in the PR template so a reviewer can follow the work:
    - **Summary**, **Related Issue**, **Scope**, **How Has This Been Tested?**, **Checklist**
    - **Out of scope**, **Breaking Changes**, **Additional Notes** when they apply
6. Wait for review.
    - Merging takes at least **1 maintainer approval**.

Branches:

- Every contributor PR targets `development`.
- Maintainers merge `development` into `main` for a release.

The Checklist and the gates:

- The Checklist covers lint, typecheck, boot, seed/env, layering, secrets, status codes, and i18n.
- Tick only the rows that apply.
- Tests go under How Has This Been Tested?.
- The Husky pre-commit hook runs `lint-staged`, typecheck, deadcode, spell, and the unit tests locally.
- The Linter workflow runs `pnpm lint` on pull requests, and its trigger branches are listed in `.github/workflows/linter.yml`.
- The unit test workflow runs on manual dispatch only.
- `test-integration.yml` and `test-e2e.yml` run on manual dispatch and call `pnpm test:integration` and `pnpm test:e2e`, which `package.json` does not define, so they fail.

**PR will be rejected if:**

- Tests are failing
- Linting errors exist
- No Summary of what changed and why
- Scope / How Has This Been Tested? are empty, or describe checks that were clearly never run

---

## Reporting Bugs

Open an issue using the **Bug Report** template. Include:

- Description, steps to reproduce, expected vs actual behavior
- Environment (Node, pnpm, Mongo setup, Docker vs manual, project version or commit)
- Relevant logs, API request/response, or error identity when useful

---

## Requesting Features

Open an issue using the **Feature Request** template. Include:

- Problem you are solving
- Proposed solution
- Acceptance criteria
- Technical notes when useful (API shape, schema/seed, env keys, alternatives)

A large feature is discussed in an issue **before** any implementation starts.

---

## Questions?

Open a [Discussion][ref-discussions], not an issue.

<!-- REFERENCES -->

[ref-code-of-conduct]: ./CODE_OF_CONDUCT.md
[ref-conventional-commits]: https://www.conventionalcommits.org/
[ref-discussions]: https://github.com/andrechristikan/ack-nestjs-boilerplate/discussions
