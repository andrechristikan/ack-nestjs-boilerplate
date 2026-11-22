#!/usr/bin/env bash
# Run by .mcp.json, never by an agent and never as a hook: bash .claude/hooks/mcp.sh postgres|redis-cache|redis-queue
# Starts one MCP server for the local compose containers with its URL read from the root .env.harness (MCP_POSTGRES_URL,
# MCP_REDIS_CACHE_URL, MCP_REDIS_QUEUE_URL), so no URL or password is written in a tracked file or reaches the session.
# The PostgreSQL server runs in restricted mode, which holds every statement in a read-only transaction; the Redis server has no such mode, and .claude/settings.json denies its writing
# tools by name.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

value() {
    sed -n "s/^$1=//p" "$root/.env.harness" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

case "${1:-}" in
    postgres)
        DATABASE_URI="$(value MCP_POSTGRES_URL)" exec uvx postgres-mcp@latest --access-mode=restricted
        ;;
    redis-cache)
        exec uvx --from redis-mcp-server@latest redis-mcp-server --url "$(value MCP_REDIS_CACHE_URL)"
        ;;
    redis-queue)
        exec uvx --from redis-mcp-server@latest redis-mcp-server --url "$(value MCP_REDIS_QUEUE_URL)"
        ;;
    *)
        echo "usage: mcp.sh postgres|redis-cache|redis-queue" >&2
        exit 2
        ;;
esac
