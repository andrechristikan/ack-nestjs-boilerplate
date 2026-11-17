---
paths:
    - 'docker-compose*.yml'
    - 'ci/**'
    - 'dockerfile'
    - '.env.example'
---

# Docker images

## Development

- `docker-compose.yml` is development. Every image takes `latest` except `jwks-server` on `nginx:alpine`, because `nginx:latest` lacks the healthcheck's `wget`. The root `dockerfile` builds `apis`.
- Profiles gate `apis` and `vault` (`vault`, `vault-bootstrap`); `pnpm compose:dev` starts Mongo, Redis, BullBoard, and the JWKS server.
- No service sets `init: true`.
- `apis` sets `NODE_OPTIONS: --max-old-space-size=2048` and a `4G` memory limit, so `start:dev` runs `typecheck:watch` beside the SWC watcher and logs `Found 0 errors`: `tsc` here runs out of a 1 GB heap.
- `apis` bind-mounts `./src` and `./prisma`: `src/` recompiles in the container. `typecheck:watch` checks `tsconfig.build.json`, `src/` only; `test/` stays out of the image (`.dockerignore`); the host's `pnpm typecheck` covers it and `scripts/`, which the production `pnpm generate` needs. A change outside the mounts (`package.json`, the lockfile, `pnpm-workspace.yaml`, `.swcrc`, `nest-cli.json`, `tsconfig*.json`) needs `--build` (`.claude/skills/ack-build/references/boot.md`, step 3).
- The host generates everything `apis` runs. The `client` generator in `prisma/schema.prisma` sets `binaryTargets` (`native` plus both Alpine OpenSSL 3 targets), so the host's `pnpm generate` writes darwin and Alpine engines into `src/generated`, inside the `./src` bind. After a schema edit run `pnpm db:generate`, then `docker compose --env-file .env.docker restart apis`.
- Inside `apis` the app reaches Mongo, Redis, and the JWKS server through `host.docker.internal`, so the owner's `.env` URLs name that host. No agent reads `.env`; a logged connection failure goes to the owner.

## Production

- `ci/docker-compose.production.yml` runs the development services, `vault` and `vault-bootstrap` under the `vault` profile, with `apis` built from `ci/dockerfile.production`. Run it with `pnpm compose:prod`.
- It publishes only `apis` and `redis-bullboard`, both bound to `127.0.0.1`, BullBoard behind a login; TLS ends at a proxy in front of the host: the compose files hold no bind-address variable and no proxy service. Ports are in the file.
- Connections between the compose services are unencrypted.
- The compose files ship static service credentials, a Vault profile that stays optional, and logs on stdout; short-lived credentials, a mandatory secret manager, and log shipping are the deployment's.
- `ci/dockerfile.production` builds in a `builder` stage (`pnpm generate` once, then `pnpm build`, whose closing `pnpm typecheck` is the only type check) and starts from a `main` stage holding production dependencies only, as a non-root user, with the exec-form `CMD ["node", "--import", "./dist/instrument.js", "dist/main.js"]`: `node` is PID 1, receives `SIGTERM` directly, and runs no typecheck. It sets `ENV NODE_ENV=production`; no build argument or run flag carries `NODE_ENV`.
- A schema or dependency change ships only in a rebuilt image.
- Before the first `up` of either compose file the owner generates `keys/` and `.env` (`pnpm generate:secret`), writes `.env.docker` (production: its eight credentials), pushes the schema, and runs the seeds (`AGENTS.md`).

## Credentials and variables

- Auth is opt-in in development. Mongo turns on `--keyFile` and `--auth` and creates the root user only when `DOCKER_MONGO_ROOT_PASSWORD` is set; Redis, run as user `redis`, takes `--requirepass` and BullBoard authenticates to it only when `DOCKER_REDIS_PASSWORD` is set.
- With `DOCKER_MONGO_ROOT_PASSWORD` set and no application account, `DATABASE_URL` carries `<DOCKER_MONGO_ROOT_USERNAME>:<password>@` and `authSource=admin`: the root user lives in `admin`, and without it Prisma fails with `SCRAM failure: Authentication failed`. With `DOCKER_REDIS_PASSWORD` set, `CACHE_REDIS_URL` and `QUEUE_REDIS_URL` carry `redis://:<password>@`.
- Every `DOCKER_` key lives in the owner's `.env.docker`, each optional in development, which every Compose command passes as `--env-file` (`compose:dev`, `compose:dev:down`, `compose:prod`, and `compose:prod:down` carry it); development reads each as `${DOCKER_X:-default}`, production its eight credentials as `${DOCKER_X:?message}` with no default.
- With `DOCKER_MONGO_APP_USERNAME`, `DOCKER_MONGO_APP_PASSWORD`, and `DOCKER_MONGO_APP_DATABASE` set, the entrypoint creates that user with `readWrite` on that database, and the application's `DATABASE_URL` carries it with `authSource=<database>`. Production requires the three; the root account serves administration and the healthcheck.

## Volumes

- One pattern in both compose files: a long-syntax object (`type`, `target`, `source` on a bind), `read_only: true` where the container only reads; the development `apis` source binds stay writable.
- Every bind sets `bind: { create_host_path: false }`, failing the start on a missing host path, except the `generated/vault` output directory (`create_host_path: true`).
- `apis` mounts root `.env` at `/app/.env` and no `keys/` or `logs/` path; the app loads it itself (`ConfigModule.forRoot`, `src/common/common.module.ts`).

## Mongo

- One `ci/mongo/entrypoint.sh` serves both compose files and runs a single-node replica set, which transactions need; on a fresh volume it runs `rs.initiate` with member host `RS_HOST`: `host.docker.internal:${DOCKER_MONGO_PORT:-27017}` in development, the variable publishing the host port, so host and containers share one URI, and `mongo:27017` in production.
- The keyfile is `keys/mongo-keyfile`, mode 400, gitignored; both compose files bind it at `/etc/mongo/keyfile`. The `mongo` service sets `HOME: /tmp`, so root-run `mongosh` keeps history out of the volume.

## Every image

- A healthcheck calling `wget` on an alpine image runs busybox `wget`, which exits 1 on an unknown flag; test it in that image first.
- A healthcheck that calls the app uses `127.0.0.1`, never `localhost`: busybox `wget` resolves `localhost` to `::1` first and the app listens on IPv4. Compose files and `HEALTHCHECK` follow it.
- Every long-running service carries a healthcheck in both compose files, BullBoard included (`wget` on its `/login` page at `127.0.0.1:3000`).
- Node is the LTS line on alpine, never `node:alpine` (tracks Current), which ships no corepack: both dockerfiles run `npm install -g corepack && corepack enable`, so pnpm comes from `packageManager`.
- The production files name an exact version on every image; Dependabot bumps them within the major (`.github/dependabot.yml`). `docker-compose.yml` and the root `dockerfile` float.
