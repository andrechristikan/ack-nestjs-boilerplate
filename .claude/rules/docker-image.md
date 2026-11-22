---
paths:
    - 'docker-compose*.yml'
    - 'ci/**'
    - 'dockerfile'
    - '.env.example'
---

# Docker images

The compose files and services: `docker.md`, `docker-production.md`.

## Mongo

- One `ci/mongo/entrypoint.sh` serves both compose files and runs a single-node replica set; on a fresh volume it runs `rs.initiate` with member host `MONGO_REPLICA_SET_HOST`: `host.docker.internal:${DOCKER_MONGO_PORT:-27017}` locally, the variable publishing the host port, so host and containers share one URI, and `mongo:27017` in production.
- The keyfile is `keys/mongo-keyfile`, mode 400, gitignored; both compose files bind it at `/etc/mongo/keyfile`. The `mongo` service sets `HOME: /tmp`, so root-run `mongosh` keeps history out of the volume.

## Every image

- A healthcheck calling `wget` on an alpine image runs busybox `wget`, which exits 1 on an unknown flag; test it in that image first.
- A healthcheck that calls the app uses `127.0.0.1`, never `localhost`: busybox `wget` resolves `localhost` to `::1` first and the app listens on IPv4. Compose files and `HEALTHCHECK` follow it.
- Every long-running service carries a healthcheck in both compose files, BullBoard included (`wget` on its `/login` page at `127.0.0.1:3000`).
- Node is the LTS line on alpine, never `node:alpine` (tracks Current), which ships no corepack: both dockerfiles run `npm install -g corepack && corepack enable`, so pnpm comes from `packageManager`.
- The `ci/` files name an exact version on every image; Dependabot bumps them within the major (`.github/dependabot.yml`). The root `docker-compose.yml` and `dockerfile` float.
