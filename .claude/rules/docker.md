---
paths:
    - 'docker-compose*.yml'
    - 'ci/**'
    - 'dockerfile'
    - '.env.example'
---

# Docker compose

## Local

- The root `docker-compose.yml` is the local stack. Every image takes `latest` except `jwks-server` on `nginx:alpine`, because `nginx:latest` lacks the healthcheck's `wget`. The root `dockerfile` builds `apis`.
- Every service sits in one profile, the same name in both compose files, and `up` with no profile starts nothing:
    - `deps`: Mongo, `redis-queue` and `redis-cache` (host ports in the file), `bullboard`, the JWKS server.
    - `apis`: the application, `migrate` and `apis` in production; it starts only beside `deps`.
    - `vault`: `vault` and `vault-bootstrap`, in production only.
- The local stack runs no Vault and takes no container hardening.
- Both compose files run two Redis services, and no instance serves both: `redis-queue` with `noeviction`, append-only, on the `redis_queue_data` volume; `redis-cache` with `allkeys-lru` under `--maxmemory 256mb`, no persistence, no volume.
- No service sets `init: true`.
- `apis` sets `NODE_OPTIONS: --max-old-space-size=2048` and a `4G` memory limit, so `start:dev` runs `typecheck:watch` beside the SWC watcher and logs `Found 0 errors`: `tsc` here runs out of a 1 GB heap.
- `apis` bind-mounts `./src` and `./prisma`: `src/` recompiles in the container. `typecheck:watch` checks `tsconfig.build.json`, `src/` only; `test/` stays out of the image (`.dockerignore`); the host's `pnpm typecheck` covers it and `scripts/`, which the production `pnpm generate` needs. A change outside the mounts (`package.json`, the lockfile, `pnpm-workspace.yaml`, `.swcrc`, `nest-cli.json`, `tsconfig*.json`) needs `--build` (`.claude/skills/ack-build/references/boot.md`, step 3).
- `src/generated` never crosses into a container: `apis` mounts a tmpfs at `/app/src/generated` over the `./src` bind and fills it with `pnpm generate` at every start, and `.dockerignore` keeps the host copy out of both images. The host copy serves typecheck, specs, and host-run commands. After a schema edit run `pnpm db:generate`, then `docker compose --env-file .env.docker --profile deps --profile apis restart apis`.
- Inside `apis` the app reaches Mongo, Redis, and the JWKS server through `host.docker.internal`, so the owner's `.env` URLs name that host. No agent reads `.env`; a logged connection failure goes to the owner.

## Production

- Every file under `ci/` is production-ready, and no file name carries `.production`. `ci/docker-compose.yml` serves each deployed environment (`development`, `staging`, `production`), one instance each: the three profiles, `apis` built from `ci/dockerfile`. A release runs `migrate` and the application itself, so a release-managed instance starts `--profile deps` alone; `--profile deps --profile apis` starts them without CI. The compose network is named `app-network` (`name: app-network`), and the release's containers join it. Run it with `-f ci/docker-compose.yml`; `--profile vault up -d vault vault-bootstrap` starts Vault alone.
- `vault-bootstrap` writes the kv-v2 mount and one read-only policy and AppRole per environment, and no secret. `pnpm vault:push <environment> <env-file>` replaces a path with an env file's keys; `pnpm vault:pull <environment> [out-file]` renders it to an env file. Neither defaults the environment.
- Vault's unseal key, root token, and AppRole credentials stay in `generated/vault/` on the host; no KMS unseal.
- `ci/docker-compose.yml` publishes only `apis` and `bullboard`, both bound to `127.0.0.1`, BullBoard behind a login; TLS ends at a proxy in front of the host: the compose files hold no bind-address variable and no proxy service. Ports are in the file.
- Connections between the compose services are unencrypted.
- The compose files ship static service credentials, a Vault profile that stays optional, and logs on stdout; short-lived credentials, a mandatory secret manager, and log shipping are the deployment's.
- `apis` runs with a read-only root, a `/tmp` tmpfs, no capability, and `no-new-privileges`, so production sets `LOGGER_FILE_ENABLED=false`; `jwks-server`, `redis-queue`, `redis-cache`, and `bullboard` run under `no-new-privileges` with every capability dropped but those their healthchecks need; `mongo` takes resource limits only. `apis` and `migrate` run as `DOCKER_APIS_UID:DOCKER_APIS_GID`, the host owner of `.env`, which stays at mode 600.
- `migrate`, the `ci/dockerfile` `migrate` stage, pushes the schema (`prisma db push`, no data-loss flag), and `apis` starts only after it completes.
- `ci/dockerfile` builds in a `builder` stage (`pnpm generate` once, then `pnpm build`, whose closing `pnpm typecheck` is the only type check) and starts from a `main` stage holding production dependencies only, as a non-root user, with the exec-form `CMD ["node", "dist/main.js"]`: `node` is PID 1, receives `SIGTERM` directly, and runs no typecheck. It sets `ENV NODE_ENV=production`; no build argument or run flag carries `NODE_ENV`.
- A schema or dependency change ships only in a rebuilt image.
- Before the first `up` of either compose file the owner generates `keys/` and `.env` (`pnpm generate:secret`), writes `.env.docker` (production: its ten required keys), and sets `APP_HTTP_TRUSTED_PROXIES` in `.env` for production. After that `up`, the schema reaches the database (`pnpm db:migrate` locally, `migrate` in production), then the owner runs the seeds (`AGENTS.md`).

## Credentials and variables

- Auth is opt-in locally. Mongo turns on `--keyFile` and `--auth` and creates the root user only when `DOCKER_MONGO_ROOT_PASSWORD` is set; Redis, run as user `redis`, takes `--requirepass` and BullBoard authenticates to it only when `DOCKER_REDIS_PASSWORD` is set.
- With `DOCKER_MONGO_ROOT_PASSWORD` set and no application account, `DATABASE_URL` carries `<DOCKER_MONGO_ROOT_USERNAME>:<password>@` and `authSource=admin`: the root user lives in `admin`, and without it Prisma fails with `SCRAM failure: Authentication failed`. With `DOCKER_REDIS_PASSWORD` set, `REDIS_CACHE_URL` and `REDIS_QUEUE_URL` carry `redis://:<password>@`.
- Every `DOCKER_` key lives in the owner's `.env.docker`, each optional locally, which every Compose command passes as `--env-file`; the local file reads each as `${DOCKER_X:-default}`, production its ten required keys (the eight credentials, `DOCKER_APIS_UID`, `DOCKER_APIS_GID`) as `${DOCKER_X:?message}` with no default.
- With `DOCKER_MONGO_APP_USERNAME`, `DOCKER_MONGO_APP_PASSWORD`, and `DOCKER_MONGO_APP_DATABASE` set, the entrypoint creates that user with `readWrite` on that database, and the application's `DATABASE_URL` carries it with `authSource=<database>`. Production requires the three; the root account serves administration and the healthcheck.

## Volumes

- One pattern in both compose files: a long-syntax object (`type`, `target`, `source` on a bind), `read_only: true` where the container only reads; the local `apis` source binds stay writable.
- Every bind sets `bind: { create_host_path: false }`, failing the start on a missing host path, except the `generated/vault` output directory (`create_host_path: true`).
- `apis` and `migrate` mount root `.env` at `/app/.env` and no `keys/` or `logs/` path; the app loads it itself (`ConfigModule.forRoot`, `src/common/common.module.ts`).
