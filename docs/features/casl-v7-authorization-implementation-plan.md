# CASL v7 Authorization Implementation Plan

Status: implementation plan

## Purpose

This plan defines how HTTP authorization will enforce CASL rules whose conditions are stored in the database and may grow beyond the initial workspace and workspace-member scope fields.

The design keeps authorization context at the HTTP boundary. Domains remain reusable by processors, queued jobs, and automations that do not have a request user or a request ability.

## Core Decisions

### Stored policies remain the source of truth

Policy rows are loaded in their stored form. The application does not rewrite or partially interpret their condition trees before building an ability.

The request-scoped ability is built with:

```ts
policyAbilityFactory.buildFromPolicies(policies, {
    [EnumPolicyConditionPlaceholder.userId]: user.id,
    [EnumPolicyConditionPlaceholder.workspaceId]: workspace.id,
    [EnumPolicyConditionPlaceholder.workspaceMemberId]: member.id,
});
```

Only placeholder values known at the current request boundary are supplied. Unresolved placeholders fail closed according to the ability factory contract. Raw policy rows are never mutated.

### HTTP services and policy guards own request authorization

The request flow is:

```text
UserGuard
  -> WorkspaceGuard
  -> WorkspaceMemberGuard
  -> PolicyAbilityGuard
  -> WorkspacePolicyGuard
  -> WorkspaceMemberPolicyGuard
  -> HTTP service
  -> Domain
  -> Repository
```

Each guard is used only where its boundary is needed. `PolicyAbilityGuard` is added only to routes that need authorization and loads only the policy scope declared by the route. A processor or automation calls the domain directly and is not required to construct an HTTP ability.

### Authorization targets are real records for arbitrary conditions

Route identifiers are enough to identify a target, but they are not enough to evaluate future conditions such as `isPublic`, ownership fields, status fields, nested objects, or relation predicates.

Therefore:

- A guard must not authorize an arbitrary stored condition against `{ id }` or another synthetic partial object.
- A cached record may be checked with `ability.can` only when it contains the fields required by the subject policy contract.
- Otherwise, the target must be resolved with a database query that combines the business boundary and `accessibleBy` output.
- A target that does not satisfy the policy-aware query is treated as not found at the HTTP boundary. This avoids leaking whether a caller can see a protected record.

This makes newly supported condition fields effective without changing every guard when a policy schema grows.

## Guard Responsibilities

### UserGuard

1. Resolve the authenticated user.
2. Store the user in `RequestStoreService`.

`UserGuard` does not load policies or build an ability. This prevents endpoints that only need authentication from loading authorization data.

### WorkspaceGuard

1. Read `:workspaceId` from route parameters when present.
2. Otherwise read the configured workspace context, such as the workspace header.
3. Resolve the active workspace and store it under `WorkspaceStoreKey`.
4. Keep business filters such as the active or non-deleted workspace filter.

This makes the same guard usable for current-workspace routes and admin routes that address a workspace by path parameter.

### WorkspaceMemberGuard

1. Resolve the authenticated user's membership in the workspace stored by `WorkspaceGuard`.
2. Store the acting member and role under `WorkspaceMemberStoreKey`.
3. Remain a membership and request-context guard.

The guard must not authorize a route target member merely because the caller is a member. A route containing `:workspaceMemberId` may address a different member.

### PolicyAbilityGuard

`PolicyAbilityGuard` is the lazy ability-loading boundary. It does not authorize a subject. It reads the policy scope declared by route metadata, loads only the required role policies, builds the ability, and stores it for later policy guards or HTTP services.

Supported scopes are:

- `platform`: the authenticated user's platform role policies;
- `workspace`: the platform policies plus the current workspace member's role policies;
- `workspaceMember`: the same workspace ability, because the current workspace role governs actions on workspace members.

The guard must:

