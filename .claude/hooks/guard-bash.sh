#!/usr/bin/env bash
# PreToolUse Bash: foreground only; pnpm only; owner-only database commands; no read of the root .env, keys/,
# generated/vault/, or .claude/settings.local.json, a recursive search over .claude included; no print of the session
# environment; commits, staging, and discarding work ask; docker compose down with volumes asks.
set -euo pipefail

decide() {
    jq -cn --arg decision "$1" --arg reason "$2" \
        '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$decision,permissionDecisionReason:$reason}}'
    exit 0
}

payload=$(cat)

if [ "$(printf '%s' "$payload" | jq -r '.tool_input.run_in_background // false')" = "true" ]; then
    decide deny "Foreground only: no run_in_background; run the command in the foreground and wait for it (.claude/CLAUDE.md, Etiquette)."
fi

cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

# A command word: after a separator, `sudo`, `env`, and `NAME=value` prefixes. Matching command words only keeps a
# quoted mention (`grep "db:migrate"`, `git log -S'add'`) out of the decisions below.
at_command_start='(^|[;&|(]|\$\()[[:space:]]*(sudo[[:space:]]+)?(env[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
word_end='([[:space:];&|)]|$)'

if printf '%s' "$cmd" | grep -qE "${at_command_start}(npm|yarn)${word_end}"; then
    decide deny "pnpm only: package.json engines and the preinstall guard reject npm and yarn. Use pnpm install, pnpm add, pnpm run. npx is allowed."
fi

owner_prisma="${at_command_start}((npx|pnpm([[:space:]]+(exec|dlx))?)[[:space:]]+)?(([^[:space:];&|()]*/)?node_modules/\.bin/)?prisma[[:space:]]+(db|migrate|studio)${word_end}"
owner_script="${at_command_start}pnpm([[:space:]]+-[^[:space:]]+)*([[:space:]]+run)?[[:space:]]+(db:migrate|db:studio|migration(:seed|:remove|:fresh)?)${word_end}"
owner_node="${at_command_start}node([[:space:]]+[^[:space:];&|]+)*[[:space:]]+(\./)?dist/migration\.js${word_end}"
owner_shell="${at_command_start}(mongosh?|redis-cli)${word_end}"
if printf '%s' "$cmd" | grep -qE "${owner_prisma}|${owner_script}|${owner_node}|${owner_shell}"; then
    decide deny "Owner-only: db:migrate, db:studio, migration, migration:seed, migration:remove, migration:fresh, prisma db/migrate/studio (bare, npx, pnpm, pnpm exec, pnpm dlx, node_modules/.bin/prisma), node dist/migration.js, mongosh, redis-cli. Edit prisma/schema.prisma and hand back the commands the owner runs."
fi

# The root `.env` holds live credentials: a command naming it as a path token (`.env`, `./.env`, `<dir>/.env`, `.env*`)
# or running the dotenv CLI reads it. `--env-file .env` (node, docker compose) hands it to a process unprinted and is
# stripped first; `.env.example`, `.env.<name>`, `dotenv/config`, and a quoted `\.env` pattern do not match.
env_cmd=$(printf '%s' "$cmd" | sed -E 's/--env-file(-if-exists)?(=|[[:space:]]+)[^[:space:];&|)]+//g')
env_file="(^|[[:space:]'\"\`=:(<>{,/])\.env([[:space:]'\"\`);&|<>,}*?]|$)"
dotenv_cli="${at_command_start}((npx|pnpm[[:space:]]+(exec|dlx))[[:space:]]+)?dotenvx?${word_end}"
if printf '%s' "$env_cmd" | grep -qE "${env_file}|${dotenv_cli}"; then
    decide deny "The root .env is the owner's and no agent reads it; .env.example and other .env.* files stay readable. Diagnose a boot failure from the container env (docker-compose exec -T <service> printenv, never printing a secret value) or a boot with the variable set in the environment, which .env does not override; hand the .env fix to the owner."
fi

# keys/ (JWT private keys, encryption-secret.env, the Mongo keyfile), generated/vault/ (init.json: the Vault root token
# and unseal key), and .claude/settings.local.json (TYPESAFE_API_KEY) are owner-only secret stores: a command naming one
# as a path token (`keys/x`, `./keys/x`, `<dir>/keys/x`, `generated/vault`) reads it. `keys` inside another segment (`api-key/`, `api-keys/`) does not match.
secret_path="(^|[[:space:]'\"\`=:(<>{,/])(keys/|generated/vault([[:space:]'\"\`);&|<>,}*?/]|$)|\.claude/settings\.local\.json)"
if printf '%s' "$cmd" | grep -qE "$secret_path"; then
    decide deny "keys/ (JWT private keys, encryption-secret.env), generated/vault/ (init.json: the Vault root token and unseal key), and .claude/settings.local.json (the TYPESAFE_API_KEY env block) are the owner's secret stores and no agent reads them; hand any step that needs them to the owner."
fi

