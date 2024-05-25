# Installation

## Getting Started

Before start, we need to install some packages and tools.
The recommended version is the LTS version for every tool and package.

> Make sure to check that the tools have been installed successfully.

1. [NodeJs][ref-nodejs]
2. [MongoDB][ref-mongodb]
3. [Yarn][ref-yarn]
4. [Git][ref-git]

### Clone Repo

Clone the project with git.

```bash
git clone https://github.com/andrechristikan/ack-nestjs-boilerplate.git
```

### Install Dependencies

This project needs some dependencies. Let's go install it.

```bash
yarn install
```

### Create environment

Make your own environment file with a copy of `env.example` and adjust values to suit your own environment.

```bash
cp .env.example .env
```

### Test

> Next development will add e2e test

The project only provide `unit testing`.

```bash
yarn test
```

## Run Project

Finally, Cheers 🍻🍻 !!! you passed all steps.

Now you can run the project.

```bash
yarn start:dev
```

## Run Project with Docker

For docker installation, we need more tools to be installed.

1. [Docker][ref-docker]
2. [Docker-Compose][ref-dockercompose]

### Create environment

Make your own environment file with a copy of `env.example` and adjust values to suit your own environment.

```bash
cp .env.example .env
```

then run

```bash
docker-compose up -d
```

## Database Migration

This project need to do migration for running. [Read this][ack-database-migration-doc]


[ack-database-migration-doc]: /docs/database_migration.md

<!-- Reference -->
[ref-mongodb]: https://docs.mongodb.com/
[ref-nodejs]: https://nodejs.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-git]: https://git-scm.com
