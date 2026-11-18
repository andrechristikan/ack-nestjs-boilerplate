---
paths:
    - 'docker-compose*.yml'
    - 'ci/**'
    - 'dockerfile'
    - '.env.example'
---

# Docker compose

Production: `docker-production.md`. Images: `docker-image.md`.

## Local

- The root `docker-compose.yml` is the local stack. Every image takes `latest` except `jwks-server` on `nginx:alpine`.
- Every service sits in one profile, the same name in both compose files, and `up` with no profile starts nothing:
    - `deps`: Mongo, `redis-queue` and `redis-cache` (host ports in the file), `bullboard`, the JWKS server.
    - `apis`: the application, `migrate` and `apis` in production; it starts only beside `deps`.
    - `vault`: `vault` and `vault-bootstrap`, in production only.
- The local stack runs no Vault and takes no container hardening.
- Both compose files run two Redis services, and no instance serves both: `redis-queue` with `noeviction`, append-only, on the `redis_queue_data` volume; `redis-cache` with `allkeys-lru` under `--maxmemory 256mb`, no persistence, no volume.
- No service sets `init: true`.
- `apis` sets `NODE_OPTIONS: --max-old-space-size=2048` and a `4G` memory limit, so `start:dev` runs `typecheck:watch` beside the SWC watcher and logs `Found 0 errors`.
- `apis` bind-mounts `./src` and `./prisma`: `src/` recompiles in the container. `typecheck:watch` checks `tsconfig.build.json`, `src/` only; `test/` stays out of the image (`.dockerignore`); the host's `pnpm typecheck` covers it and `scripts/`, which the production `pnpm generate` needs. A change outside the mounts (`package.json`, the lockfile, `pnpm-workspace.yaml`, `.swcrc`, `nest-cli.json`, `tsconfig*.json`) needs `--build` (`.claude/skills/ack-build/references/boot.md`, step 3).
- `src/generated` never crosses into a container: `apis` mounts a tmpfs at `/app/src/generated` over the `./src` bind and fills it with `pnpm generate` at every start, and `.dockerignore` keeps the host copy out of both images. The host copy serves typecheck, specs, and host-run commands. After a schema edit run `pnpm db:generate`, then `docker compose --env-file .env.docker --profile deps --profile apis restart apis`.
- Inside `apis` the app reaches Mongo, Redis, and the JWKS server through `host.docker.internal`, so the owner's `.env` URLs name that host. No agent reads `.env`; a logged connection failure goes to the owner.

## Credentials and variables

- Auth is opt-in locally. Mongo turns on `--keyFile` and `--auth` and creates the root user only when `DOCKER_MONGO_ROOT_PASSWORD` is set; Redis, run as user `redis`, takes `--requirepass` and BullBoard authenticates to it only when `DOCKER_REDIS_PASSWORD` is set.
- With `DOCKER_MONGO_ROOT_PASSWORD` set and no application account, `DATABASE_URL` carries `<DOCKER_MONGO_ROOT_USERNAME>:<password>@` and `authSource=admin`: the root user lives in `admin`, and without it Prisma fails with `SCRAM failure: Authentication failed`. With `DOCKER_REDIS_PASSWORD` set, `REDIS_CACHE_URL` and `REDIS_QUEUE_URL` carry `redis://:<password>@`.
- Every `DOCKER_` key lives in the owner's `.env.docker`, each optional locally, which every Compose command passes as `--env-file`; the local file reads each as `${DOCKER_X:-default}`, production its ten required keys (the eight credentials, `DOCKER_APIS_UID`, `DOCKER_APIS_GID`) as `${DOCKER_X:?message}` with no default.
- With `DOCKER_MONGO_APP_USERNAME`, `DOCKER_MONGO_APP_PASSWORD`, and `DOCKER_MONGO_APP_DATABASE` set, the entrypoint creates that user with `readWrite` on that database, and the application's `DATABASE_URL` carries it with `authSource=<database>`. Production requires the three; the root account serves administration and the healthcheck.
- Before the first `up` of either compose file the owner generates `keys/` and `.env` (`pnpm generate:secret`), writes `.env.docker` (production: its ten required keys), and sets `APP_HTTP_TRUSTED_PROXIES` in `.env` for production. After that `up`, the schema reaches the database (`pnpm db:migrate` locally, `migrate` in production), then the owner runs the seeds (`AGENTS.md`).

## Volumes

- One pattern in both compose files: a long-syntax object (`type`, `target`, `source` on a bind), `read_only: true` where the container only reads; the local `apis` source binds stay writable.
- Every bind sets `bind: { create_host_path: false }`, failing the start on a missing host path, except the `generated/vault` output directory (`create_host_path: true`).
- `apis` and `migrate` mount root `.env` at `/app/.env` and no `keys/` or `logs/` path; the app loads it itself (`ConfigModule.forRoot`, `src/common/common.module.ts`).
