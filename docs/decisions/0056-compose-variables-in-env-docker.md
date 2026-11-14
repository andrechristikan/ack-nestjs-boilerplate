# 0056. Compose variables in `.env.docker`

- Status: accepted
- Date: 2026-11-14

## Context

The root `.env` held the application's environment and the seven `DOCKER_*` variables only Docker Compose reads, so Compose credentials reached the `apis` container and the Vault seed. The production Compose file fell back to no authentication and a known BullBoard login when a variable was empty.

## Decision

The `DOCKER_*` variables live in `.env.docker`, with no example file. Both Compose files read it through `--env-file`, carried by the `compose:dev` and `compose:prod` scripts and their `:down` pairs. The production file requires its five credentials and holds no default. This record binds both Compose files and every Compose command.

## Considered options

- `.env.docker` read with `--env-file` through complete pnpm scripts, production credentials required (chosen)
- A tracked `.env.docker.example`: rejected, every key is optional in development and the docs list them.
- One `.env` for the application and Compose: rejected, the container and Vault receive credentials the application never reads.
- `COMPOSE_ENV_FILES` in each developer's shell: rejected, the setting lives outside the repository.
- Production left on `--env-file .env`: rejected, two environments would follow two rules.
- Default credentials in production: rejected, a forgotten file starts MongoDB and Redis open.
- Compose secrets for the passwords: rejected, the same passwords stay in the application's URLs.

## Consequences

`.env` and `.env.example` hold application keys only. Starting and stopping a stack is `pnpm compose:dev`, `pnpm compose:prod`, or its `:down` pair; any other Compose command passes the flag itself (`.claude/rules/docker.md`). No agent reads or writes `.env.docker`; the production host's copy is written by hand.
