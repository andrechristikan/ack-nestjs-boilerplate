---
paths:
  - "docker-compose*.yml"
  - "dockerfile*"
  - "ci/**"
  - "test/helpers/test.container.helper.ts"
---

# Docker images

| Where | Tag |
|---|---|
| `docker-compose.yml`, root `dockerfile.local`, Testcontainers (`TestContainerImage` in `test/helpers/test.container.helper.ts`) | floating: `latest`, or the alpine variant where one exists |
| `ci/dockerfile`, `ci/docker-compose.yml` (production) | an exact version on every image |

- Development and test images: `mongo:latest` (no alpine variant exists), `redis:alpine`, `nginx:alpine`,
  `hashicorp/vault:latest`, `venatum/bull-board:latest`, `node:lts-alpine`.
- Node in development and test images is `node:lts-alpine`, never `node:alpine`: that tag tracks Current, which ships
  no corepack, and `dockerfile.local` runs `corepack enable`.
- LocalStack is the one pinned test image; `TestContainerImage` in `test/helpers/test.container.helper.ts` holds its
  tag, the last one that starts without an auth token.
- Mongo in Testcontainers runs through `GenericContainer` with `--replSet rs0` and an `rs.initiate()` whose member host
  is an address reachable inside the container (`localhost:27017`); clients connect with `directConnection=true`.
  `@testcontainers/mongodb` parses the image tag as a version and on `latest` falls back to the legacy `mongo` shell,
  which current Mongo images lack.
- Production Mongo runs as a single-node replica set with a keyfile (`ci/mongo/entrypoint.production.sh`); Mongo
  and Redis in `ci/docker-compose.yml` publish no host port and keep their data in named volumes.
- A version `docs/` or `README.md` records for a development image is a reference; the development files stay on
  the floating tag.
- A container a test needs copies its files in (`withCopyContentToContainer`, `withCopyFilesToContainer`), never
  bind-mounts them, so the suite runs under Docker-in-Docker.
