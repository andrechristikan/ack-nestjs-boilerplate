# Deployment decisions

## Release

### The repository ships one release workflow, to one EC2 instance through SSM

Rule: `workflows.md`.

- An SSH workflow: a stored private key and registry password, and an open SSH port.
- An ECS workflow or task-definition example: an orchestrator is the deployment's.

### A release applies the schema with `prisma db push` before it replaces the application

Rule: `workflows.md`; `docker-production.md`.

- A manual push by the owner: a release that needs an index ships without it.
- `--accept-data-loss`: a destructive change needs a person.

### Workflows deploy through GitHub environments and OIDC

Rule: `workflows.md`.

- Repository secrets with a per-environment prefix: every dispatch reaches every environment's secrets, and no approval gate exists.
- Stored AWS access keys: they outlive the job that uses them.

### A release carries a CycloneDX SBOM

Rule: `layering.md`, The run surface is a call site.

- The lockfile as the only inventory: it holds the same facts in no standard format an audit tool reads.

## Compose and production

### `jwks-server` runs on `nginx:alpine`

Rule: `docker.md`, Local.

- `nginx:latest`: it lacks the `wget` the healthcheck runs.

### The local `apis` container runs with a 2 GB heap under a `4G` limit

Rule: `docker.md`, Local.

- A 1 GB heap: `tsc` runs out of it beside the SWC watcher.

### The production image starts `node` with an exec-form `CMD`

Rule: `docker-production.md`.

- A shell-form `CMD` or a package script as the start: with the exec form `node` is PID 1, receives `SIGTERM` directly, and runs no typecheck.

### CI and the local stack run the Node LTS line, the `ci/` image pins an exact version

Rule: `docker-image.md`, Every image; `workflows.md`.

- CI pinned to the `ci/` image's version: a break on the next LTS surfaces only when the image moves to it.
- The `ci/` image on `node:lts-alpine`: a rebuild changes the runtime with no reviewed change.

### Compose variables live in `.env.docker`

Rule: `docker.md`, Credentials and variables.

- A tracked `.env.docker.example`: every key is optional locally and the docs list them.
- One `.env` for the application and Compose: the container and Vault receive credentials the application never reads.
- `COMPOSE_ENV_FILES` in each developer's shell: the setting lives outside the repository.
- Production left on `--env-file .env`: two environments would follow two rules.
- Default credentials in production: a forgotten file starts MongoDB and Redis open.
- Compose secrets for the passwords: the same passwords stay in the application's URLs.

### Vault ships in the production compose file only

Rule: `docker.md`, Local; `docker-production.md`.

- Vault in the local stack: a local run reads its env file directly, and a local Vault holds only example values.
- Seeding a path from `.env.example`: a deployed Vault would serve placeholder values as secrets.
- A default environment on the pull: a run with no argument would render another environment's secrets on the instance.
- A `.production` segment in a `ci/` file name: the folder already says it.
- Vault as a network service every application host reaches: pull and push would need its network address, a TLS listener or a TLS proxy in front, and AppRole credentials stored on each application host, and the boilerplate would own the certificates, the unsealing (auto-unseal, the `aws` auth method), and the storage backups (integrated storage with snapshots) each deployment runs its own way; pull and push stay helpers on the Vault host.

### The production application binds to loopback and TLS ends in front of it

Rule: `docker-production.md`.

- A bind-address variable: the compose file serves one host with a proxy in front, and a public deployment adds its own layer.
- A Caddy service in the compose file: the boilerplate knows neither the domain nor the certificate.

### The application has its own MongoDB account

Rule: `docker.md`, Credentials and variables.

- Connecting as root: a leaked `DATABASE_URL` hands out every database and every user.

### Each Redis instance takes its own password

Rule: `docker.md`, Credentials and variables.

- One password shared by both instances: a leaked `REDIS_CACHE_URL` would also open the queue instance and every job on it.

### Connections inside the compose network stay unencrypted

Rule: `docker-production.md`.

- An internal certificate authority for MongoDB, Redis, and the JWKS server: the compose network stays on one host, and a connection between hosts takes TLS through its URL, its certificates the deployment's.

### The encryption roots have no rotation path

Rule: `security.md`, Cryptography.

- A previous-key fallback on decrypt: keeping an earlier root alive is each deployment's choice, and the boilerplate ships no mechanism for it.

### Short-lived service credentials, a secret manager, log shipping, and log rotation belong to the deployment

Rule: `docker-production.md`.

- Forcing Vault: every user of the boilerplate would have to run it.
- A log shipper in the compose file: the platform that runs the containers collects stdout.
- A `json-file` log cap in the compose files and the release's `docker run`: the host's Docker daemon sets the log driver and its rotation for every container it runs, so one host setting covers the compose services and the release's container alike.

### The deployed environments seed their users with a random password printed once

Rule: `seeding.md`, Anatomy.

- No seeded account: a fresh deployment has no admin to sign in with.
- A password read from environment keys with a forced first change: the credential still sits in the host's env file, and the seed gains a secret-bearing path.
- The literal passwords: the repository publishes them, so every deployment shares a known admin credential.

### The local stack takes no container hardening

Rule: `docker.md`, Local.

- The production hardening on the local compose file too: the local stack stays minimal so that it runs smoothly for any task.

### The application runs as several interchangeable instances

Rule: `discipline.md`, Hard rules; `AGENTS.md`, Stack.

- One instance assumed: process memory or local disk would hold state a second instance misses, and scaling out would need a code change.

### Vault keeps its unseal key, root token, and AppRole credentials on the host disk

Rule: `docker-production.md`.

- KMS auto-unseal: securing the hosts that run Vault belongs to the deployment.
