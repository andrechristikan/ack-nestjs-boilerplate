# CASL v7 Authorization Spec

## Overview

The application uses CASL v7 and `@casl/prisma` to evaluate policy rows stored in PostgreSQL.
Policy rows belong to roles. A request ability combines the role rules available in the request
context, and policy decorators check that ability before the HTTP service runs.

The current implementation has three authorization mechanisms:

- Request guards provide authentication, workspace context, membership context, and project context.
- `PolicyGuard` performs subject/action checks against one request ability.
- HTTP services use `accessibleWhere` for collection queries that need CASL conditions.

Domains remain responsible for business invariants. Repositories remain responsible for Prisma
queries and transactions.

## Scope

The authorization model covers:

- platform, workspace, and project role policies;
- CASL actions and subjects stored in policy rows;
- scalar condition interpolation for request placeholders;
- type-level policy checks through route decorators;
- Prisma predicates for selected collection queries;
- effective-permission responses;
- role and policy administration through the existing platform routes.

It does not provide a general record-level policy guard. Point-record authorization and collection
authorization therefore have different current paths, described below.

## Roles And Policy Rows

Roles have a scope and a key. The supported role scopes are `platform`, `workspace`, and `project`.
Each policy row contains:

| Field | Meaning |
| --- | --- |
| `roleId` | Role owning the rule |
| `subject` | Prisma policy subject |
| `action` | Prisma policy action |
| `conditions` | Optional JSON object interpreted by CASL Prisma |
| `inverted` | Deny rule when true |
| `reason` | Optional denial reason |

Stored policy rows are the source of truth. The ability factory does not mutate persisted rows and
does not derive rules from role names.

The seed catalog defines the platform, workspace, and project role capabilities. Domain rules remain
in force after a policy grants an action. Examples include last-owner protection, self-removal rules,
role-scope validation, immutable platform roles, and project last-admin protection.

## Actions And Subjects

Actions are the generated `EnumPolicyAction` members. `manage` is CASL's wildcard action and is
resolved by CASL for the registered action set.

Subjects are the generated `EnumPolicySubject` members. Type-safe subject subsets are exposed for
platform, workspace, and project policy decorators:

- `EnumPolicyPlatformSubject`
- `EnumPolicyWorkspaceSubject`
- `EnumPolicyProjectSubject`

These subsets constrain decorator call sites. They do not create separate ability types or separate
request ability stores.

## Request Ability

`PolicyAbilityGuard` builds one ability per request and stores it under `PolicyAbilityStoreKey`.
When an ability is already present, the guard reuses it.

The ability input is assembled from request context:

```ts
{
    user: { id, roleId },
    workspace: { id, memberRoleId } | undefined,
    project: { id, memberRoleId: string | null } | undefined,
}
```

The ability domain loads policies for:

1. the authenticated user's platform role;
2. the current workspace member role when workspace and workspace-member context both exist;
3. the current project member role when project context exists and project membership exists.

The resulting rules are combined into one CASL ability. A workspace or project role is not loaded
when its request context is unavailable.

The ability guard requires the authenticated user. It does not resolve route identifiers, load target
records, or perform permission checks.

## Placeholder Resolution

The persisted placeholder catalog currently contains:

| Placeholder | Value supplied by |
| --- | --- |
| `${userId}` | authenticated user context |
| `${workspaceId}` | current workspace context |
| `${projectId}` | current project context |

The factory recognizes placeholder-shaped scalar strings generically and looks them up in the values
provided by the ability domain. It does not maintain a hard-coded condition-field catalog.

Rules with unavailable placeholders are omitted from the built ability. The factory accepts flat JSON
objects whose values are scalar JSON values. Nested objects, arrays, functions, symbols, and undefined
values cause the rule to be omitted. Non-placeholder scalar values remain unchanged.

Allow rules are added before inverted rules so a matching inverted rule is authoritative. Policy
reasons are preserved on inverted rules and are surfaced by `PolicyDomain.assertCan`.

## Enforcement

### Route checks

`PolicyProtected` applies `PolicyAbilityGuard` and `PolicyGuard`, stores the required
`{ subject, action[] }` metadata, and documents the policy error responses.

The public wrappers are:

- `PlatformPolicyProtected`
- `WorkspacePolicyProtected`
- `ProjectPolicyProtected`
- `PolicyAbilityProtected`

The platform, workspace, and project wrappers restrict their subject unions. Internally all policy
requirements use the same metadata key and the same `PolicyGuard`.

