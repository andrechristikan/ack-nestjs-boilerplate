---
paths:
  - "docker-compose*.yml"
  - "ci/**"
  - "dockerfile"
  - ".env.example"
  - "test/helpers/test.container.helper.ts"
---

# Docker images

## Development

- `docker-compose.yml` is development. Every image takes `latest` except `jwks-server` on `nginx:alpine`, because
  `nginx:latest` ships no `wget` for its healthcheck. The root `dockerfile` builds `apis`.
- Profiles gate `apis` (the app container) and `vault` (`vault`, `vault-bootstrap`); a bare `docker-compose up -d`
  starts Mongo, Redis, BullBoard, and the JWKS server. Ports are in `docker-compose.yml`.

## Production

- `ci/docker-compose.production.yml` runs the development services, `vault` and `vault-bootstrap` under the `vault`
  profile, with `apis` built from `ci/dockerfile.production`. Run it from the repository root:
  `docker compose --env-file .env -f ci/docker-compose.production.yml up -d`.
- It publishes only `apis` and `redis-bullboard`, the latter bound to `127.0.0.1` behind a login; ports are in the file.
- `ci/dockerfile.production` builds in a `builder` stage (`pnpm generate`, `pnpm build`) and runs `pnpm start:prod`
  from a `main` stage holding production dependencies only, as a non-root user.
- Before the first `up` of either compose file the owner generates `keys/` and `.env` (`pnpm generate:secret` covers
  JWT, encryption, Mongo keyfile; `scripts/generate-secret.ts`), pushes the schema, and runs the seeds (`AGENTS.md`).

## Credentials and variables

- Auth is opt-in in both compose files. Mongo turns on `--keyFile` and `--auth` and creates the root user only when
  `DOCKER_MONGO_ROOT_PASSWORD` is set; Redis, run as user `redis`, takes `--requirepass` and BullBoard authenticates
  to it only when `DOCKER_REDIS_PASSWORD` is set; unset, each starts plain. BullBoard's own login falls back to the
  compose defaults.
- Every `DOCKER_` key is empty in `.env.example` and holds its value in the owner's `.env`; each compose file reads it
  as `${DOCKER_X:-default}` (names and defaults there), so production without `--env-file` takes the fallbacks. Any
  other key follows `config.md`.

## Volumes

- One pattern in both compose files: a long-syntax object (`type`, `source`, `target`), `read_only: true` where the
  container only reads; the development `apis` binds of `./src` and `./prisma` stay writable.
- Every bind sets `bind: { create_host_path: false }`, failing the start on a missing host path, except the
  `generated/vault` output directory (`create_host_path: true`).
- `apis` mounts the root `.env` at `/app/.env`; the app loads it itself (`src/common/common.module.ts:45`).

## Mongo

- One `ci/mongo/entrypoint.sh` serves both compose files and runs a single-node replica set, which transactions need;
  on a fresh volume it runs `rs.initiate` with member host `RS_HOST`: `host.docker.internal:27017` by default in
  development, so the host and the containers share one URI, and `mongo:27017` in production.
- The script runs as root: it hands data not owned by `mongodb` to `mongodb` and starts `mongod` as `mongodb`
  through the image's `gosu`. On `TERM` it waits for `mongod` to exit, so shutdown is clean.
- With the password set, a keyfile path that is a directory exits 1; a mounted keyfile is copied to a `mongodb`-owned
  path, `--keyFile` and `--auth` added, and the root user created over the localhost exception when none exists.
- The keyfile is `keys/mongo-keyfile`, mode 400, gitignored with `keys/`; both compose files bind it at
  `/etc/mongo/keyfile`. The `mongo` service sets `HOME: /tmp`, so root-run `mongosh` keeps history out of the volume.

## Every image

- A healthcheck calling `wget` on an alpine image runs busybox `wget`, which exits 1 on a flag it does not accept;
  test the command in that image before writing it.
- A healthcheck that calls the app uses `127.0.0.1`, never `localhost`: busybox `wget` resolves `localhost` to `::1`
  first and the app listens on IPv4. This holds in both compose files and the `ci/dockerfile.production` `HEALTHCHECK`.
- Node is the LTS line on alpine, never `node:alpine`: that tag tracks Current, which ships no corepack, and both
  dockerfiles run `corepack enable` so pnpm comes from `packageManager`.
- The production files name an exact version on every image; Dependabot bumps them within the major
  (`.github/dependabot.yml`). `docker-compose.yml`, the root `dockerfile`, and the test containers float.

## Test containers

- Testcontainers images (`TestContainerImage` in `test/helpers/test.container.helper.ts`) take a floating tag,
  `latest` or the alpine variant where one exists; LocalStack is the one pinned image, on the last tag that starts
  without an auth token.
- Mongo in Testcontainers runs through `GenericContainer` with `--replSet rs0`, an `rs.initiate()` on member host
  `localhost:27017`, and clients on `directConnection=true`. `@testcontainers/mongodb` parses the tag as a version
  and on `latest` falls back to the legacy `mongo` shell, which current Mongo images lack.
- A container a test needs copies its files in (`withCopyContentToContainer`, `withCopyFilesToContainer`), never
  bind-mounts them, so the suite runs under Docker-in-Docker.
