# Router

`src/router/` mounts controllers under their access-level prefix. The FILES live in the feature
module; only the registration lives here.

```
src/router/
├── router.module.ts              # mounts the five route modules under their prefixes
└── routes/
    ├── routes.public.module.ts   → /public
    ├── routes.system.module.ts   → /system
    ├── routes.admin.module.ts    → /admin
    ├── routes.user.module.ts     → /user
    └── routes.shared.module.ts   → /shared
```

## Registering a controller

A route module lists the controller in `controllers:` and its owning feature module in
`imports:`. Both, always — a controller registered without its module's providers fails at boot
with an unresolvable dependency.

```ts
@Module({
    controllers: [UserUserController, WorkspaceUserController],
    imports: [UserModule, WorkspaceModule],
    providers: [],
    exports: [],
})
export class RoutesUserModule {}
```

**The feature module keeps `controllers: []`** (`rules/nest-wiring.md`). A controller registered
in its own module mounts OUTSIDE the prefix, so the endpoint exists at the wrong path with
nothing failing.

## One controller per scope, and the scope decides everything

`<module>.<scope>.controller.ts` with `<scope>` ∈ `admin` · `public` · `user` · `system` ·
`shared`. The scope is not a label — three rules key off it:

| Scope | Prefix | Auth surface | Pagination |
|---|---|---|---|
| `public` | `/public` | unauthenticated, or api-key only | cursor |
| `system` | `/system` | api-key / machine caller, no `req.user` | cursor |
| `user` | `/user` | JWT, workspace-scoped via `x-workspace-id` | cursor |
| `shared` | `/shared` | JWT, may be workspace-scoped | cursor |
| `admin` | `/admin` | JWT + `@RoleProtected` + `@PolicyAbilityProtected` | **offset** |

- **`/admin` is offset pagination; every other scope is cursor.** Not a per-endpoint
  judgement (`rules/pagination.md`).
- **An admin controller carries NO workspace or project guard**, ever. Admin reads across every
  workspace, and those guards resolve their subject from a client-supplied header
  (`rules/http.md`).
- **`public` and `system` carry no `req.user`**, so `@RequestThrottle({ user: true })` is a
  silent no-op there and must NOT be added (`rules/http.md`).
- **Every workspace-scoped and project-scoped route carries `@FeatureFlagProtected('workspace')`**
  — the whole `user`, `shared`, and `public` workspace surface. Admin routes are not part of it.

## Adding a scope

Adding a sixth route module means a new prefix in `router.module.ts`, a new
`routes.<scope>.module.ts`, and an answer to each row of the table above before the first
controller is written. It is not a mechanical addition.
