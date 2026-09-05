# Router

`src/router/` is where the feature layers are mounted. The FILES live in the feature module;
only the registration lives here.

```
src/router/
├── router.module.ts                       # imports the five HTTP modules and the processor module
├── http/
│   ├── router.http.public.module.ts       → /public
│   ├── router.http.system.module.ts       → /system
│   ├── router.http.admin.module.ts        → /admin
│   ├── router.http.user.module.ts         → /user
│   └── router.http.shared.module.ts       → /shared
└── processor/
    └── router.processor.module.ts         # every <feature>.processor.module.ts
```

`router.module.ts` binds each `RouterHttp<Scope>Module` to its prefix through
`NestJsRouterModule.register`, and imports `RouterProcessorModule` plainly — a processor has no
path.

## Registering a controller

A route module lists the controller in `controllers:` and the feature's HTTP module in
`imports:`. Both, always — a controller registered without its providers fails at boot with an
unresolvable dependency.

```ts
@Module({
    controllers: [UserUserController, WorkspaceUserController],
    imports: [UserHttpModule, WorkspaceHttpModule],
    providers: [],
    exports: [],
})
export class RouterHttpUserModule {}
```

- **The import target is `<Feature>HttpModule`, never `<Feature>Module`.** A controller's only
  collaborator is the HTTP service (`rules/architecture.md`); reaching the domain service from a
  controller skips the layer that owns DTO translation.
- **The feature modules keep `controllers: []`** (`rules/nest-wiring.md`). A controller
  registered in its own module mounts OUTSIDE the prefix, so the endpoint exists at the wrong
  path with nothing failing.

## Registering a processor

`router.processor.module.ts` imports every `<Feature>ProcessorModule` and provides nothing of
its own. The processor class and its processor service are the feature module's, not the
router's (`rules/queue.md`).

```ts
@Module({
    imports: [NotificationProcessorModule, WorkspaceProcessorModule],
})
export class RouterProcessorModule {}
```

## One controller per scope, and the scope decides everything

`<module>.<scope>.controller.ts` with `<scope>` ∈ `admin` · `public` · `user` · `system` ·
`shared`. The scope is not a label — three rules key off it:

| Scope | Prefix | Auth surface | Pagination |
|---|---|---|---|
| `public` | `/public` | unauthenticated, or api-key only | cursor |
| `system` | `/system` | api-key / machine caller, no `req.user` | cursor |
| `user` | `/user` | JWT, workspace-scoped via `x-workspace-id` | cursor |
| `shared` | `/shared` | JWT, may be workspace-scoped | cursor |
| `admin` | `/admin` | JWT + `@RoleProtected` + `@PolicyProtected` | **offset** |

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
`router.http.<scope>.module.ts`, and an answer to each row of the table above before the first
controller is written. It is not a mechanical addition.
