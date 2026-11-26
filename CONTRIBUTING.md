# Contributing to ACK NestJS Boilerplate

This document describes how to contribute: the workflow, the setup, the coding standards, the commit rules, and the pull request process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Development Tooling](#development-tooling)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Questions](#questions)

## Code of Conduct

This project follows a [Code of Conduct][ref-code-of-conduct]. By participating, you agree to uphold it.

## Getting Started

1. Fork the repository
2. Clone your fork locally
    ```bash
    git clone https://github.com/YOUR_USERNAME/ack-nestjs-boilerplate.git
    cd ack-nestjs-boilerplate
    ```
3. Add the upstream remote
    ```bash
    git remote add upstream https://github.com/andrechristikan/ack-nestjs-boilerplate.git
    ```

## How to Contribute

- Bug fix: an issue is opened first when the bug is not already reported.
- Feature: a feature request issue is opened before work starts.
- Documentation: PRs are always welcome.
- Typo: a direct PR is fine.

Where to start: improve the pages under `docs/`, fix a typo, or ask in [Discussions][ref-discussions] before opening an issue.

## Development Setup

- The step-by-step setup, from clone to a running API, is the [Installation][ref-doc-installation] tutorial.
- Every script and Compose command is in the [Commands Reference][ref-doc-commands].
- The tools are Node.js 26.13.x+ and pnpm 12.5.x+ (`engines` in `package.json`), plus Docker 28.5.x+ with Compose 2.40.x+ for the local MongoDB, Redis, JWKS server, and BullBoard.

## Development Tooling

Checks:

- `pnpm lint` runs ESLint with `--max-warnings 0`, and `pnpm lint:fix` applies the fixable rules.
- `pnpm format` runs Prettier, `pnpm typecheck` runs `tsc --noEmit`, `pnpm deadcode` runs knip, and `pnpm spell` runs cspell.
- `pnpm lint:docs` runs markdownlint, remark with link validation, and Vale over `docs/`, the root markdown files, and `.github/`.
- `pnpm test` runs the unit specs, and `pnpm test:cov` adds the coverage thresholds.
- `pnpm package:check` and `pnpm package:upgrade` drive `npm-check-updates`, and `pnpm clean` removes `dist` and `node_modules` before a fresh install.

ESLint (`eslint.config.mjs`):

- A flat configuration with the typescript-eslint recommended rules, `eslint-plugin-security` with every recommended rule at `error` but `detect-object-injection`, and `eslint-plugin-boundaries`, which enforces the layer matrix of [Architecture][ref-doc-architecture].
- Inline directive comments are refused (`noInlineConfig`), and so are inline comments.
- `any`, a missing explicit return type, a missing explicit module boundary type, `.forEach`, a literal `undefined` as a return value, and a relative import (use a path alias) are errors.
- `new Date()` is refused in favor of `HelperDateService`, and `process.env` in favor of `ConfigService`. Only `src/configs/`, `src/bootstrap.ts`, and `src/instrument.ts` read `process.env`.
- A naming convention applies to every identifier kind: an `I` prefix on interfaces, an `Enum` prefix on enums, and PascalCase types.
- `test/` carries its own restrictions: no `fn.mock.*` access, no class declaration, and no `@ts-expect-error`, `@ts-ignore`, or `@ts-nocheck`.

Vitest (`vitest.config.ts`):

- One project, `unit`, runs `test/unit/**/*.spec.ts`. The specs mirror `src/` and double each collaborator. `test/helpers/test.logger.helper.ts` is the setup file.
- SWC compiles the specs, and the `tsconfig.json` path aliases resolve. The settings are `isolate: true`, `maxWorkers: 4`, `restoreMocks`, `mockReset`, and a 5000 ms `testTimeout`.
- Coverage is v8 over `src/**/*.ts` with a 100% threshold on branches, functions, lines, and statements. It runs only with `--coverage`.
- Coverage excludes modules, enums, interfaces, constants, contracts, controllers, processors, repositories, `src/generated`, `src/migration`, `src/router`, `src/configs`, `src/languages`, and the root files in `src/`.
- The integration suite is held: `package.json` defines no script for it and `test/` holds `unit/` and `helpers/` only.

TypeScript (`tsconfig.json`):

- It runs `strict` with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`, targets native ESM (`module` and `moduleResolution` `nodenext`, `verbatimModuleSyntax`, `isolatedModules`), and defines the path aliases.
- `pnpm typecheck`, knip, Vitest, and the editor read it.
- `tsconfig.build.json` extends it, narrows `include` to `src/**/*`, and excludes `test` and `scripts`. `nest build` reads it.

Other files:

- `knip.json` lists `src/main.ts`, `src/migration.ts`, `src/instrument.ts`, and `scripts/*.ts` as entries and sets every rule to `error`.
- `.npmrc` sets `engine-strict = true`, so the `engines` versions are enforced on install.
- `pnpm-workspace.yaml` lists the packages allowed to run install scripts (`allowBuilds`) and the packages exempt from the minimum release-age hold (`minimumReleaseAgeExclude`).
- `cspell.json`, `.prettierrc`, `.commitlintrc`, `.swcrc`, and `nest-cli.json` configure the tools their names give.

## Coding Standards

This project uses TypeScript with `strict`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess` on. These standards apply:

- The code follows the SOLID principles and the Repository Design Pattern already established in this codebase.
- All database interactions go through Prisma ORM and the repository layer.
- Every new module has the existing modular structure in `src/`: [Architecture][ref-doc-architecture].
- Run the checks CI runs before submitting. Run them first, then fix what they report:
    ```bash
    pnpm lint
    pnpm typecheck
    pnpm test:cov
    pnpm deadcode
    pnpm spell
    pnpm lint:docs
    pnpm build
    ```
    - `pnpm test:cov` runs the unit suite under `test/unit/` with the coverage thresholds.
    - `pnpm lint:fix` applies the fixable lint rules, and `pnpm format` formats the code.
- Claude Code and GitHub Copilot get these standards from the harness in `.claude/`: [AI Harness Documentation][ref-doc-ai-harness].

### Strict null convention

- `undefined` is allowed only at the input boundary (request DTO body, query DTO). Every deeper layer uses `T | null`.
- These stay `?: Type`:
    - request lifecycle fields (`user?` on `IRequestApp`)
    - external spec fields (JWT claims, Prisma generated types)
    - exception options and option bags (for example `IAppBaseExceptionOptions`)
    - an additive service-level filter param
- `variable?: string | null` is ambiguous and never appears: the input boundary uses `?: string`, and the internal layers use `string | null`.
- A response schema field uses `.optional()` when it is genuinely absent and `.nullable()` when it is present-or-null. `data?` on `ResponseDto<T>` is the optional wrapper field.
- Repository filter params use `Type | null`. The repository normalizes `null` to `{}` before Prisma, not the caller.
- An update is a full replace, with no unchanged state for a field:
    - The update request DTO requires every editable field, and a nullable column takes `null` to clear it.
    - The `I<Module>Update` shape declares `field: Type` for a required column and `field: Type | null` for a nullable one.
    - The repository writes the values as given.
- A create shape stores `null` as given.
- A literal `undefined` in our own logic (a return, a `??` fallback, a ternary branch, an arrow body) is a lint error, so the code writes `null`.
- `undefined` stays where a third party owns the contract, such as a Prisma `where` or `data` argument.
- `src/configs/` config interfaces use `field: Type | null`, and callers pass the value or `null` explicitly.
- Exception and options-bag interfaces outside `src/configs/` may use `field?: Type`.

## Commit Message Guidelines

This project follows [Conventional Commits][ref-conventional-commits]:

```text
<type>(<scope>): <short description>
```

Types:

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

Examples:

```text
feat(auth): add refresh token rotation
fix(user): resolve pagination offset issue
docs(readme): update docker setup instructions
```

## Pull Request Process

1. Create a branch from `development`:
    ```bash
    git fetch upstream
    git checkout -b feat/your-feature-name upstream/development
    ```
2. Make your changes
3. Commit with a conventional message, and check that the husky hooks pass:
    ```bash
    git add <files>
    git commit -m "feat(scope): short description"
    ```
    - `pre-commit` runs `pnpm lint:staged`, then `pnpm typecheck`. `lint-staged` formats and lints staged TypeScript, runs `stop-only` and the related unit specs, formats staged JSON, YAML, and markdown, and runs markdownlint, remark, and Vale on staged documentation.
    - `commit-msg` runs commitlint against `.commitlintrc`.
4. Push the branch to your fork:
    ```bash
    git push origin feat/your-feature-name
    ```
5. Open a PR against `development`.
6. Fill in the PR template so a reviewer can follow the work:
    - Summary, Related Issue, Scope, How Has This Been Tested?, Checklist
    - Out of scope, Breaking Changes, Additional Notes when they apply
7. Wait for review.
    - Merging takes at least 1 maintainer approval.

Branches:

- Every contributor PR targets `development`.
- Maintainers merge `development` into `main` for a release.

The Checklist and the gates:

- The Checklist covers lint, typecheck, boot, seed and env, layering, secrets, status codes, and i18n.
- Tick only the rows that apply.
- Tests go under How Has This Been Tested?.
- The CI workflow (`.github/workflows/ci.yml`) runs lint, deadcode, spell, docs lint, typecheck, and the build on pull requests to `main`, `staging`, and `development`, and a dependency review on pull requests.
- Once those pass, CI calls `test-unit.yml` (the unit suite with coverage) and `test-integration.yml`, which passes while `test/integration/` holds no spec.

A PR is rejected if:

- Tests are failing
- Linting errors exist
- There is no Summary of what changed and why
- Scope or How Has This Been Tested? are empty, or describe checks that were never run

## Reporting Bugs

Open an issue using the Bug Report template. Include:

- Description, steps to reproduce, expected vs actual behavior
- Environment (Node, pnpm, Mongo setup, Docker vs manual, project version or commit)
- Relevant logs, API request/response, or error identity when useful

## Requesting Features

Open an issue using the Feature Request template. Include:

- Problem you are solving
- Proposed solution
- Acceptance criteria
- Technical notes when useful (API shape, schema/seed, env keys, alternatives)

A large feature is discussed in an issue before any implementation starts.

## Questions

Open a [Discussion][ref-discussions], not an issue.

<!-- REFERENCES -->

[ref-code-of-conduct]: ./CODE_OF_CONDUCT.md
[ref-conventional-commits]: https://www.conventionalcommits.org/
[ref-discussions]: https://github.com/andrechristikan/ack-nestjs-boilerplate/discussions
[ref-doc-ai-harness]: docs/concepts/ai-harness.md
[ref-doc-installation]: docs/getting-started/installation.md
[ref-doc-commands]: docs/reference/commands.md
[ref-doc-architecture]: docs/concepts/architecture.md