1. Read the required ability scope from route metadata.
2. Reuse an already-built ability from `RequestStoreService` when the same scope was requested earlier in the request.
3. Load only the authenticated user's platform role and, for workspace scopes, only the current member's workspace role.
4. Supply the placeholders available at the resolved boundary.
5. Call `policyAbilityFactory.buildFromPolicies` for the selected policy rows.
6. Merge parent rules only when the selected scope requires them.
7. Store the resolved ability under a scope-aware request-store key.

The implementation should delegate policy retrieval and ability composition to a reusable `PolicyAbilityService`. The guard is the HTTP pipeline adapter; the service remains independently testable.

### WorkspacePolicyGuard

`WorkspacePolicyGuard` is the workspace policy boundary and is responsible only for workspace record enforcement. `PolicyAbilityGuard` must run before it with the `workspace` scope.

1. Read the required action and subject metadata.
2. Resolve the workspace identifier from `request.params.workspaceId`, falling back to `WorkspaceStoreKey`.
3. Read the already-built workspace ability.
4. Check whether the current user can perform the action on the resolved workspace record. If arbitrary relation conditions are supported for `Workspace`, use a policy-aware target query instead of a partial synthetic subject.

For platform-admin workspace routes that do not have a workspace member, the guard keeps the platform ability and enforces the workspace rule against the resolved workspace. Workspace role policies are only applicable when a workspace membership exists.

### WorkspaceMemberPolicyGuard

`WorkspaceMemberPolicyGuard` is the target-member policy boundary.

1. Read the required action and subject metadata.
2. Read the already-built workspace-member ability.
3. Resolve the target member identifier from `request.params.workspaceMemberId`.
4. When the parameter is absent, use the member stored under `WorkspaceMemberStoreKey`.
5. Resolve the target within the current workspace and active-member business boundary.
6. Apply the ability's CASL predicate to the target query.
7. Store the authorized target for the HTTP service and controller path.
8. Check whether the current user can perform the action on the target member.

The route parameter always wins over the acting member context. This prevents an update or delete endpoint from checking the caller's membership while acting on another member.

## Policy Decorators

Policy decorators declare both the required action and the ability scope. Specialized decorators fix their subject and accept only actions:

```ts
@WorkspacePolicyProtected(EnumPolicyAction.update)
```

This always creates a requirement for `EnumPolicySubject.Workspace`.

```ts
@WorkspaceMemberPolicyProtected(EnumPolicyAction.update)
```

This always creates a requirement for `EnumPolicySubject.WorkspaceMember`.

The specialized decorators must not accept a subject argument. This prevents a route from combining a workspace guard with an unrelated subject requirement.

Platform and generic-subject endpoints use the explicitly named `PlatformPolicyProtected` decorator:

```ts
@PlatformPolicyProtected({
    action: EnumPolicyAction.read,
    subject: EnumPolicySubject.User,
})
```

`PlatformPolicyProtected` loads the platform ability and delegates subject evaluation to the generic `PolicyGuard`. The name describes the policy scope being loaded, not a fixed subject type.

The shared decorator implementation should remain in the policy module, while workspace-specific public decorators may live in the workspace module. The existing `PolicyProtected` name is removed rather than retained as an alias.

## Arbitrary Condition Resolution

### Policy-to-query path

The policy module exposes a single capability for converting the resolved ability into a Prisma predicate:

```ts
policyDomain.accessibleWhere(
    ability,
    EnumPolicyAction.read,
    EnumPolicySubject.WorkspaceMember
);
```

The returned predicate is passed into the subject-specific domain or repository method, which combines it with mandatory business constraints:

```ts
where: {
    AND: [
        { id: targetMemberId },
        { workspaceId },
        WorkspaceMemberActiveFilter,
        authorizationWhere,
    ],
}
```

The caller can provide ordinary filters such as search or pagination filters, but cannot replace the authorization predicate. Repository methods must keep the authorization predicate as a separate input or receive a domain-owned query object that cannot be overwritten by caller filters.

### Point reads and mutations

For read, update, and delete endpoints, the policy guard resolves the authorized target before the HTTP service invokes the domain operation.

The target record is stored in request context and passed to the HTTP service or controller through a target decorator. The HTTP service passes that target to the domain where practical, avoiding a second lookup for the same request.

