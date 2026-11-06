---
paths:
    - 'docker-compose*.yml'
    - 'ci/**'
    - 'dockerfile'
    - '.env.example'
    - 'test/helpers/test.container.helper.ts'
---

# Docker images

## Development

- `docker-compose.yml` is development. Every image takes `latest` except `jwks-server` on `nginx:alpine`, because `nginx:latest` lacks the healthcheck's `wget`. The root `dockerfile` builds `apis`.
- Profiles gate `apis` and `vault` (`vault`, `vault-bootstrap`); a bare `docker-compose up -d` starts Mongo, Redis, BullBoard, and the JWKS server.
- No service sets `init: true`.
- `apis` sets `NODE_OPTIONS: --max-old-space-size=2048` and a `4G` memory limit, so `start:dev` runs `typecheck:watch` beside the SWC watcher and logs `Found 0 errors`: `tsc` here runs out of a 1 GB heap.
- `apis` bind-mounts `./src` and `./prisma`: `src/` recompiles in the container. `typecheck:watch` checks `tsconfig.build.json`, `src/` only; `test/` stays out of the image (`.dockerignore`); the host's `pnpm typecheck` covers it and `scripts/`, which the production `pnpm generate` needs. A change outside the mounts (`package.json`, the lockfile, `pnpm-workspace.yaml`, `.swcrc`, `nest-cli.json`, `tsconfig*.json`) needs `--build` (Boot, step 3).
- The host generates everything `apis` runs. The `client` generator in `prisma/schema.prisma` sets `binaryTargets` (`native` plus both Alpine OpenSSL 3 targets), so the host's `pnpm generate` writes darwin and Alpine engines into `src/generated`, inside the `./src` bind. After a schema edit run `pnpm db:generate`, then `docker-compose restart apis`.
- Inside `apis` the app reaches Mongo, Redis, and the JWKS server through `host.docker.internal`, so the owner's `.env` URLs name that host. No agent reads `.env`; a logged connection failure goes to the owner.

## Boot

Every agent boot runs the app in the `apis` container, never on the host. Each step is its own Bash call:

1. `docker ps --format '{{.Names}} {{.Ports}}'` lists the running compose services (`mongo`, `redis`, `jwks-server`, `redis-bullboard`, `apis`). A failing `docker ps` means an unreachable daemon: NOT RUN, output quoted.
2. Port: when `ack-nestjs-boilerplate-apis-1` runs, `<port>` is the host port it publishes. Otherwise run `lsof -nP -iTCP:3000 -sTCP:LISTEN`: empty, `<port>` is 3000; held, take a free OS port: `node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})'`.
3. `date -u +%Y-%m-%dT%H:%M:%SZ; DOCKER_APIS_PORT=<port> docker-compose --profile apis up -d --force-recreate apis; echo "exit=$?"`, adding `--build` only when a file outside the mounts changed (Development). The printed time is `<start>`. Compose builds a missing image and starts missing dependencies, so the `apis` log holds this boot's `App Name:`. A nonzero exit is a failed boot; quote its output.
4. Proof: `timeout 60 sh -c 'until docker-compose logs --since <start> apis | grep -q "App Name:"; do sleep 2; done'; echo "exit=$?"; docker-compose logs --since <start> apis | grep -n 'App Name:'`. Quote the `App Name:` block from `src/main.ts`. Exit 124 is a failed boot; quote that log's decisive lines.
5. A route call curls `http://localhost:<port>/<route>`.

The containers stay up for the next boot; a boot never runs `docker-compose down`. The proof does not wait on `typecheck:watch`: run `pnpm typecheck` beside the boot.

## Production

- `ci/docker-compose.production.yml` runs the development services, `vault` and `vault-bootstrap` under the `vault` profile, with `apis` built from `ci/dockerfile.production`. Run it from the root: `docker compose --env-file .env -f ci/docker-compose.production.yml up -d`.
- It publishes only `apis` and `redis-bullboard`, the latter bound to `127.0.0.1` behind a login; ports are in the file.
- `ci/dockerfile.production` builds in a `builder` stage (`pnpm generate` once, then `pnpm build`, whose closing `pnpm typecheck` is the only type check) and starts from a `main` stage holding production dependencies only, as a non-root user, with the exec-form `CMD ["node", "--import", "./dist/instrument.js", "dist/main.js"]`: `node` is PID 1, receives `SIGTERM` directly, and runs no typecheck.
- A schema or dependency change ships only in a rebuilt image.
- Before the first `up` of either compose file the owner generates `keys/` and `.env` (`pnpm generate:secret`, `scripts/generate-secret.ts`), pushes the schema, and runs the seeds (`AGENTS.md`).