`PolicyGuard` reads the stored ability and calls `PolicyDomain.assertCan` for every declared action.
The check passes the subject name, not a loaded record. A route with missing policy metadata raises
the predefined-policy exception. A denied action raises `PolicyForbiddenException` and may include
the inverted rule reason.

`PolicyAbilityProtected` builds the request ability without declaring a policy requirement. It is used
by endpoints such as effective-permission endpoints that need the ability for service logic.

### Context guards

The ordinary context guards have independent responsibilities:

- `UserGuard` stores the authenticated user.
- `WorkspaceGuard` stores the current workspace and enforces workspace existence and boundary rules.
- `WorkspaceMemberGuard` stores the caller's workspace membership and role.
- `ProjectGuard` stores the current project and enforces its workspace boundary.
- `ProjectMemberGuard` stores the caller's project membership and role.

These guards do not load policy rows. Membership guards do not authorize a different target member.

### Collection queries

`PolicyDomain.accessibleWhere` converts the stored ability into a Prisma predicate with
`accessibleBy(ability, action).ofType(subject)`. It returns `null` when the ability has no rules for
the requested action and subject.

`requireAccessibleWhere` raises `PolicyForbiddenException` when no predicate exists. HTTP services
use these methods for policy-filtered collections, including workspace administration lists,
workspace-member lists, and member project lists where the route requires conditional project access.
The resulting predicate is passed to the domain and repository together with business, search, and
pagination filters.

The repository combines policy and business predicates in its Prisma query shape. Policy filters are
not replaced by caller pagination filters.

Every policy-filtered collection query preserves all applicable predicates with `AND` semantics:

- CASL conditions;
- workspace, project, tenant, and active-record boundaries;
- caller search and equality filters;
- pagination and ordering constraints.

Caller-provided filters do not replace or remove the policy predicate.

### Point reads and mutations

The current point-read path loads records through ordinary domain methods using route identifiers or
current context. The policy guard performs the subject/action capability check, while the domain
performs business validation and the repository performs the database operation.

Project-member and workspace-member mutation services load the target member by its route identifier
before calling the domain. Project-member role-update and remove services then read the request
ability and call `PolicyDomain.assertCan` with the loaded target tagged as
`EnumPolicySubject.ProjectMember`. The controller decorator still performs the type-level
`ProjectMember` capability check; the HTTP service performs the record-level check before the domain
mutation. Workspace-member mutations and other point operations remain on the ordinary type-level
path until explicitly extended. The target member is never substituted for the caller's membership
record.

Project create and project-member assignment check the prospective resource fields against the
corresponding `Project:create` and `ProjectMember:create` policies before the domain call. Project
read, update, slug-update, and delete services check the resolved `Project` record with `read`,
`update`, or `delete`. Workspace update, public-visibility update, slug-update, and delete services
check the resolved `Workspace` record with `update` or `delete`. These checks remain HTTP-service
authorization translation; domains continue to own business invariants and remain independent of
request abilities.

Platform admin project and workspace reads load their records through the HTTP service and domain
using the route identifier. Their platform policy decorator supplies the type-level capability check.

## Effective Permissions

`PolicyDomain.getEffectivePermissions` evaluates every generated policy action against each requested
subject and returns only subjects with at least one granted action:

```ts
{
    subject: EnumPolicySubject;
    actions: EnumPolicyAction[];
}
```

Workspace and project permission endpoints build the single request ability, select their configured
subject catalog, and return this shape. The endpoint does not build a second ability.

## Current Operation Model

The current route model is summarized below.

| Operation | Policy path | Additional enforcement |
| --- | --- | --- |
| Platform administration | `PlatformPolicyProtected` | Platform role is part of the request ability |
| Current workspace operations | `WorkspacePolicyProtected` plus HTTP-service record checks for updates/deletes | Workspace and membership guards; domain invariants |
| Workspace-member lists | `WorkspacePolicyProtected` plus service `accessibleWhere` | Workspace boundary and active-member filters |
| Workspace-member role/remove | `WorkspacePolicyProtected` | Target lookup, peer rules, owner rules |
| Current project operations | `ProjectPolicyProtected` plus HTTP-service record checks | Project and membership guards; domain invariants |
| Project lists | `PolicyAbilityProtected` or workspace context plus service ability checks | Membership and policy predicates in list queries |
| Project-member lists | `ProjectPolicyProtected` plus service query logic | Project boundary and membership filters |
| Project-member role/remove | `ProjectPolicyProtected` plus HTTP-service record check | Target lookup, `assertCan` on the target member, peer rules, last-admin rules |
| Workspace/project leave | Context and membership guards | Leave and last-owner/last-admin invariants |
| Effective permissions | `PolicyAbilityProtected` | Service evaluates the stored ability |

