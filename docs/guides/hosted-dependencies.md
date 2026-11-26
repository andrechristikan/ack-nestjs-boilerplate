---
title: Hosted Dependencies Guide
description: Run the application on the host against a hosted MongoDB replica set and hosted Redis instances, with the JWKS files served from your own static host.
---

# Hosted Dependencies Guide

This guide shows how to run the application locally without Docker, against hosted services, for a developer who knows the local stack and cannot run Compose.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Installation][ref-doc-installation]: the Docker path, the alternative to this guide
- [Dependencies][ref-doc-dependencies]: what the application needs from MongoDB and Redis
- [Configuration Reference][ref-doc-reference-configuration]: every variable `.env` takes
- [Production][ref-doc-production]: hosted dependencies on a deployed host

## Prerequisites

- Node.js 26.13.x+, pnpm 12.5.x+, and Git.
- A MongoDB replica set on version 8.0.x+, such as a [MongoDB Atlas][ref-mongodb] cluster. Transactions need a replica set, and a single node without one breaks them.
- Two Redis 6.2.x+ instances, one for the cache and one for the queue, such as [Amazon ElastiCache][ref-elasticache]. The local Compose file runs the cache with `allkeys-lru`, no persistence, and a 256 MB cap, and the queue with `noeviction` and append-only persistence.
- A static host that serves two JSON files over HTTPS, such as an S3 bucket behind a CDN.
- The repository cloned and `pnpm install` run.

## Steps

1. Generate the Prisma client and the package fields:

    ```bash
    pnpm generate
    ```

2. Create `.env` and write the keys into it. The script creates `.env` from `.env.example` when it is missing:

    ```bash
    pnpm generate:secret --direct-insert
    ```

3. Set the eviction policy of each Redis instance in its configuration or parameter group:
    - Queue instance: the `noeviction` policy, because the instance holds BullMQ jobs that must never be evicted. Keep persistence on.
    - Cache instance: an evicting policy such as `allkeys-lru`, because the cache drops keys when it is full.
4. Set the connection values in `.env`. Each URL carries its credentials, and a special character in a password is percent-encoded:
    - `DATABASE_URL`: the connection string of the replica set. A server that requires authentication takes `<user>:<password>@` before the host and `authSource=<database where the user lives>` in the query. An Atlas string starts with `mongodb+srv://`.
    - `REDIS_CACHE_URL`: `redis://:<password>@<cache host>:<port>/0`, with `rediss://` for TLS.
    - `REDIS_QUEUE_URL`: `redis://:<password>@<queue host>:<port>/0`, with `rediss://` for TLS.
5. Publish the JWKS files. Upload `keys/access-jwks.json` and `keys/refresh-jwks.json` to the static host, then point `.env` at them. The `kid` of each file equals the matching `AUTH_JWT_ACCESS_TOKEN_KID` or `AUTH_JWT_REFRESH_TOKEN_KID` that step 2 wrote, and the API verifies tokens against these URIs:

    ```bash
    AUTH_JWT_ACCESS_TOKEN_JWKS_URI=https://<your host>/.well-known/access-jwks.json
    AUTH_JWT_REFRESH_TOKEN_JWKS_URI=https://<your host>/.well-known/refresh-jwks.json
    ```

6. Push the schema, build the seeds, and seed the database:

    ```bash
    pnpm db:migrate
    pnpm migration:build
    pnpm migration:seed
    ```

7. Start the API on the host:

    ```bash
    pnpm start:dev
    ```

## Check the result

- The log shows the application listening, and no `FATAL [Bootstrap]` line. A MongoDB or Redis that is unreachable stops the boot with that line and exit code 1.
- `http://localhost:3000/api/public/hello` answers 200 with the date, the application name, and a message.
- `http://localhost:3000/docs` serves Swagger.
- The database health check answers 200 once MongoDB, the cache Redis, and the queue are reachable. It needs a system API key: [Health checks][ref-doc-dependencies-health].
- The third-party health check reports both JWKS endpoints `up` once the two files answer `GET` with a `keys` array. It needs the same system API key.

## Related tasks

- [Run the local Docker stack][ref-doc-installation]: the tutorial that is the alternative to this guide.
- [Deploy against existing dependencies][ref-doc-production-path-1]: the same services on a deployed host.

<!-- REFERENCES -->

[ref-mongodb]: https://www.mongodb.com/products/platform/atlas-database
[ref-elasticache]: https://aws.amazon.com/elasticache/
[ref-doc-installation]: ../getting-started/installation.md
[ref-doc-dependencies]: ../concepts/dependencies.md
[ref-doc-dependencies-health]: ../concepts/dependencies.md#health-checks
[ref-doc-reference-configuration]: ../reference/configuration.md
[ref-doc-production]: ../production.md
[ref-doc-production-path-1]: ../production.md#path-1-existing-dependencies