# A recursive search over the project's .claude scans settings.local.json though no word names it, and a match prints
# its TYPESAFE_API_KEY. Matched: grep -r and its flag forms, rg, and find feeding grep or rg, over `.claude`,
# `<dir>/.claude`, `.claude/*`, or `.` from inside .claude. A filter leaving the file out (`--exclude`, `--include`,
# rg `-g`, `-t`, `-T`, find `-name`, `-path`), a narrower path, `~/.claude`, and `rg --files` do not match.
secret_name='settings.local.json'

is_project_claude() {
    local path="${1%/}"
    path="${path%/.}"
    path="${path%/\*\*}"
    path="${path%/\*}"
    case "$path" in
    '~/.claude' | '$HOME/.claude' | '${HOME}/.claude' | "${HOME:-}/.claude") return 1 ;;
    .claude | */.claude) return 0 ;;
    *) return 1 ;;
    esac
}

targets_claude() {
    if is_project_claude "$1"; then return 0; fi
    if $in_claude; then
        case "$1" in . | ./) return 0 ;; esac
    fi
    return 1
}

is_search_tool() {
    case "${1##*/}" in
    grep | egrep | fgrep | rg) return 0 ;;
    *) return 1 ;;
    esac
}

glob_hits_secret() {
    # shellcheck disable=SC2053 # the right side is a glob on purpose
    [[ $secret_name == $1 || .claude/$secret_name == $1 ]]
}

filter_out() {
    if glob_hits_secret "$1"; then excluded=true; fi
}

filter_in() {
    include_seen=true
    if glob_hits_secret "$1"; then include_hit=true; fi
}

rg_glob() {
    case "$1" in
    '!'*) filter_out "${1#!}" ;;
    *) filter_in "$1" ;;
    esac
}

filters_spare_secret() {
    if $excluded; then return 0; fi
    if $include_seen && ! $include_hit; then return 0; fi
    return 1
}

# One simple command per line: unquoted separators split, quote characters drop, and whitespace inside quotes turns to
# \001, so a quoted pattern stays one word and a quoted `|` splits nothing.
split_commands() {
    awk '{
        for (i = 1; i <= length($0); i++) {
            c = substr($0, i, 1)
            if (c == "\\" && quote != "\047") { i++; word = word substr($0, i, 1) }
            else if (quote != "") {
                if (c == quote) quote = ""
                else if (c ~ /[[:space:]]/) word = word "\001"
                else word = word c
            }
            else if (c == "\047" || c == "\"") quote = c
            else if (index(";&|()`", c) > 0) { print word; word = "" }
            else word = word c
        }
        if (quote != "") word = word "\001"
        else { print word; word = "" }
    } END { print word }'
}

# Arguments: the tool, then its words. The first positional is the pattern unless -e or -f supplied one.
search_scans_secret() {
    local tool="${1##*/}" recursive=false over=false explicit=false count=0 first='' word
    shift
    if [ "$tool" = rg ]; then recursive=true; fi
    excluded=false include_seen=false include_hit=false
    set -- "$@" ''
    while [ $# -gt 0 ]; do
        word=$1
        shift
        if [ "$tool" = rg ]; then
            case "$word" in
            --files) return 1 ;;
            --glob=* | --iglob=*) rg_glob "${word#*=}"; continue ;;
            -g | --glob | --iglob) rg_glob "$1"; shift; continue ;;
            -g?*) rg_glob "${word#-g}"; continue ;;
            --type=*) filter_in "*.${word#*=}"; continue ;;
            -t | --type) filter_in "*.$1"; shift; continue ;;
            -t?*) filter_in "*.${word#-t}"; continue ;;
            --type-not=*) filter_out "*.${word#*=}"; continue ;;
            -T | --type-not) filter_out "*.$1"; shift; continue ;;
            -T?*) filter_out "*.${word#-T}"; continue ;;
            esac
        fi
        case "$word" in
        --*) ;;
        -*[rR]*) recursive=true ;;
        esac
        case "$word" in
        '' | -- | -) ;;
        --exclude=*) filter_out "${word#*=}" ;;
        --exclude) filter_out "$1"; shift ;;
        --include=*) filter_in "${word#*=}" ;;
        --include) filter_in "$1"; shift ;;
        --recursive | --dereference-recursive | --directories=recurse) recursive=true ;;
        --directories)
            if [ "$1" = recurse ]; then recursive=true; fi
            shift
            ;;
        --regexp=* | --file=*) explicit=true ;;
        --regexp | --file) explicit=true; shift ;;
        --*) ;;
        -e?* | -f?*) explicit=true ;;
        -*[ef]) explicit=true; shift ;;
        -d)
            if [ "$1" = recurse ]; then recursive=true; fi
            shift
            ;;
        -*[ABCmDjM]) shift ;;
        -*) ;;
        *)
            count=$((count + 1))
            if [ "$count" -eq 1 ]; then
                first=$word
            elif targets_claude "$word"; then
                over=true
            fi
            ;;
        esac
    done
    if $explicit && [ "$count" -ge 1 ] && targets_claude "$first"; then over=true; fi
    if $in_claude && { [ "$count" -eq 0 ] || { [ "$count" -eq 1 ] && ! $explicit; }; }; then over=true; fi
    if ! $recursive || ! $over; then return 1; fi
    if filters_spare_secret; then return 1; fi
    return 0
}

