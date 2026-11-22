---
paths:
    - '.github/workflows/**'
---

# Workflows

- `ci.yml` is the gate, on pull requests, pushes to `main`, `staging`, `development`, `workflow_call`, and `workflow_dispatch`: parallel jobs `static` (lint, deadcode, spell), `typecheck`, `build`, and, on `pull_request` only, `dependency-review` (`fail-on-severity: high`). Once all three pass, it calls `test-unit.yml` (`pnpm test:cov`) and `test-integration.yml` as reusable workflows; each also takes `workflow_dispatch` for a manual run. Every release workflow runs `ci.yml` as its first job, `uses: ./.github/workflows/ci.yml`.
- `test-integration.yml` passes as held while `test/integration/` holds no spec, and runs the suite once one exists. `audit.yml` runs `pnpm audit --prod --audit-level high` weekly and on `workflow_dispatch`.
- `release.yml` is the one release workflow beside `release-version.yml`: it deploys to one EC2 instance through SSM, and no SSH or ECS workflow or task-definition example exists. Its remote command list runs the commit's `migrate` image before it replaces the application: the schema is never left to a manual push, and no flag accepts data loss. Its remote `docker run` carries the hardening of the compose `apis` (`docker-production.md`) and runs only the commit's `sha-<short>` tag, and the job fails unless the SSM invocation ends in `Success`.
- `release.yml` resolves its environment in one `resolve` job: `main` is `production`, `staging` and `development` keep their name, and any other branch deploys nothing. Each later job declares `environment:` and reads per-environment secrets and variables under unprefixed names; no `PROD_`, `DEV_`, or `STAGING_` name.
- AWS credentials come from `aws-actions/configure-aws-credentials` with `role-to-assume` through OIDC, `id-token: write` on that job only; no stored access key.
- The version release runs from `main` only.
- A remote action's `uses:` names a 40-character commit SHA with its release tag as a trailing comment; a reusable workflow of this repository is `./.github/workflows/<file>`.
- Every workflow declares top-level `permissions:` at the least scope: `contents: read`, or the one scope a single-job workflow needs (`stale.yml`). A job that needs more grants it on that job.
- A context value reaches a `run:` script through `env:` as a quoted shell variable, never as `${{ }}` inside it, and nothing is written to `$GITHUB_ENV`. A credential (password, token, private key) reaches a command on standard input, an environment variable, or an action input, never as a command argument.
