# 0052. `src/common/` and `src/app/` import no module code or type

- Status: accepted
- Date: 2026-11-14

## Context

The request kit imported the user row and the JWT payload type, and kit files imported outbox code, so a feature change could break the kit beneath every feature.

## Decision

`src/common/` and `src/app/` import nothing from `src/modules/`, a type included; Prisma generated types and enums are allowed. `common.module.ts` and `app.module.ts` wire global modules, and the three outbox callers stay until the outbox moves into the kit. `src/configs/`, `src/*.ts`, `src/router/`, and `src/modules/` import anything.

## Considered options

- no module code or type in `src/common/` and `src/app/` (chosen)
- `import type` from a feature allowed: rejected, the kit still changes with a feature's shape.
- kit-owned copies a feature extends (`IUser extends IRequestUser`): rejected, the kit then holds feature shapes.
- a generic bound at every call site: rejected, every annotation repeats one binding.

## Consequences

- Lint `featureImportPattern` (`ts/common`) holds it.
- `RequestWorkspaceMiddleware` moves into the workspace module.
- `.claude/rules/layering.md` carries it.