# Arguments: the words after `find`. Sets find_walks when the walk reaches the file, find_searches when -exec searches.
parse_find() {
    local negate=false over=false word
    excluded=false include_seen=false include_hit=false
    set -- "$@" ''
    while [ $# -gt 0 ]; do
        word=$1
        shift
        case "$word" in
        '') ;;
        '!' | -not) negate=true ;;
        -name | -iname | -path | -ipath | -wholename | -iwholename)
            if $negate; then filter_out "$1"; else filter_in "$1"; fi
            shift
            negate=false
            ;;
        -prune)
            if $include_hit; then excluded=true; fi
            ;;
        -exec | -execdir | -ok | -okdir)
            if is_search_tool "$1"; then find_searches=true; fi
            negate=false
            ;;
        -*) negate=false ;;
        *)
            if targets_claude "$word"; then over=true; fi
            ;;
        esac
    done
    if $over && ! filters_spare_secret; then find_walks=true; fi
}

claude_search_reason="A recursive search over .claude scans settings.local.json, the owner's TYPESAFE_API_KEY store, and no agent reads it. Exclude it (grep --exclude=settings.local.json, rg -g '!settings.local.json', find ! -name settings.local.json) or search a narrower path such as .claude/rules."

in_claude=false
if is_project_claude "$(printf '%s' "$payload" | jq -r '.cwd // empty')"; then in_claude=true; fi
if $in_claude || printf '%s' "$cmd" | grep -qF '.claude'; then
    find_walks=false
    find_searches=false
    while IFS= read -r segment; do
        read -ra words <<<"$segment"
        if [ "${#words[@]}" -eq 0 ]; then continue; fi
        set -- "${words[@]}"
        while [ $# -gt 1 ]; do
            case "$1" in
            sudo | env | command | [A-Za-z_]*=*) shift ;;
            *) break ;;
            esac
        done
        case "${1##*/}" in
        cd)
            if is_project_claude "${2:-}"; then in_claude=true; else in_claude=false; fi
            ;;
        grep | egrep | fgrep | rg)
            if search_scans_secret "$@"; then decide deny "$claude_search_reason"; fi
            ;;
        find)
            shift
            parse_find "$@"
            if $find_walks && $find_searches; then decide deny "$claude_search_reason"; fi
            ;;
        xargs)
            if $find_walks; then
                for word in "$@"; do
                    if is_search_tool "$word"; then decide deny "$claude_search_reason"; fi
                done
            fi
            ;;
        esac
    done < <(printf '%s\n' "$cmd" | split_commands)
fi

# The session environment carries TYPESAFE_API_KEY and other credentials: a command that dumps it (bare env, printenv,
# set, export, declare -p/-x) or prints a key variable is denied. `env NAME=value cmd`, `env -u NAME cmd`, and a
# container's `docker compose exec <service> printenv` do not match.
env_dump="${at_command_start}(env|printenv([[:space:]]+[A-Za-z_][A-Za-z0-9_]*)*|set|export([[:space:]]+-p)?|declare[[:space:]]+-[A-Za-z]*[px][A-Za-z]*)[[:space:]]*([;&|)]|$)"
key_print="${at_command_start}(echo|printf)[^;&|]*\\$\\{?TYPESAFE_API_KEY"
if printf '%s' "$cmd" | grep -qE "${env_dump}|${key_print}"; then
    decide deny "The session environment holds credentials (TYPESAFE_API_KEY among them): do not print it. Test whether a variable is set with [ -n \"\${NAME:-}\" ] && echo set."
fi

git_write="${at_command_start}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+((commit|add|reset)${word_end}|stash(([[:space:]]+(push|pop|apply|drop|clear|save|branch|store)|[[:space:]]+-[^[:space:]]+)${word_end}|[[:space:]]*([;&|)]|$)))"
if printf '%s' "$cmd" | grep -qE "$git_write"; then
    decide ask "Commits and staging are the owner's call"
fi

git_discard="${at_command_start}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+((rm|mv|restore)${word_end}|checkout([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+(--|\.)${word_end})"
if printf '%s' "$cmd" | grep -qE "$git_discard"; then
    decide ask "Staging and discarding work are the owner's call"
fi

compose_down_volumes="${at_command_start}(docker[[:space:]]+compose|docker-compose)([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+down([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+(-[A-Za-z]*v[A-Za-z]*|--volumes(=[^[:space:];&|)]*)?)${word_end}"
if printf '%s' "$cmd" | grep -qE "$compose_down_volumes"; then
    decide ask "docker compose down with -v or --volumes deletes the named volumes mongo_data, redis_data, and vault_data (the MongoDB data, the Redis cache and queue data, Vault's storage); plain down keeps them."
fi

exit 0
