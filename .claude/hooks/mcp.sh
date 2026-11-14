#!/usr/bin/env bash
# Run by .mcp.json, never by an agent and never as a hook: bash .claude/hooks/mcp.sh mongodb|redis-cache|redis-queue
# Starts one MCP server for the local compose containers with its URL read from the root .env.harness (MCP_MONGODB_URL,
# MCP_REDIS_CACHE_URL, MCP_REDIS_QUEUE_URL), so no URL or password is written in a tracked file or reaches the session.
# The MongoDB server runs read-only; the Redis server has no such mode, and .claude/settings.json denies its writing
# tools by name.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

value() {
    sed -n "s/^$1=//p" "$root/.env.harness" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

case "${1:-}" in
    mongodb)
        MDB_MCP_CONNECTION_STRING="$(value MCP_MONGODB_URL)" MDB_MCP_TELEMETRY=disabled MDB_MCP_DISABLED_TOOLS=atlas \
            exec npx -y mongodb-mcp-server@latest --readOnly
        ;;
    redis-cache)
        exec uvx --from redis-mcp-server@latest redis-mcp-server --url "$(value MCP_REDIS_CACHE_URL)"
        ;;
    redis-queue)
        exec uvx --from redis-mcp-server@latest redis-mcp-server --url "$(value MCP_REDIS_QUEUE_URL)"
        ;;
    *)
        echo "usage: mcp.sh mongodb|redis-cache|redis-queue" >&2
        exit 2
        ;;
esac
