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

- Fix a bug → open an issue first if it's not already reported
- Add a feature → open a feature request issue before starting work
- Improve documentation → PRs are always welcome
- Found a typo? → direct PR is fine

**Not sure where to start?** Look for issues labeled [`good first issue`][ref-good-first-issue].

---

## Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 24.11.0 |
| pnpm | >= 10.25.0 |
| Docker | Latest stable |
| MongoDB | Replication set (required for transactions) |
| Redis | Latest stable |

### Steps

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start infrastructure (MongoDB + Redis)
docker-compose up -d

# Run in development mode
pnpm start:dev
```

---

## Coding Standards

This project uses **TypeScript** with strict mode. Please follow these standards:

- Follow **SOLID principles** and **Repository Design Pattern** already established in this codebase
- Use **Prisma ORM** for all database interactions — do not bypass the repository layer
- All new modules must follow the existing **modular structure** in `src/`
- Run linter before submitting:
  ```bash
  pnpm lint
  pnpm lint:fix
  ```
- Run tests:
  ```bash
  pnpm test
  ```
- No `any` types unless absolutely unavoidable — justify it in a comment
- All public methods/functions should have proper TypeScript typings
- **Strict null convention** — `undefined` is only allowed at the input boundary (Request DTO body/form, Query DTO); all other layers use `T | null`. Exceptions: request lifecycle fields (`__user?`, `__apiKey?`), external spec fields (JWT claims, Prisma generated types), exception/options interfaces (e.g. `IAppException`), response DTO structural/wrapper fields (e.g. `data?` on `ResponseDto<T>`), and service/util additive filter params
- Never use `variable?: string | null` — ambiguous; use `?: string` for input boundary or `string | null` for internal layers
- Response DTO **domain data fields** must use `field: Type | null`, not `field?: Type`. Only structural/wrapper fields (e.g. `data?`, `errors?` on response wrappers) may use `?:`
- Repository filter params use `Type | null` — normalization `null → {}` is done inside the repository before Prisma, not at the caller
- `src/configs/` config interfaces use `field: Type | null` — callers must be explicit. Exception/options bag interfaces outside `src/configs/` may use `field?: Type`

---

## Commit Message Guidelines

This project follows [Conventional Commits][ref-conventional-commits]:

```
<type>(<scope>): <short description>
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `hotfix` | Urgent production fix |
| `doc` | Documentation changes |
| `refactor` | Code refactor (no feature/fix) |
| `test` | Adding or updating tests |
| `ci` | CI/CD pipeline changes |
| `chore` | Build process, dependencies |
| `revert` | Revert a previous commit |

**Examples:**
```
feat(auth): add refresh token rotation
fix(user): resolve pagination offset issue
doc(readme): update docker setup instructions
```

---

## Pull Request Process

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes
3. Ensure all tests pass and linting is clean
4. Push and open a PR against `main`
5. Fill in the PR template completely
6. Wait for review — at least **1 maintainer approval** is required to merge

**PR will be rejected if:**
- Tests are failing
- Linting errors exist
- No description of what/why changes were made
- Breaking changes without prior discussion in an issue

---

## Reporting Bugs

Open an issue using the **Bug Report** template. Include:

- NestJS and Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or error messages

---

## Requesting Features

Open an issue using the **Feature Request** template. Include:

- Problem you're solving
- Proposed solution
- Alternatives considered

Large features should be discussed in an issue **before** any implementation starts.

---

## Questions?

Open a [Discussion][ref-discussions] — not an issue.

<!-- REFERENCES -->

[ref-code-of-conduct]: ./CODE_OF_CONDUCT.md
[ref-good-first-issue]: https://github.com/andrechristikan/ack-nestjs-boilerplate/labels/good%20first%20issue
[ref-conventional-commits]: https://www.conventionalcommits.org/
[ref-discussions]: https://github.com/andrechristikan/ack-nestjs-boilerplate/discussions