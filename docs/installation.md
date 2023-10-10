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

then run

```bash
docker-compose up -d
```

`After all containers up, we not finish yet`. We need to manual configure mongodb as replication set.
In this case primary will be `mongo1`

1. Enter the `mongo1 container`
   
    ```bash
    docker exec -it mongo1 mongosh
    ```

2. In mongo1 container, tell mongo1 to be primary and run as replication set
   
    ```js
    rs.initiate({_id:"rs0", members: [{_id:0, host:"mongo1:27017", priority:3}, {_id:1, host:"mongo2:27017", priority:2}, {_id:2, host:"mongo3:27017", priority:1}]}, { force: true })
    ```

    will return response `{status: ok}`
    
    then exit the container
    
    ```bash
    exit
    ```

3. Adjust env file
   > Adjust with your own environment
   
    ```env
    ...

    DATABASE_HOST=mongodb://mongo1:27017,mongo2:27017,mongo3:27017
    DATABASE_NAME=ack
    DATABASE_USER=
    DATABASE_PASSWORD=
    DATABASE_DEBUG=false
    DATABASE_OPTIONS=replicaSet=rs0&retryWrites=true&w=majority

    ...
    ```

4. Restart the service container

    ```bash
    docker restart service
    ```

## Database Migration

This project need to do migration for running. [Read this][ack-database-migration-doc]

## API Reference

You can check The ApiSpec after running this project. [here][api-reference-docs]

<!-- API Reference -->
[api-reference-docs]: http://localhost:3000/docs

<!-- Reference -->
[ref-nestjs]: http://nestjs.com
[ref-mongoose]: https://mongoosejs.com
[ref-mongodb]: https://docs.mongodb.com/
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-nestjscommand]: https://gitlab.com/aa900031/nestjs-command
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
