#!/bin/bash
set -eu
# Single-node replica set for local Prisma transactions. Starts mongod, initiates
# rs0 once on a fresh volume, then stays as PID 1. Member host is
# host.docker.internal so the host machine and containers share the same RS URI.
RS_ID="${RS_ID:-rs0}"
RS_HOST="${RS_HOST:-host.docker.internal:27017}"
MONGO_PORT="${MONGO_PORT:-27017}"

mongod --bind_ip_all --replSet "$RS_ID" --port "$MONGO_PORT" &
MONGOD_PID=$!
trap 'kill -TERM "$MONGOD_PID" 2>/dev/null' TERM INT

echo "entrypoint: waiting for mongod..."
until mongosh --port "$MONGO_PORT" --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; do
  sleep 1
done

echo "entrypoint: ensuring replica set $RS_ID..."
mongosh --port "$MONGO_PORT" --quiet --eval "
try {
  rs.status();
  print('entrypoint: replica set already initialized');
} catch (e) {
  rs.initiate({
    _id: '${RS_ID}',
    members: [{ _id: 0, host: '${RS_HOST}', priority: 1 }]
  });
  print('entrypoint: replica set initiated');
}
"

echo "entrypoint: waiting for PRIMARY..."
until mongosh --port "$MONGO_PORT" --quiet --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; do
  sleep 1
done

echo "entrypoint: mongo replica set ready."
wait "$MONGOD_PID"
