# Docker Compose File

> not test yet

## Replication Set

First run

```sh
docker-compose up -d
```

scale

In the case you want to scale the number of secondary nodes using the docker-compose parameter --scale, the MONGODB_ADVERTISED_HOSTNAME must not be set in mongodb-secondary and mongodb-arbiter defintions.

```sh
docker-compose up --detach --scale mongodb-primary=1 --scale mongodb-secondary=2 --scale mongodb-arbiter=1 -d
```

## Configuration replication set

[Read official document](https://github.com/bitnami/bitnami-docker-mongodb/blob/master/README.md#how-is-a-replica-set-configured)

## Enter container as root

```sh
docker exec -it rs-mongodb-primary-1 mongosh -u root -p password123
```

## Command

```mongosh
rs.conf()
rs.isMaster().isMaster
rs.status()
rs.initiate()
```