## Seeded Capability Model

The seed catalog provides platform rules for platform administration and scoped rules for workspace
and project roles. The role keys and exact policy rows live in the seed data and Prisma enums. The
authorization code treats them as stored policies rather than special-casing role names.

The effective capability model includes these established patterns:

- platform super-admin access is represented by the seeded `manage`/`all` rule;
- platform admin access is represented by platform resource rules;
- workspace owner and admin roles control workspace and workspace-member operations according to
  their seeded rules;
- workspace owner and admin roles can receive project capabilities through workspace-scoped rules;
- project owner, admin, member, and viewer roles receive their seeded project capabilities;
- project creation assigns the project creator the project owner role;
- workspace and project leave operations remain membership and domain concerns.

## Limitations And Deferred Work

The following capabilities are outside the current implementation:

- separate platform, workspace, and project ability stores;
- fixed-scope ability guard classes;
- resource-specific policy guards;
- policy decorators that resolve and store arbitrary target records;
- route-parameter precedence inside a policy guard;
- general record-level `ability.can(action, taggedRecord)` enforcement for every point read and
  mutation;
- automatic `accessibleBy` enforcement for every point read, update, and delete;
- nested condition trees and relation-aware condition interpolation;
- member-instance placeholders such as `${workspaceMemberId}` and `${projectMemberId}`;
- policy-aware atomic mutation predicates for check/write race hardening;
- automatic condition validation against subject-specific field catalogs;
- a policy query adapter for every list endpoint.

These are product and security design gaps, not hidden behavior. Adding them requires extending the
policy contract, the affected route/service/domain flows, and the corresponding tests together.

### Extension contract

Any future record-level authorization feature defines one target-resolution contract for the affected
record family. The contract identifies:

- the target source, such as a route identifier or current context;
- the workspace or project business boundary;
- the not-found and forbidden behavior;
- the request-context key, if the authorized record is reused;
- whether the HTTP service and domain receive the already-resolved record.

The target route identifier remains distinct from the caller's membership identity. A target lookup
does not become a type-level authorization check, and the caller's membership is not substituted for a
different route target.

Future point authorization combines the record identifier, business boundary, and CASL predicate in
the repository query. High-risk mutations can carry the same predicate into the update or delete
operation, or into a transaction, when authorization and mutation need one database boundary. The
current project-member record check is load-then-check-then-write; it does not yet make the policy
check and mutation one database operation.

Future condition support keeps fail-closed behavior for missing context and unresolved placeholders.
Nested conditions, relation predicates, subject-specific validation, and member-instance placeholders
each require explicit Prisma adapter coverage for both allowed and denied records.

Future collection work inventories every policy-sensitive list and verifies predicate composition at
the repository boundary. Future policy-write validation can reject subject, action, and condition
combinations that do not match the role scope before persistence.

Domains remain independent of HTTP authorization state. Processors and automations can call domain
methods without a request ability, while HTTP services remain responsible for translating request
authorization into domain and repository inputs.

## Verification Requirements

The authorization test suite covers:

- ability construction from platform, workspace, and project role rows;
- ability request-context caching;
- generic placeholder interpolation and fail-closed unresolved placeholders;
- allow and inverted rule ordering;
- `PolicyGuard` metadata and action enforcement;
- `PolicyDomain.assertCan`, including the project-member record target path, `accessibleWhere`, and
  effective permissions;
- collection query predicate propagation;
- workspace and project membership invariants around policy-gated mutations;
- role and policy administration behavior.

General record-level CASL enforcement, relation-aware conditions, member-instance placeholders, and
atomic policy-constrained mutations remain verification targets for future implementation work.

Future record-level work verifies:

- actual record fields are used for condition evaluation;
- records outside the current workspace or project boundary are rejected;
- missing or unresolved placeholders never broaden access;
- denied targets follow the documented not-found or forbidden contract;
- authorized targets are not loaded a second time when they are already available;
- collection predicates cannot be overwritten by request filters;
- point mutations retain domain invariants and repository constraints;
- internal domain callers remain independent of HTTP request state;
- policy-constrained mutations use the intended database boundary;
- policy-write validation rejects invalid subject, action, and condition combinations.

Atomic policy-constrained mutations additionally verify that the final update or delete predicate
contains the target identifier, business boundary, and CASL predicate, and that a target becoming
unauthorized between the check and write cannot be mutated successfully.