The mutation still executes through the repository and must retain its business key or transaction constraints. The guard check is the request authorization boundary; the domain remains responsible for business invariants and the repository remains responsible for Prisma execution.

If the target query returns no row, the endpoint returns the normal not-found result. A separate unrestricted lookup followed by `ability.can` is only needed when the product explicitly requires distinguishing not-found from forbidden.

### Lists and pagination

List endpoints use the existing pagination parameter and extend its `where` value with the authorization predicate. No second public pagination parameter is introduced.

The HTTP service obtains the resolved ability and calls `accessibleWhere`. The domain or repository combines that predicate with:

- active and soft-delete filters;
- tenant or workspace boundaries;
- caller-provided search and equality filters;
- pagination ordering and cursor constraints.

The final query must preserve all predicates with `AND` composition. A caller-provided `where` object must never be spread after the authorization predicate in a way that can overwrite it.

For a list route, the required CASL action is checked at the subject type level to confirm that the ability contains a read capability, and the database query enforces the conditions for each returned record.

## Route Composition

Use explicit decorators or metadata for the resource boundary so guard ordering is visible at the route:

| Route kind | Required guards | Condition enforcement |
| --- | --- | --- |
| Platform-only endpoint | `UserGuard`, `PlatformPolicyProtected`, `PolicyGuard` | Type-level capability or service-level record check |
| Current workspace record | `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberGuard`, `PolicyAbilityGuard(workspace)`, `WorkspacePolicyGuard` | Workspace record |
| Workspace member record | `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberGuard`, `PolicyAbilityGuard(workspaceMember)`, `WorkspacePolicyGuard`, `WorkspaceMemberPolicyGuard` | Target member record |
| Admin workspace record | `UserGuard`, `WorkspaceGuard`, `PolicyAbilityGuard(platform)`, `WorkspacePolicyGuard` | Workspace record |
| Workspace list | `UserGuard`, `PolicyAbilityGuard(platform or workspace)` | `accessibleWhere` merged into pagination `where` |
| Workspace member list | `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberGuard`, `PolicyAbilityGuard(workspaceMember)` | `accessibleWhere` merged into pagination `where` |

Generic `PolicyGuard` remains suitable for subject-type checks and routes without a resource target. `PlatformPolicyProtected` supplies its platform ability. Specialized resource decorators and guards own fixed-subject target resolution and condition-aware enforcement.

## Repository and Domain Contracts

Add subject-specific methods that accept an authorization predicate as a protected query input. The method must combine it with its own mandatory constraints.

Examples:

```ts
findAccessibleById(
    workspaceId: string,
    memberId: string,
    authorizationWhere: Prisma.WorkspaceMemberWhereInput
): Promise<WorkspaceMember | null>
```

```ts
findWithPaginationOffset(
    params: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>
): Promise<IResponsePaginationReturn<Workspace>>
```

The list method keeps the existing pagination shape. The HTTP service creates the authorization predicate and places it into the existing `where` field before calling the domain. The repository remains the only layer that knows the final Prisma query shape.

For point operations, the preferred first version is:

1. policy-aware target read in the guard;
2. authorized target passed to the HTTP service and domain;
3. domain business validation;
4. repository update or delete.

Atomic policy-constrained mutations can be added later for high-risk operations without changing the policy contract.

## Placeholder Contract

The placeholder catalog remains explicit and subject to validation:

| Placeholder | Available at | Meaning |
| --- | --- | --- |
| `userId` | `UserGuard` and every descendant | Authenticated user |
| `workspaceId` | `WorkspaceGuard` and every descendant | Resolved workspace |
| `workspaceMemberId` | `WorkspaceMemberGuard` and every descendant | Acting workspace member |
| Future placeholders | Their owning boundary only | Never inferred from arbitrary request input |

`PolicyAbilityGuard` calls `buildFromPolicies` after the required context is available. `WorkspacePolicyGuard` and `WorkspaceMemberPolicyGuard` consume the resolved ability and never rebuild it with a target identifier. A target identifier is a resource selector, not the identity of the acting member.