## Credentials and variables

- Auth is opt-in in both compose files. Mongo turns on `--keyFile` and `--auth` and creates the root user only when `DOCKER_MONGO_ROOT_PASSWORD` is set; Redis, run as user `redis`, takes `--requirepass` and BullBoard authenticates to it only when `DOCKER_REDIS_PASSWORD` is set. BullBoard's own login falls back to the compose defaults.
- With `DOCKER_MONGO_ROOT_PASSWORD` set, `DATABASE_URL` carries `<DOCKER_MONGO_ROOT_USERNAME>:<password>@` and `authSource=admin`: the root user lives in `admin`, and without it Prisma fails with `SCRAM failure: Authentication failed`. With `DOCKER_REDIS_PASSWORD` set, `CACHE_REDIS_URL` and `QUEUE_REDIS_URL` carry `redis://:<password>@`. `.env.example` shows both variants commented.
- Every `DOCKER_` key is empty in `.env.example`, set in the owner's `.env`; each compose file reads it as `${DOCKER_X:-default}`, so production without `--env-file` takes the fallbacks. Any other key follows `config.md`.

## Volumes

- One pattern in both compose files: a long-syntax object (`type`, `target`, `source` on a bind), `read_only: true` where the container only reads; the development `apis` source binds stay writable.
- Every bind sets `bind: { create_host_path: false }`, failing the start on a missing host path, except the `generated/vault` output directory (`create_host_path: true`).
- `apis` mounts the root `.env` at `/app/.env`; the app loads it itself (`src/common/common.module.ts:45`).

## Mongo

- One `ci/mongo/entrypoint.sh` serves both compose files and runs a single-node replica set, which transactions need; on a fresh volume it runs `rs.initiate` with member host `RS_HOST`: `host.docker.internal:${DOCKER_MONGO_PORT:-27017}` in development, the variable publishing the host port, so host and containers share one URI, and `mongo:27017` in production.
- The script runs as root: it hands data not owned by `mongodb` to `mongodb` and starts `mongod` as `mongodb` through the image's `gosu`. On `TERM` it waits for `mongod` to exit.
- With the password set, a keyfile path that is a directory exits 1; a mounted keyfile is copied to a `mongodb`-owned path, `--keyFile` and `--auth` added, and the root user created over the localhost exception when none exists.
- The keyfile is `keys/mongo-keyfile`, mode 400, gitignored; both compose files bind it at `/etc/mongo/keyfile`. The `mongo` service sets `HOME: /tmp`, so root-run `mongosh` keeps history out of the volume.

## Every image

- A healthcheck calling `wget` on an alpine image runs busybox `wget`, which exits 1 on an unknown flag; test it in that image first.
- A healthcheck that calls the app uses `127.0.0.1`, never `localhost`: busybox `wget` resolves `localhost` to `::1` first and the app listens on IPv4. Compose files and `HEALTHCHECK` follow it.
- Every long-running service carries a healthcheck in both compose files, BullBoard included (`wget` on its `/login` page at `127.0.0.1:3000`).
- Node is the LTS line on alpine, never `node:alpine` (tracks Current), which ships no corepack: both dockerfiles run `npm install -g corepack && corepack enable`, so pnpm comes from `packageManager`.
- The production files name an exact version on every image; Dependabot bumps them within the major (`.github/dependabot.yml`). `docker-compose.yml`, the root `dockerfile`, and the test containers float.

## Test containers

Integration and e2e are held (`testing.md`): `test.container.helper.ts` does not exist. The planned shape:

- Testcontainers images (`TestContainerImage` in `test/helpers/test.container.helper.ts`) take a floating tag, `latest` or the alpine variant where one exists; LocalStack is the one pinned image, on the last tag that starts without an auth token.
- Mongo in Testcontainers runs through `GenericContainer` with `--replSet rs0`, an `rs.initiate()` on member host `localhost:27017`, and clients on `directConnection=true`. `@testcontainers/mongodb` parses the tag as a version and on `latest` falls back to the legacy `mongo` shell, which current Mongo images lack.
- A container a test needs copies its files in (`withCopyContentToContainer`, `withCopyFilesToContainer`), never bind-mounts them, so the suite runs under Docker-in-Docker.
