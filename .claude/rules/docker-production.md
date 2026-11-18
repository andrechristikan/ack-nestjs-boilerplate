---
paths:
    - 'ci/**'
    - '.env.example'
    - '.github/workflows/release.yml'
---

# Docker production

The local stack, credentials, and volumes: `docker.md`. Images: `docker-image.md`.

- Every file under `ci/` is production-ready, and no file name carries `.production`. `ci/docker-compose.yml` serves each deployed environment (`development`, `staging`, `production`), one instance each: the three profiles, `apis` built from `ci/dockerfile`. A release runs `migrate` and the application itself, so a release-managed instance starts `--profile deps` alone; `--profile deps --profile apis` starts them without CI. The compose network is named `app-network` (`name: app-network`), and the release's containers join it. Run it with `-f ci/docker-compose.yml`; `--profile vault up -d vault vault-bootstrap` starts Vault alone.
- `vault-bootstrap` writes the kv-v2 mount and one read-only policy and AppRole per environment, and no secret. `pnpm vault:push <environment> <env-file>` replaces a path with an env file's keys; `pnpm vault:pull <environment> [out-file]` renders it to an env file. Neither defaults the environment.
- Vault's unseal key, root token, and AppRole credentials stay in `generated/vault/` on the host; no KMS unseal.
- `ci/docker-compose.yml` publishes only `apis` and `bullboard`, both bound to `127.0.0.1`, BullBoard behind a login; TLS ends at a proxy in front of the host: the compose files hold no bind-address variable and no proxy service. Ports are in the file.
- Connections between the compose services are unencrypted.
- The compose files ship static service credentials, a Vault profile that stays optional, and logs on stdout; short-lived credentials, a mandatory secret manager, and log shipping are the deployment's.
- `apis` runs with a read-only root, a `/tmp` tmpfs, no capability, and `no-new-privileges`, so production sets `LOGGER_FILE_ENABLED=false`; `jwks-server`, `redis-queue`, `redis-cache`, and `bullboard` run under `no-new-privileges` with every capability dropped but those their healthchecks need; `mongo` takes resource limits only. `apis` and `migrate` run as `DOCKER_APIS_UID:DOCKER_APIS_GID`, the host owner of `.env`, which stays at mode 600.
- `migrate`, the `ci/dockerfile` `migrate` stage, pushes the schema (`prisma db push`, no data-loss flag), and `apis` starts only after it completes.
- `ci/dockerfile` builds in a `builder` stage (`pnpm generate` once, then `pnpm build`, whose closing `pnpm typecheck` is the only type check) and starts from a `main` stage holding production dependencies only, as a non-root user, with the exec-form `CMD ["node", "dist/main.js"]`. It sets `ENV NODE_ENV=production`; no build argument or run flag carries `NODE_ENV`.
- A schema or dependency change ships only in a rebuilt image.
