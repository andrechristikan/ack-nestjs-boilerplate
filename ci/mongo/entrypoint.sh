#!/bin/bash
set -eu
# Single-node replica set for Prisma transactions. Starts mongod as the mongodb user, initiates rs0 once
# on a fresh volume, then stays as PID 1.
# Without access control (no keyfile mounted at KEYFILE, or MONGO_INITDB_ROOT_PASSWORD empty): mongod starts
# plain, with no --keyFile, no --auth, and no root user, even when the keyfile is mounted; the member host
# defaults to host.docker.internal so the host machine and containers share the same RS URI.
# With a keyfile mounted at KEYFILE and MONGO_INITDB_ROOT_PASSWORD set: mongod runs with --keyFile and --auth;
# rs.initiate and the root user come from the localhost exception on the first boot and
# are skipped on a restart. The member host is RS_HOST, a name on the compose network.
RS_ID="${RS_ID:-rs0}"
RS_HOST="${RS_HOST:-host.docker.internal:27017}"
MONGO_PORT="${MONGO_PORT:-27017}"
KEYFILE="${KEYFILE:-/etc/mongo/keyfile}"
RUNTIME_KEYFILE=/tmp/mongo-keyfile
export RS_ID RS_HOST

MONGOD_ARGS=(--bind_ip_all --replSet "$RS_ID" --port "$MONGO_PORT")
AUTH_ENABLED=false

if [ -n "${MONGO_INITDB_ROOT_PASSWORD:-}" ] && [ -d "$KEYFILE" ]; then
  echo "entrypoint: $KEYFILE is a directory; create the keyfile on the host before the first start." >&2
  exit 1
fi

if [ -n "${MONGO_INITDB_ROOT_PASSWORD:-}" ] && [ -f "$KEYFILE" ]; then
  : "${MONGO_INITDB_ROOT_USERNAME:?entrypoint: MONGO_INITDB_ROOT_USERNAME is empty; set DOCKER_MONGO_ROOT_USERNAME in .env}"
  # The mounted keyfile is read-only and owned by the host user; mongod needs its own copy, owned by mongodb, mode 400.
  install -o mongodb -g mongodb -m 400 "$KEYFILE" "$RUNTIME_KEYFILE"
  MONGOD_ARGS+=(--keyFile "$RUNTIME_KEYFILE" --auth)
  AUTH_ENABLED=true
fi

# This script runs as root; mongod runs as the image's mongodb user, so data from an earlier root-run start is handed over.
for DATA_DIR in /data/db /data/configdb; do
  if [ -d "$DATA_DIR" ] && [ -n "$(find "$DATA_DIR" ! -user mongodb -print -quit)" ]; then
    echo "entrypoint: handing $DATA_DIR to mongodb..."
    chown -R mongodb:mongodb "$DATA_DIR"
  fi
done

gosu mongodb mongod "${MONGOD_ARGS[@]}" &
MONGOD_PID=$!
trap 'kill -TERM "$MONGOD_PID" 2>/dev/null' TERM INT

echo "entrypoint: waiting for mongod..."
until mongosh --port "$MONGO_PORT" --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; do
  sleep 1
done

echo "entrypoint: ensuring replica set $RS_ID..."
if [ "$AUTH_ENABLED" = true ]; then
  mongosh --port "$MONGO_PORT" --quiet --eval '
if (db.hello().setName) {
  print("entrypoint: replica set already initialized");
} else {
  rs.initiate({
    _id: process.env.RS_ID,
    members: [{ _id: 0, host: process.env.RS_HOST, priority: 1 }]
  });
  print("entrypoint: replica set initiated");
}
'
else
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
fi

echo "entrypoint: waiting for PRIMARY..."
until mongosh --port "$MONGO_PORT" --quiet --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; do
  sleep 1
done

if [ "$AUTH_ENABLED" = true ]; then
  echo "entrypoint: ensuring root user..."
  mongosh --port "$MONGO_PORT" --quiet --eval '
try {
  db.getSiblingDB("admin").createUser({
    user: process.env.MONGO_INITDB_ROOT_USERNAME,
    pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
    roles: [{ role: "root", db: "admin" }]
  });
  print("entrypoint: root user created");
} catch (e) {
  if (e.codeName !== "Unauthorized") {
    throw e;
  }
  print("entrypoint: root user already exists");
}
'
fi

echo "entrypoint: mongo replica set ready."
# A forwarded signal interrupts the first wait; the second holds PID 1 until mongod has shut down.
MONGOD_STATUS=0
wait "$MONGOD_PID" || MONGOD_STATUS=$?
if kill -0 "$MONGOD_PID" 2>/dev/null; then
  MONGOD_STATUS=0
  wait "$MONGOD_PID" || MONGOD_STATUS=$?
fi
exit "$MONGOD_STATUS"
