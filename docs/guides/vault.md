---
title: Vault Guide
description: Start the bundled Vault, push an env file into it, pull it back, and reset it.
---

# Vault Guide

This guide shows how to run the bundled HashiCorp Vault and move an env file through it, for an operator who works on the host Vault runs on.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Vault][ref-doc-concept-vault]: how the containers, the key-value layout, and the helpers work
- [Production][ref-doc-production-vault]: running Vault as a network service several hosts reach
- [Configuration Reference][ref-doc-reference-configuration]: the `DOCKER_*` variables Compose requires
- [Commands][ref-doc-reference-commands]: every `pnpm` script and Compose command

## Prerequisites

- Docker with the Compose plugin, and Node.js 26.13.x+ on the host: the helpers turn the env file into JSON with Node.
- The repository root as the working directory.
- A `.env.docker` file holding the eleven variables `ci/docker-compose.yml` requires. Compose interpolates the whole file, so a command that names only the Vault services still stops on an empty required variable: [Compose variables][ref-doc-reference-configuration-compose].
- An env file to store, such as the `.env` that `pnpm generate:secret --direct-insert` wrote.

## Steps

1. Start Vault and the bootstrap job. The command starts only the two services of the `vault` profile:

    ```bash
    docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault up -d vault vault-bootstrap
    ```

2. Follow the logs until bootstrap reports it is done, then press Ctrl+C to stop following:

    ```bash
    docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault logs -f vault vault-bootstrap
    ```

3. Push an env file to an environment's path. The command replaces what the path holds with the keys of the file:

    ```bash
    pnpm vault:push development .env
    ```

4. Pull the path back into an env file. The command overwrites the target file:

    ```bash
    pnpm vault:pull development .env
    ```

5. To change a value, edit the env file and run the push again. Every push replaces the whole path, so a key missing from the file is dropped from Vault.
6. To wipe Vault and start over, stop it, remove its volume, and start it again. Removing the volume makes the entrypoint initialize Vault again and overwrite `generated/vault/init.json`:

    ```bash
    docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault down
    docker volume rm ack-nestjs-boilerplate_vault_data
    docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault up -d vault vault-bootstrap
    ```

7. After the reset every path is empty, so push each environment's env file again with `pnpm vault:push <environment> <env-file>`.

Keep the volume and `generated/vault/init.json` together: deleting `init.json` while the volume persists makes the unseal fail, because the key is gone.

## Check the result

- The `vault` log ends with `entrypoint: vault unsealed and ready.` and the `vault-bootstrap` log ends with `bootstrap: done.`.
- The push prints `vault:push: wrote ack-nestjs-boilerplate/development from .env`.
- The pull prints `vault:pull: wrote .env (env=development)`, and the file is mode 600.
- A pull of a path nothing was pushed to fails and prints the command that starts Vault and the `vault:push` command that fills the path.

## Related tasks

- [Deploy the application][ref-doc-production]: where a release expects the env file on its host.
- [Run Vault as a network service][ref-doc-production-vault]: what a deployment prepares so other hosts reach Vault.

<!-- REFERENCES -->

[ref-doc-concept-vault]: ../concepts/vault.md
[ref-doc-production]: ../production.md
[ref-doc-production-vault]: ../production.md#vault-as-a-network-service
[ref-doc-reference-configuration]: ../reference/configuration.md
[ref-doc-reference-configuration-compose]: ../reference/configuration.md#compose-variables
[ref-doc-reference-commands]: ../reference/commands.md
