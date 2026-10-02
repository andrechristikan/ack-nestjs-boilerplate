# CASL v7 Authorization Implementation Plan

Status: implementation plan

## Table of Contents

- [Purpose](#purpose)
- [Core Decisions](#core-decisions)
  - [Naming Convention](#naming-convention)
  - [Stored Policies Remain the Source of Truth](#stored-policies-remain-the-source-of-truth)
  - [HTTP Services and Authorization Guards Own Request Authorization](#http-services-and-authorization-guards-own-request-authorization)
  - [Authorization Targets Are Real Records for Arbitrary Conditions](#authorization-targets-are-real-records-for-arbitrary-conditions)
- [Guard Responsibilities](#guard-responsibilities)
  - [UserGuard](#userguard)
  - [WorkspaceGuard](#workspaceguard)
  - [WorkspaceMemberGuard](#workspacememberguard)
  - [Ability-Building Guards](#ability-building-guards)
  - [WorkspacePolicyGuard](#workspacepolicyguard)
  - [WorkspaceMemberPolicyGuard](#workspacememberpolicyguard)
  - [ProjectPolicyGuard](#projectpolicyguard)
  - [ProjectMemberPolicyGuard](#projectmemberpolicyguard)
- [Policy Decorators](#policy-decorators)
- [Arbitrary Condition Resolution](#arbitrary-condition-resolution)
  - [Policy-to-Query Path](#policy-to-query-path)
  - [Point Reads and Mutations](#point-reads-and-mutations)
  - [Lists and Pagination](#lists-and-pagination)
- [Route Composition](#route-composition)
- [Repository and Domain Contracts](#repository-and-domain-contracts)
- [Placeholder Contract](#placeholder-contract)
- [Implementation Steps](#implementation-steps)
- [Acceptance Criteria](#acceptance-criteria)
- [Test Plan](#test-plan)
  - [Critical](#critical)
  - [High](#high)
  - [Medium](#medium)
  - [Low](#low)

## Purpose

This plan defines how HTTP authorization will enforce CASL rules whose conditions are stored in the database and may grow beyond the initial workspace and workspace-member scope fields.

The design keeps authorization context at the HTTP boundary. Domains remain reusable by processors, queued jobs, and automations that do not have a request user or a request ability.

## Core Decisions

### Naming Convention

The authorization pipeline has two different guard responsibilities and the names must keep them
separate:

| Guard family | Responsibility | Must not do |
| --- | --- | --- |
| `<Scope>AbilityGuard` | Load role policies, build a CASL ability, and store it under the scope-specific request key | Check a requested permission or resolve an authorization target |
| `PolicyGuard` and `<Resource>PolicyGuard` | Read a previously stored ability and check requested actions against a subject or real record | Load role policies or build an ability |
| `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberGuard`, `ProjectGuard`, `ProjectMemberGuard` | Resolve authentication, boundary records, and acting memberships | Load policies or authorize a policy target |

The concrete ability-building guards are therefore named `PlatformAbilityGuard`,
`WorkspaceAbilityGuard`, and `ProjectAbilityGuard`. The existing `PolicyGuard`,
`WorkspacePolicyGuard`, `WorkspaceMemberPolicyGuard`, `ProjectPolicyGuard`, and
`ProjectMemberPolicyGuard` remain the policy-checking family. `Policy` describes the permission
contract being checked; `Ability` describes the CASL object being created.

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

The request stores one ability per policy scope. The keys are independent:

```ts
PlatformPolicyAbilityStoreKey
WorkspacePolicyAbilityStoreKey
ProjectPolicyAbilityStoreKey
```

An ability-building guard writes only its own key. A policy-checking guard reads only the key for the scope it
enforces. No loader falls back to, replaces, or merges a previously stored ability.

### HTTP services and authorization guards own request authorization

The request flow is:

```text
UserGuard
  -> WorkspaceGuard
  -> WorkspaceMemberGuard
  -> ProjectGuard
  -> ProjectMemberGuard
  -> one or more scope-specific ability guards selected by the policy decorator
  -> matching policy-checking guard
  -> HTTP service
  -> Domain
  -> Repository
```

Each ability-building guard has one fixed role scope and one responsibility. `PlatformAbilityGuard` loads platform-role policies, `WorkspaceAbilityGuard` loads workspace-role policies, and `ProjectAbilityGuard` loads project-role policies. They build the request ability and store it under their respective scope key; they do not authorize a resource.

`WorkspaceMemberProtected` and `ProjectMemberProtected` remain membership and request-context decorators. Policy decorators compose the ability-building guard and policy-checking guard for their fixed scope. A route may hold more than one named ability, but every policy-checking guard declares which key it consumes. Platform admin resource routes use explicit platform-resource decorators; ordinary workspace/project policy decorators never silently fall back to platform permissions. A processor or automation calls the domain directly and is not required to construct an HTTP ability.

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

### Ability-building guards

The ability-building guards are deliberately separate so each class has a fixed scope and a small request-context contract. Each guard caches only its own named ability key. Different scopes may therefore coexist in one request without overwriting one another.

`PlatformAbilityGuard` requires the authenticated user and loads the user's platform-role policies for `EnumRoleScope.platform`. It does not inspect route parameters or resolve workspace/project identifiers.

`WorkspaceAbilityGuard` requires the authenticated user, workspace, and acting workspace member. Its ability contains the platform and acting workspace role layers, resolved with the workspace placeholders.

`ProjectAbilityGuard` requires the authenticated user, workspace, acting workspace member, and project; it also consumes the optional acting project member when present. Its ability contains the platform, workspace, and optional project-member role layers. Optional project membership leaves the project role unavailable while keeping the guard usable for workspace-authorized project operations.

The ability-building guards do not authorize subjects or resolve target records. The corresponding `*PolicyGuard` performs permission checks after the fixed-scope ability is available. Policy retrieval and ability construction are delegated to a reusable `PolicyAbilityDomain`, while each guard remains the HTTP pipeline adapter.

### WorkspacePolicyGuard

`WorkspacePolicyGuard` is the workspace policy boundary and is responsible only for workspace record checks. It reads the workspace ability key for user routes. Platform-admin routes use a separate explicit platform-workspace policy decorator/checking composition that reads the platform ability key.

1. Read the required action and subject metadata.
2. Resolve the workspace identifier from `request.params.workspaceId`, falling back to `WorkspaceStoreKey`.
3. Read the workspace ability supplied by the route composition.
4. Check whether the current user can perform the action on the resolved workspace record. If arbitrary relation conditions are supported for `Workspace`, use a policy-aware target query instead of a partial synthetic subject.

Platform-admin workspace routes do not invoke the workspace-scoped guard. Their explicit platform-workspace policy composition resolves the target workspace and checks it with the platform ability.

### WorkspaceMemberPolicyGuard

`WorkspaceMemberPolicyGuard` is the target-member policy boundary. It reads only the workspace ability, while the guard itself only consumes the stored ability.

1. Read the required action and subject metadata.
2. Read the already-built workspace-member ability.
3. Resolve the target member identifier from `request.params.workspaceMemberId`.
4. When the parameter is absent, use the member stored under `WorkspaceMemberStoreKey`.
5. Resolve the target within the current workspace and active-member business boundary.
6. Apply the ability's CASL predicate to the target query.
7. Store the authorized target for the HTTP service and controller path.
8. Check whether the current user can perform the action on the target member.

The route parameter always wins over the acting member context. This prevents an update or delete endpoint from checking the caller's membership while acting on another member.

### ProjectPolicyGuard

`ProjectPolicyGuard` is the project policy boundary and is responsible only for project record checks. It reads only the project ability. Platform-admin project routes use an explicit platform-project policy composition when a concrete project target must be checked.

1. Read the required action metadata.
2. Read the stored project ability.
3. Read the project record from `ProjectStoreKey`.
4. Tag the record as a project subject and check every required action.

The guard does not load project policies, resolve project membership, or authorize against a synthetic route object.

### ProjectMemberPolicyGuard

`ProjectMemberPolicyGuard` is the target project-member policy boundary. It reads only the project ability, while the guard itself only consumes the stored ability.

1. Read the required action metadata.
2. Read the stored project ability.
3. Resolve `:projectMemberId`. A route with no target parameter (assign) has no target record, so every required action is checked as a subject-type check and no target is stored.
4. Resolve the target inside the current project and active-member business boundary.
5. Apply the ability's CASL predicate to the target query.
6. Store the authorized target for the HTTP service and controller path.
7. Check every required action against the authorized target.

The route parameter is the only target source; the acting project member is never substituted for it.

## Policy Decorators

Policy decorators declare the required action and fixed subject. Each decorator also fixes the ability key consumed by its policy-checking guard. Specialized decorators fix their subject and accept only actions:

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
    action: [EnumPolicyAction.read],
    subject: EnumPolicySubject.User,
})
```

`PlatformPolicyProtected` composes `PlatformAbilityGuard` and delegates subject evaluation to the generic `PolicyGuard`. `WorkspacePolicyProtected` composes `WorkspaceAbilityGuard` and `WorkspacePolicyGuard` for workspace-scoped routes. `ProjectPolicyProtected` composes `ProjectAbilityGuard` and `ProjectPolicyGuard` for project-scoped routes. Their member-policy counterparts use the same scope-specific ability guard with the corresponding member policy guard. Admin resource routes use explicit platform-resource decorators, such as `PlatformWorkspacePolicyProtected` and `PlatformProjectPolicyProtected`, which compose the platform ability loader with policy checking that reads the platform ability key. There is no implicit fallback between ability scopes.

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
        where,
    ],
}
```

The repository receives the policy predicate as the generic `where` input and combines it with mandatory business constraints. Caller-provided search and pagination filters remain separate from this protected query input, so they cannot replace or remove the policy predicate.

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
| Current workspace record | `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberProtected`, `WorkspacePolicyProtected`, `WorkspacePolicyGuard` | Workspace record |
| Workspace member record | `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberProtected`, `WorkspaceMemberPolicyProtected`, `WorkspaceMemberPolicyGuard` | Target member record |
| Admin workspace record | `UserGuard`, `PlatformWorkspacePolicyProtected` | Workspace record with platform ability |
| Current project record | `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberProtected`, `ProjectProtected`, `ProjectPolicyProtected`, `ProjectPolicyGuard` | Project record |
| Project member record | `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberProtected`, `ProjectMemberProtected`, `ProjectMemberPolicyProtected`, `ProjectMemberPolicyGuard` | Target project-member record |
| Admin project record | `UserGuard`, `PlatformProjectPolicyProtected` | Project record with platform ability |
| Workspace list | `UserGuard`, `PlatformPolicyProtected` or the workspace boundary decorator | `accessibleWhere` merged into pagination `where` |
| Workspace member list | `UserGuard`, `WorkspaceGuard`, `WorkspaceMemberProtected`, `WorkspaceSubjectPolicyProtected`, `PolicyGuard` | `accessibleWhere` merged into pagination `where` |

Generic `PolicyGuard` remains suitable for subject-type checks and routes without a resource target. `PlatformPolicyProtected` supplies its platform ability. Specialized resource decorators and guards own fixed-subject target resolution and condition-aware enforcement. A `*PolicyProtected` decorator does not silently choose or merge another ability scope.

## Repository and Domain Contracts

Reuse the existing subject-specific repository methods and extend their query inputs with a generic `where` predicate. Each method combines that predicate with its mandatory business constraints.

Examples:

```ts
findByIdAndWorkspace(
    workspaceMemberId: string,
    workspaceId: string,
    where?: Prisma.WorkspaceMemberWhereInput
): Promise<WorkspaceMember | null>
```

```ts
findWithPaginationOffsetForAdmin(
    params: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
    where?: Prisma.WorkspaceWhereInput,
    isPublic?: Record<string, IPaginationEqual>
): Promise<IResponsePaginationReturn<Workspace>>
```

`findByIdAndWorkspace` retains the fixed workspace-member lookup and adds the supplied `where` predicate to its `AND` conditions. `findWithPaginationOffsetForAdmin` keeps the existing pagination input; its destructured pagination filter can be named `filters` internally, while the separate generic `where` input carries the policy predicate. The repository remains the only layer that knows the final Prisma query shape.

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
| `projectId` | `ProjectGuard` and every descendant | Resolved project |
| `projectMemberId` | `ProjectMemberGuard` and every descendant | Acting project member |
| Future placeholders | Their owning boundary only | Never inferred from arbitrary request input |

The matching scope-specific ability-building guard calls `buildFromPolicies` after the required context is available. `PlatformAbilityGuard` uses only the authenticated user and never resolves `workspaceId` or `projectId` from route parameters. Workspace and project loaders receive their boundary records from the corresponding guards. `WorkspacePolicyGuard`, `WorkspaceMemberPolicyGuard`, `ProjectPolicyGuard`, and `ProjectMemberPolicyGuard` consume their designated ability and never rebuild it with a target identifier. A target identifier is a resource selector, not the identity of the acting member.

If a future placeholder is unavailable, the rule is not made unconditional. It remains unresolved and the ability factory's fail-closed behavior applies.

## Implementation Steps

1. Add request-store keys and target decorators for authorized workspace, workspace-member, project, and project-member records.
2. Update `WorkspaceGuard` to prefer `:workspaceId` over the configured current-workspace source.
3. Keep `WorkspaceMemberGuard` and `ProjectMemberGuard` focused on membership and request context; policy decorators own ability loading.
4. Implement `PolicyAbilityDomain` with exact-scope policy loading, placeholder replacement, and ability construction.
5. Implement `PlatformAbilityGuard`, `WorkspaceAbilityGuard`, and `ProjectAbilityGuard` as fixed-scope ability loaders with independent request-store keys.
6. Implement workspace and project policy guards as policy-checking guards that consume stored abilities.
7. Implement member policy guards with route-parameter precedence and policy-aware target resolution.
8. Compose the matching ability loader into workspace, workspace-member, project, and project-member policy decorators.
9. Add explicit platform-workspace and platform-project resource decorators for admin target checks.
10. Add action-only workspace, workspace-member, project, and project-member policy decorators with fixed subjects.
11. Add `PolicyDomain.accessibleWhere` for resolved abilities and expose it to HTTP services and resource guards.
12. Add workspace, workspace-member, project, and project-member domain/repository methods that combine authorization predicates with mandatory business filters.
13. Update workspace and project routes to use explicit user-scoped or platform-scoped resource decorators.
14. Update HTTP services to merge authorization predicates into existing pagination `where` values and pass authorized point targets to domains.
15. Remove direct request-ability assumptions from reusable domain methods.
16. Add tests for exact-scope loading, request-level ability caching, fixed decorator subjects, placeholder replacement, unresolved placeholders, route target precedence, arbitrary scalar conditions, relation-aware query conditions, list filtering, decorator dependency composition, and processor calls without request context.

## Acceptance Criteria

- A stored condition is effective after `buildFromPolicies` resolves its available placeholders.
- Routes without a policy or membership boundary do not load roles or abilities.
- A platform endpoint loads only the authenticated user's platform role policies.
- A workspace ability guard loads the platform and current workspace role layers into the workspace ability key.
- A project ability guard loads the platform, workspace, and available project-member role layers into the project ability key.
- Repeated execution reuses only the ability stored under that guard's own key.
- `WorkspaceMemberProtected` and `ProjectMemberProtected` remain membership-only decorators.
- Workspace and project policy decorators select the matching ability loader.
- Abilities from different scopes coexist in request context and never overwrite one another.
- Platform admin resource routes load and enforce through explicit platform-resource decorators.
- A condition never becomes unconditional because a placeholder is missing.
- Workspace and workspace-member routes cannot authorize a synthetic `{ id }` object when policy conditions require other fields.
- A route parameter target cannot be replaced by the acting member stored in request context.
- Every list query combines caller filters and CASL conditions with `AND` semantics.
- Repository callers cannot replace or omit the generic `where` predicate supplied by the HTTP boundary.
- Domain methods remain callable by processors and automations without a request store or user ability.
- Point operations do not perform an avoidable second target read after the guard has resolved and stored the authorized record.

## Test Plan

### Critical

- Admin workspace read with a platform condition evaluated against the resolved workspace record.
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

- Each ability guard loads only its exact role scope.
- Repeated ability guards reuse their own cached ability without overwriting another scope.
- Policy-checking guards do not load policies or rebuild abilities.
- `WorkspaceMemberProtected` and `ProjectMemberProtected` remain membership-only.
- Workspace and project policy decorators compose the matching ability-building guard and policy-checking guard.
- `WorkspacePolicyProtected` can only create workspace subject requirements.
- `WorkspaceMemberPolicyProtected` can only create workspace-member subject requirements.
- `ProjectPolicyProtected` can only create project subject requirements.
- `ProjectMemberPolicyProtected` can only create project-member subject requirements.
- Platform policy routes use the explicit `PlatformPolicyProtected` name.
- Workspace and project ability-loader and policy-guard ordering is enforced by decorator composition.
- Header-based and `:workspaceId` workspace resolution select the expected target.

### Low

- Every workspace authorization route declares the correct subject and action metadata.
- Policy condition validation rejects unsupported subject fields before policies are stored.