If a future placeholder is unavailable, the rule is not made unconditional. It remains unresolved and the ability factory's fail-closed behavior applies.

## Implementation Steps

1. Add request-store keys and target decorators for authorized workspace and workspace-member records.
2. Update `WorkspaceGuard` to prefer `:workspaceId` over the configured current-workspace source.
3. Keep `WorkspaceMemberGuard` focused on membership and request context, without policy loading.
4. Implement `PolicyAbilityService` with scope-specific policy loading, placeholder replacement, ability merging, and request-level caching.
5. Implement `PolicyAbilityGuard` to invoke only the scope required by route metadata.
6. Implement `WorkspacePolicyGuard` with route target resolution and workspace authorization checks.
7. Implement `WorkspaceMemberPolicyGuard` with route-parameter precedence and policy-aware target resolution.
8. Rename the generic policy decorator to `PlatformPolicyProtected` and remove `PolicyProtected` call sites.
9. Add action-only `WorkspacePolicyProtected` and `WorkspaceMemberPolicyProtected` decorators with fixed subjects.
10. Add `PolicyDomain.accessibleWhere` for resolved abilities and expose it to HTTP services and resource guards.
11. Add workspace and workspace-member domain/repository methods that combine authorization predicates with mandatory business filters.
12. Update workspace routes and decorators to declare the correct ability scope and specialized guard chain.
13. Update workspace HTTP services to merge authorization predicates into existing pagination `where` values and pass authorized point targets to domains.
14. Remove direct request-ability assumptions from reusable domain methods.
15. Add tests for lazy scope loading, request-level ability caching, fixed decorator subjects, placeholder replacement, unresolved placeholders, route target precedence, arbitrary scalar conditions, relation-aware query conditions, list filtering, and processor calls without request context.

## Acceptance Criteria

- A stored condition is effective after `buildFromPolicies` resolves its available placeholders.
- Endpoints without policy metadata do not load roles or abilities.
- A platform endpoint loads only the authenticated user's platform role policies.
- A workspace endpoint loads only the platform role and current workspace role policies required for that request.
- Repeated policy checks reuse the request-scoped ability instead of rebuilding it.
- A condition never becomes unconditional because a placeholder is missing.
- Workspace and workspace-member routes cannot authorize a synthetic `{ id }` object when policy conditions require other fields.
- A route parameter target cannot be replaced by the acting member stored in request context.
- Every list query combines caller filters and CASL conditions with `AND` semantics.
- Repository callers cannot replace or omit the authorization predicate supplied by the HTTP boundary.
- Domain methods remain callable by processors and automations without a request store or user ability.
- Point operations do not perform an avoidable second target read after the guard has resolved and stored the authorized record.

## Test Plan

### Critical

- Admin workspace read with a condition on `id` resolved from `workspaceId`.
- Workspace read denied when a stored `isPublic` or ownership condition does not match the actual record.
- Workspace-member update and delete use `:workspaceMemberId`, not the acting member id.
- A missing placeholder does not grant access.
- A list query cannot return rows excluded by the CASL predicate.

### High

- Route `where` filters and authorization predicates are combined with `AND`.
- Relation-aware stored conditions are enforced through the policy-aware target query.
- Authorized point targets are reused by the HTTP service and domain.
- Processor and automation domain calls work without HTTP guards or request authorization context.

### Medium

- Workspace policy rules are merged with platform rules without discarding earlier rules.
- Ability loading is limited to the route-declared policy scope.
- Repeated guards and HTTP services reuse the cached request ability.
- `WorkspacePolicyProtected` can only create workspace subject requirements.
- `WorkspaceMemberPolicyProtected` can only create workspace-member subject requirements.
- Platform policy routes use the explicit `PlatformPolicyProtected` name.
- Workspace and workspace-member guard ordering is enforced by route metadata.
- Header-based and `:workspaceId` workspace resolution select the expected target.

### Low

- Every workspace authorization route declares the correct subject and action metadata.
- Policy condition validation rejects unsupported subject fields before policies are stored.
