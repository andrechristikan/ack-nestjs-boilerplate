# Deployment decisions

## Release

### The repository ships one release workflow, to one EC2 instance through SSM

Rule: `workflows.md`.

- An SSH workflow: a stored private key and registry password, and an open SSH port.
- An ECS workflow or task-definition example: every container runs on one instance, and an orchestrator is the deployment's.

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
- Vault on an instance of its own: pull and push would need a network address, TLS in front of Vault, and AppRole credentials stored on the application instance.

### The production application binds to loopback and TLS ends in front of it

Rule: `docker-production.md`.

- A bind-address variable: the compose file serves one host with a proxy in front, and a public deployment adds its own layer.
- A Caddy service in the compose file: the boilerplate knows neither the domain nor the certificate.

### The application has its own MongoDB account

Rule: `docker.md`, Credentials and variables.

- Connecting as root: a leaked `DATABASE_URL` hands out every database and every user.

### Connections inside the compose network stay unencrypted

Rule: `docker-production.md`.

- An internal certificate authority for MongoDB, Redis, and the JWKS server: the traffic never leaves the bridge network of one host.

### The encryption roots have no rotation path

Rule: `security.md`, Cryptography.

- A previous-key fallback on decrypt: keeping an earlier root alive is each deployment's choice, and the boilerplate ships no mechanism for it.

### Short-lived service credentials, a secret manager, and log shipping belong to the deployment

Rule: `docker-production.md`.

- Forcing Vault: every user of the boilerplate would have to run it.
- A log shipper in the compose file: the platform that runs the containers collects stdout.

### The deployed environments seed their users with a random password printed once

Rule: `seeding.md`, Anatomy.

- No seeded account: a fresh deployment has no admin to sign in with.
- A password read from environment keys with a forced first change: the credential still sits in the host's env file, and the seed gains a secret-bearing path.
- The literal passwords: the repository publishes them, so every deployment shares a known admin credential.

### The local stack takes no container hardening

Rule: `docker.md`, Local.

- The production hardening on the local compose file too: the local stack stays minimal so that it runs smoothly for any task.

### Vault keeps its unseal key, root token, and AppRole credentials on the host disk

Rule: `docker-production.md`.

- KMS auto-unseal: every container runs on one instance only the operator reaches, and securing that host belongs to the deployment.
