---
paths:
  - "docker-compose*.yml"
  - "ci/**"
  - "test/helpers/test.container.helper.ts"
---

# Docker images

- `docker-compose.yml` is development: every image is `:latest` (`mongo`, `redis`, `nginx`, `hashicorp/vault`,
  `venatum/bull-board`). `ci/dockerfile.local` (the `apis` service) builds from `node:lts-alpine`.
- Node is the LTS line on alpine, never `node:alpine`: that tag tracks Current, which ships no corepack, and both
  dockerfiles run `corepack enable` so pnpm comes from `packageManager`.
- Profiles gate the `apis` (the app container) and `vault` (`vault`, `vault-bootstrap`) services. A bare
  `docker-compose up -d` starts Mongo, Redis, BullBoard, and the JWKS server; ports are in `docker-compose.yml`.
- Mongo runs as a single-node replica set, which transactions need, through `ci/mongo/entrypoint.sh`: it starts
  `mongod --replSet`, runs `rs.initiate()` once on a fresh volume with member host `host.docker.internal:27017`, so
  the host and the containers share one URI. The compose healthcheck waits for a writable primary.
- `ci/dockerfile` builds in a `builder` stage (`pnpm generate`, `pnpm build`) and runs `pnpm start:prod` from a `main`
  stage holding production dependencies only, as a non-root user.
- Testcontainers images (`TestContainerImage` in `test/helpers/test.container.helper.ts`) take a floating tag:
  `latest`, or the alpine variant where one exists.
- LocalStack is the one pinned test image; `TestContainerImage` in `test/helpers/test.container.helper.ts` holds its
  tag, the last one that starts without an auth token.
- Mongo in Testcontainers runs through `GenericContainer` with `--replSet rs0` and an `rs.initiate()` whose member host
  is an address reachable inside the container (`localhost:27017`); clients connect with `directConnection=true`.
  `@testcontainers/mongodb` parses the image tag as a version and on `latest` falls back to the legacy `mongo` shell,
  which current Mongo images lack.
- The production `ci/dockerfile` names an exact version on every base image (`node:<version>-alpine`, an LTS release).
  A version `docs/` or `README.md` records for an image is a reference; the compose file, `ci/dockerfile.local`, and
  the test containers stay on the floating tag.
- A container a test needs copies its files in (`withCopyContentToContainer`, `withCopyFilesToContainer`), never
  bind-mounts them, so the suite runs under Docker-in-Docker.
