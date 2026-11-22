---
paths:
    - 'docker-compose*.yml'
    - 'ci/**'
    - 'dockerfile'
    - '.env.example'
---

# Docker images

The compose files and services: `docker.md`, `docker-production.md`.

## PostgreSQL

- Both compose files run the stock `postgres:18` image with no entrypoint script and no keyfile; the data lives on the `postgres_data` volume at `/var/lib/postgresql`, and the healthcheck is `pg_isready`.

## Every image

- A healthcheck calling `wget` on an alpine image runs busybox `wget`, which exits 1 on an unknown flag; test it in that image first.
- A healthcheck that calls the app uses `127.0.0.1`, never `localhost`: busybox `wget` resolves `localhost` to `::1` first and the app listens on IPv4. Compose files and `HEALTHCHECK` follow it.
- Every long-running service carries a healthcheck in both compose files, BullBoard included (`wget` on its `/login` page at `127.0.0.1:3000`).
- Node is the LTS line on alpine, never `node:alpine` (tracks Current), which ships no corepack: both dockerfiles run `npm install -g corepack && corepack enable`, so pnpm comes from `packageManager`.
- The `ci/` files name an exact version on every image; Dependabot bumps them within the major (`.github/dependabot.yml`). The root `docker-compose.yml` and `dockerfile` float.
