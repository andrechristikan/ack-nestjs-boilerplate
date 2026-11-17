# Boot the app

Every agent boot runs the app in the `apis` container, never on the host. Each step is its own Bash call:

1. `docker ps --format '{{.Names}} {{.Ports}}'` lists the running compose services (`mongo`, `redis`, `jwks-server`, `redis-bullboard`, `apis`). A failing `docker ps` means an unreachable daemon: NOT RUN, output quoted.
2. Port: when `ack-nestjs-boilerplate-apis-1` runs, `<port>` is the host port it publishes. Otherwise run `lsof -nP -iTCP:3000 -sTCP:LISTEN`: empty, `<port>` is 3000; held, take a free OS port: `node -e 'const s=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})'`.
3. `date -u +%Y-%m-%dT%H:%M:%SZ; DOCKER_APIS_PORT=<port> docker compose --env-file .env.docker --profile apis up -d --force-recreate apis; echo "exit=$?"`, adding `--build` only when a file outside the mounts changed (`.claude/rules/docker.md`, Local). The printed time is `<start>`. Compose builds a missing image and starts missing dependencies, so the `apis` log holds this boot's `App Name:`. A nonzero exit is a failed boot; quote its output.
4. Proof: `timeout 120 sh -c 'until docker compose --env-file .env.docker logs --since <start> apis | grep -q "App Name:"; do sleep 2; done'; echo "exit=$?"; docker compose --env-file .env.docker logs --since <start> apis | grep -n 'App Name:'`. Quote the `App Name:` block from `src/main.ts`. Exit 124 is a failed boot; quote that log's decisive lines.
5. A route call curls `http://localhost:<port>/<route>`.

The containers stay up for the next boot; a boot never runs `docker compose down`. The proof does not wait on `typecheck:watch`: run `pnpm typecheck` beside the boot.

- A booted request sends `x-api-key: local_<key>:<secret>`: the seed prefixes the `migration.api-key.data.ts` key with the environment (`ApiKeyCredentialUtil.createKey`). A notification proof passes once the SES or FCM call is made; a sandbox `MessageRejected` for an unverified address is no finding.
- The root `.env`, `.env.harness`, and `.env.docker`, `keys/`, and `generated/vault/` are unreadable, and a command that prints the environment is denied (`Read` deny, `guard-bash.sh`). Diagnose a boot auth failure from `docker compose --env-file .env.docker exec -T <service> printenv`, printing no secret, and the `apis` log; the owner fixes `.env` or `.env.docker`.
