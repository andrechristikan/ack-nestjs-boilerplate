#!/usr/bin/env bash
# PreToolUse (Bash) hook: deny any command that reaches the database.
# The owner runs these. A permission glob only sees the shape it was written for,
# so the whole command string is inspected here instead — pipes, `&&`, `pnpm -s run`,
# `npx -y` and every other spelling included.
#
# Schema EDITS are not blocked: prisma/schema.prisma is editable, and `prisma generate`,
# `prisma format` and `prisma validate` touch nothing but files.

cmd=$(jq -r ".tool_input.command // empty")

deny() {
    jq -n --arg reason "$1" '{
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: $reason
        }
    }'
    exit 0
}

# prisma subcommands that open a connection to MongoDB
if printf '%s' "$cmd" | grep -qE 'prisma[[:space:]]+(db[[:space:]]+(push|execute|seed)|migrate)([[:space:]]|$)'; then
    deny "This command applies schema or data to MongoDB, which is the owner's to run. Describe the delta and hand it back. Editing prisma/schema.prisma is allowed, and so are prisma generate, prisma format and prisma validate."
fi

# package scripts that wrap those, plus the nest-commander seeder
if printf '%s' "$cmd" | grep -qE '(^|[;&|(])[[:space:]]*pnpm([[:space:]]+-[^[:space:]]+)*([[:space:]]+run)?([[:space:]]+-[^[:space:]]+)*[[:space:]]+(db:migrate|migration(:(seed|remove|fresh))?)([[:space:]]|$)'; then
    deny "This package script writes to MongoDB (db:migrate is prisma db push; migration:fresh is prisma db push --force-reset, which drops the database). The owner runs it. db:generate and db:format are allowed."
fi

if printf '%s' "$cmd" | grep -qE 'dist/migration\.js'; then
    deny "This runs the nest-commander seeder against MongoDB. The owner runs it. Write the seed class and hand it back."
fi

# direct database shells
if printf '%s' "$cmd" | grep -qE '(^|[;&|(]|\$\()[[:space:]]*(mongosh|mongo|redis-cli)([[:space:]]|$)'; then
    deny "A direct database shell is the owner's. Read the data through the application or through Prisma in application code."
fi

exit 0
