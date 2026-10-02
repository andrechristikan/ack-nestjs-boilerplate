# CASL v7 Authorization Spec

## Table of Contents

- [Overview & Scope](#overview--scope)
- [Goals & Non-Goals](#goals--non-goals)
- [Authorization Model](#authorization-model)
  - [Boundary Composition](#boundary-composition)
  - [Scoped Roles](#scoped-roles)
  - [Actions](#actions)
  - [Subjects](#subjects)
  - [Scoping Placeholder Conventions](#scoping-placeholder-conventions)
- [Stored Rule Contract](#stored-rule-contract)
- [Conditions to Prisma](#conditions-to-prisma)
  - [Runtime validation boundaries](#runtime-validation-boundaries)
- [Ability Lifecycle](#ability-lifecycle)
- [Enforcement Layers](#enforcement-layers)
  - [Guard Layer](#guard-layer)
  - [HTTP Service Layer](#http-service-layer)
  - [Alternatives Considered](#alternatives-considered)
- [Effective Permissions Endpoint](#effective-permissions-endpoint)
- [Policy Matrix & Default Scoped Role Rules](#policy-matrix--default-scoped-role-rules)
- [Initial Seed Rules](#initial-seed-rules)
- [Resolved Decisions](#resolved-decisions)
- [Test Plan](#test-plan)

## Overview & Scope

The system defines a CASL v7 authorization model over PostgreSQL and Prisma. It covers platform
roles, workspace and project boundaries, stored rule evaluation, record-level object checks, and
Prisma query filtering. Fixed-scope ability guards build the request ability, policy enforcement
guards gate each route and authorize target records, HTTP services apply the ability's query
predicates to collections, domains own business orchestration, and repositories own Prisma query
shapes.

The model uses `@casl/ability@7.0.1` and `@casl/prisma@2.0.2`. `createPrismaAbility` builds the
ability in the Prisma `WhereInput` dialect, and `accessibleBy(ability, action).ofType(Model)`
turns a rule set into a per-model `WhereInput`.

Authorization is enforced through ability guards, enforcement guards, and an HTTP-service query layer:

- **Type-level** — `PolicyGuard` calls `ability.can(action, subject)` with no record, answering
  "could this role ever do this?" in O(1). CASL does not consult a rule's conditions on a
  type-level check
  ([`@casl/ability` `Rule.ts`](https://github.com/stalniy/casl/blob/master/packages/casl-ability/src/Rule.ts)
  evaluates conditions only against an instance). `@PlatformPolicyProtected` and
  `@WorkspaceSubjectPolicyProtected` routes run this gate.
- **Record-level** — the workspace, workspace-member, project, and project-member enforcement
  guards resolve the target record and evaluate `ability.can(action,
  PolicyUtil.toSubject(subject, record))`, which evaluates stored conditions against the record.
  Member targets load through `PolicyDomain.requireAccessibleWhere`, so a record the ability does
  not reach reads as not found. Prisma returns class-less plain objects, so tagging records with
  `PolicyUtil.toSubject(subject, record)` is mandatory for CASL to select the right rules.
- **Query-level** — HTTP services generate `accessibleBy(...).ofType(Model)` predicates through
  `PolicyDomain.accessibleWhere` and `requireAccessibleWhere` for policy-controlled collection
  queries and pass them to the domain as an optional generic `where`, which the repository
  AND-composes with its mandatory constraints.

Domains remain reusable by processors, automations, and other modules that do not have an HTTP
request authorization context. They receive authorized inputs from HTTP services and do not read
request authorization state implicitly. Internal callers use trusted domain paths unless they
explicitly reconstruct a user authorization context.

Policies persist as rows related to a `Role`. Each row is one full CASL rule — subject, action
array, conditions, inversion, reason — which the existing one-subject-per-row table cannot
represent, so the model includes the Prisma schema migration, client generation, seed update, and
the affected role/policy DTOs. The `policy.admin.controller.ts` and `policy.system.controller.ts`
routes and their request/response DTO shapes are unchanged: the rule contract is richer, but the
HTTP surface for reading and writing a role's policies is the same set of endpoints. The
Request context stores the authenticated user without role policy rows. The resolved CASL ability is
the request authorization value consumed by guards and HTTP services; raw policy rows remain inside the
role/member data used while the guards compose that ability.

## Goals & Non-Goals

**Goals**

- Store complete CASL rules with allow and deny semantics.
- Evaluate one request-scoped ability consistently in guards and HTTP services.
- Preserve the workspace and project guards as resource-boundary checks.
- Validate persisted rules, conditions, and placeholders before storage.
- Give every permission-controlled operation an explicit subject/action pair.
- Keep role, policy, workspace, and project behavior covered by focused unit tests.

**Non-Goals**

- Replace authentication, feature flags, term-policy gates, or workspace/project membership guards.
- Add a second authorization language beside CASL.
- Infer authorization from route names or HTTP verbs.
- Add unrestricted JSON conditions or arbitrary request placeholders.
- Restrict rules to individual fields. Field-level permissions can extend the rule contract later.
- Allow workspaces or projects to create, update, or delete their own roles.

## Authorization Model

### Boundary Composition

Platform roles and workspace/project memberships describe different dimensions of authority.

- Admin-scope routes use `@PlatformPolicyProtected()`. A route narrowed to a workspace or project accepts
  a validated path id and does not read `x-workspace-id`.
- User and shared workspace routes keep `@WorkspaceProtected()` and the membership-resolving
  `@WorkspaceMemberProtected()` form as the workspace boundary. Project routes keep
  `@ProjectProtected()` and `@ProjectMemberProtected()`.
- CASL adds capability and record decisions after those guards establish the caller and
  workspace/project context. The policy enforcement guards own request-scoped CASL checks, and CASL
  does not turn a cross-workspace project into an accessible record.
- Workspace-owner project authority is expressed by the owner's workspace-role rules. It stays
  constrained to the active workspace and does not become a global project permission.

### Scoped Roles

`EnumWorkspaceMemberRole`, `EnumProjectMemberRole`, and `EnumRoleType` are removed — retaining any
of them as a route or domain gate would leave a second authorization system in place. Built-in
roles use immutable keys such as `superAdmin`, `admin`, `user`, `owner`, `member`, and `viewer`.
`scope` and `key` identify a role; the key does not grant permission by itself.

The `Role` model is the common policy parent for `platform`, `workspace`, and `project` scopes.
Sharing the model is appropriate because every role is the same concept: a named, assignable
collection of CASL rules. Workspace roles are assignable only to workspace members, project roles
only to project members, and platform roles only to users. `Policy` points to `Role`, so all
scopes use the same rule persistence and evaluation path.

The Prisma shape is:

```prisma
model Role {
  id          String        @id @default(dbgenerated("uuidv7()")) @db.Uuid
  scope       EnumRoleScope
  key         String
  name        String
  description String?

  policies         Policy[]           @relation("RolePolicy")
  users            User[]             @relation("UserRole")
  workspaceMembers WorkspaceMember[] @relation("WorkspaceMemberRole")
  projectMembers   ProjectMember[]    @relation("ProjectMemberRole")

  createdAt DateTime @default(now())
  createdBy String?  @db.Uuid
  updatedAt DateTime @updatedAt
  updatedBy String?  @db.Uuid

  @@unique(fields: [scope, key])
  @@index(fields: [scope, createdAt(sort: Desc)])
  @@map("roles")
}

enum EnumRoleScope {
  platform
  workspace
  project
}
```

The role catalog is fixed and seeded once:

- Platform: `superAdmin`, `admin`, `user`.
- Workspace: `owner`, `admin`, `member`.
- Project: `owner`, `admin`, `member`, `viewer`.

`@@unique([scope, key])` permits the same readable key in different scopes while keeping each
seeded role unambiguous. Assignment domains validate the expected scope before writing
`User.roleId`, `WorkspaceMember.roleId`, or `ProjectMember.roleId`. Role keys and scopes are
immutable because domains use them for assignment validation and ownership invariants.

Only platform administrators update role display metadata or policy rows. Role creation and
deletion are not exposed, and workspace/project administrators have no role or policy
administration endpoints. A policy update changes the preset for every assignment using the role.
Workspace-owned custom roles remain a future schema and API extension.

`WorkspaceMember.role` becomes `roleId` with a relation to a workspace-scoped role;
`ProjectMember.role` becomes `roleId` with a relation to a project-scoped role. The role resolver
validates the expected workspace or project scope before the role enters request storage.
`WorkspaceInvite.workspaceRole` and `WorkspaceInvite.projectRole` become `workspaceRoleId` and
`projectRoleId`; invite creation validates both role scopes before storing the invitation, and
invite claim repeats the validation inside the membership transaction.

Ownership transfer, last-owner protection, peer management, and role-scope validation remain domain
invariants.

### Actions

Not every route, feature, or Prisma model needs a policy subject. A subject is an explicit
authorization resource or capability boundary, not an inventory of HTTP routes or database tables.
Health checks, hello/demo endpoints, country data, and notifications carry no subject or
permission; their existing authentication, public-route, feature-flag, or domain rules remain
authoritative. A future product requirement may add a subject deliberately; it must not be
inferred merely from the existence of a controller or model.

`manage` is CASL's literal, unbounded wildcard action. `all` is CASL's only wildcard subject;
`manage` with `all` is the super-admin rule, not editable through the role-policy API, and `all`
accepts no other action. `manage` on any other subject, such as `WorkspaceMember`, is the same
unbounded wildcard: building the ability passes a stored `manage` rule straight to
`createPrismaAbility`, and no per-subject action list is consulted when the ability is built.

Every subject uses one action vocabulary, `EnumPolicyAction { manage, read, create, update,
delete }`, stored in `Policy.action` as a typed Prisma enum array. There are no per-subject
workflow enums: a domain operation maps to a CRUD verb, or to `manage`/`update` when it is a
privileged or status-transition action that must not be granted piecemeal.

The table below lists the actions the seeded rules use for each subject. It documents intent, not an
enforced catalog; nothing in the policy write path checks a rule's action against this table:

| Subject                | Actions in use                                   | Operations covered                                                             |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `Workspace`            | `read`, `update`, `delete`, `manage`            | ownership transfer requires `update`; `manage` grants every action on the subject |
| `WorkspaceMember`      | `read`, `update`, `delete`, `manage`            | member list, role change, member removal                |
| `WorkspaceInvite`      | `create`, `update`, `delete`, `manage`          | `update` resends a pending invite; `delete` revokes it |
| `WorkspaceJoinRequest` | `update`, `manage`                              | accept and reject                                   |
| `Project`              | `read`, `create`, `update`, `delete`, `manage`  | project lifecycle                      |
| `ProjectMember`        | `create`, `update`, `delete`, `manage`          | `create` assigns a member; role change; member removal   |
| `analytic`            | `read`                                           | analytics dashboards, platform-wide (admin routes) and workspace (user routes) |
| platform/admin resource subjects | every `EnumPolicyAction`               | `ActivityLog`, `ApiKey`, `Device`, `FeatureFlag`, `PasswordHistory`, `Role`, `Session`, `TermPolicy`, `User` (the admin controllers' CRUD, no tenant scope) |

**`manage` is unbounded on every subject, including a specific one.** A stored `manage` rule
reaches `createPrismaAbility` as CASL's literal wildcard action, whatever subject it names:
`manage` on `WorkspaceMember` authorizes every action CASL evaluates against that subject, not a
bounded subset. The `all` subject carries the same wildcard, so the super-admin `manage`/`all`
rule and a scoped role's `manage` rule on one subject are evaluated the same way (see
[Ability Lifecycle](#ability-lifecycle)). The `owner` roles hold `manage` on the subjects they fully
control; `admin` roles keep explicit CRUD so a specific action (most notably `delete`) can be
withheld, covered in
[Policy Matrix & Default Scoped Role Rules](#policy-matrix--default-scoped-role-rules).

`update` on `Workspace` covers name, description, visibility, and slug changes. `update` on
`Project` covers name, description, and slug changes. These operations receive separate actions only
when the product needs different grants.

The following operations require **no CASL permission** and enforce no subject or action — the domains
still enforce identity, membership, last-owner, and related invariants:

- Workspace `list`, `create`, `leave`, and `switch`. Every authenticated user may perform them, and
  each only ever touches workspaces the caller has access to.
- Workspace invite `list` and workspace join-request `list`. Membership in the workspace is the
  gate.
- Project `list`. Membership in the workspace is the gate. The project list result set is filtered
  by visibility as a query concern.
- Project member `leave`. Every project member may leave; the domain enforces last-admin-style
  invariants.
- Workspace invite `claim`. The invite token and the authenticated caller are both required.
- Workspace join-request `create`. The domain verifies the target workspace is public and the
  caller is not already a member.

### Subjects

`EnumPolicySubject` is the full v1 registry — every subject the policy decorators name across the 16
admin/user controllers, not a workspace/project-only subset:

```text
all                                             # CASL wildcard subject
ActivityLog  ApiKey  Device  FeatureFlag        # platform/admin resource subjects
PasswordHistory  Role  Session  TermPolicy  User
Workspace  WorkspaceMember  WorkspaceInvite  WorkspaceJoinRequest
Project  ProjectMember
analytic                                        # capability subject, model: null, workspace-scoped
```

The platform/admin resource subjects back the admin controllers' CRUD (`Role`, `User`, `ApiKey`,
`Device`, `Session`, `ActivityLog`, `PasswordHistory`, `TermPolicy`, `FeatureFlag`) — roughly 75
`@PlatformPolicyProtected` applications. They are load-bearing v1 subjects: platform-admin policies grant
them every `EnumPolicyAction` with no tenant scope.

Subjects may map to a persisted resource, a relation-backed resource, or a virtual capability such
as `analytic`; a subject need not be a one-to-one Prisma model. Persisted subjects use the
Prisma model names, and the virtual subjects `all` and `analytic` are lowercase, rather than
colon-delimited values. For example, `WorkspaceInvite` maps directly to the `WorkspaceInvite` model;
`workspace:invite` would require an additional enum-to-model translation without changing the
boundary.

Subject-to-model adaptation happens at the CASL boundary. Persisted subjects remain in application
vocabulary, while `PolicyUtil.toSubject(subject, record)` tags Prisma plain objects with the
corresponding CASL subject for conditional checks.
The subject list is the authorization catalog; it does not carry a second scope registry. Role-scope
alignment comes from the seeded rules and from role-assignment domain checks, not from policy writes.

Workspace and project subjects carry conditions tying a stored rule to the active boundary (see
[Scoping Placeholder Conventions](#scoping-placeholder-conventions)).

The persisted enum subject is kept in application vocabulary. Conditional Prisma records are tagged
with `PolicyUtil.toSubject` before an instance check, while virtual subjects such as `all` and
`analytic` are evaluated by name. Operations without a subject carry no policy rule; their
membership and visibility checks remain domain or repository concerns.

The `Workspace` and `Project` subjects are distinguished operationally: their active records are
resolved and cached in the request store (`WorkspaceStoreKey`/`ProjectStoreKey`) by
`WorkspaceGuard`/`ProjectGuard`, which run before the policy guards. Those boundary guards establish
resource context; `PolicyGuard` performs the type-level policy check, while the record enforcement
guards perform record-level checks for the targets they load through the domains (see [Enforcement Layers](#enforcement-layers)).

### Scoping Placeholder Conventions

Every workspace-scoped and project-scoped subject rule carries the placeholder condition tying it
to the boundary where the role was assigned. This is normative:

- These rules bind rules held by **workspace and project roles**. Platform-role rules are exempt
  from the mandatory scope pair.
- Every **workspace-scoped** subject (`Workspace`, `WorkspaceMember`, `WorkspaceInvite`,
  `WorkspaceJoinRequest`) rule held by a workspace role MUST include a `workspaceId` key (`id` for
  the `Workspace` subject itself) resolved from `${workspaceId}`, populated from the request's
  `x-workspace-id` header on user and shared routes and from the validated `:workspaceId` path
  param on admin routes.
- Every project subject rule other than a bare `Project:create` carries a fixed scope pair: `id`
  resolved from `${projectId}` for `Project`, `projectId` resolved from `${projectId}` for
  `ProjectMember`. The pair is the same whether a workspace role or a project role holds the rule;
  `${projectId}` populates from the request's `:projectId`
  route param, so the rule matches only while a project route resolved that path.
- A bare `Project:create` rule (the single action `create`, nothing else) carries no scope
  condition, since no project exists yet to scope to. The create check evaluates the incoming
  project's own attributes before persistence.
- Conditions are generated and processed in three steps:
  1. Seed helpers build stored conditions explicitly. Workspace-scoped rules use
     `{ "workspaceId": "${workspaceId}" }`; project-scoped rules use either
     `{ "id": "${projectId}" }` or `{ "projectId": "${projectId}" }`. A bare `Project:create`
     rule has no condition.
  2. Policy writes do not check whether a rule's subject, actions, or conditions match the role's
     scope. Condition keys and operators are stored as provided by the trusted policy author.
  3. At request time `PolicyAbilityFactory` replaces the placeholder with the resolved id, so CASL
     receives `{ "workspaceId": "<uuid>" }`. Nothing is injected
     implicitly: the stored rule is the single source of truth, and `accessibleWhere` reuses the same
     condition.
- `ProjectMember:create` carries the `projectId` scope condition and no member-instance condition:
  holding the permission means "can assign any member in the permitted project."
- Operations without a subject (see [Actions](#actions)) need no entry here: they carry no action, so
  they have no condition to validate.

The canonical placeholder tokens are:

- `${userId}` — record-level ownership rules like `{ "userId": "${userId}" }`.
- `${workspaceId}` — every workspace-scoped condition.
- `${projectId}` — every project-scoped condition.
- `${workspaceMemberId}` — a workspace-member instance condition when the membership guard has
  established that context.
- `${projectMemberId}` — a project-member instance condition when the membership guard has
  established that context.

## Stored Rule Contract

One policy row represents one CASL rule: one subject, one or more actions, optional conditions, an
optional inversion, and optional explanatory reason metadata. The v1 contract deliberately has no
priority or field-level permission metadata.

```ts
interface IPolicyRuleStorage {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
    conditions: Prisma.JsonValue | null;
    inverted: boolean;
    reason: string | null;
}
```

`action` is `EnumPolicyAction[]` — the single action vocabulary from [Actions](#actions) keeps the
column a typed Prisma enum array; no `String[]` migration is needed. Every structurally valid
(subject, action, condition) combination is stored as given. Conditions are trusted JSON in v1,
passed through to CASL after placeholder resolution.

The Prisma `Policy` model keeps `action EnumPolicyAction[]` and gains `conditions Json?`,
`inverted Boolean @default(false)`, and `reason String?`. The old subject uniqueness is replaced with
an index on `[roleId, subject]`, allowing multiple rules for the same subject.

**Composition order is deterministic** (stated here once; referenced elsewhere): platform rules are
added first, workspace rules second, project rules third. Within the composed set, allow rules are
added before inverted rules, so an inverted rule is authoritative whenever it matches (last matching
rule wins). An absent narrower rule does not revoke a broader allow; a narrowing role uses an
explicit inverted rule.

The role-policy API exposes a rule request DTO with one subject, an action array, optional
conditions, an optional inverted flag, and an optional reason. The existing single-row endpoints
retain these semantics through the create and update DTOs.

## Conditions to Prisma

Persisted conditions use the Prisma `WhereInput` dialect for the subject's model — not Mongo
operators or dotted paths. An ownership rule is stored as:

```json
{
    "userId": "${userId}"
}
```

A condition on a relation MUST name an operator — `@casl/prisma`'s runtime interpreter requires
`is`/`isNot`/`some`/`none`/`every` on any relation path and throws `ParsingQueryError` otherwise:

```json
{
    "role": {
        "is": {
            "scope": "platform",
            "key": { "not": "superAdmin" }
        }
    }
}
```

Two further interpreter caveats bind future condition authors: equality of a JSON column and
equality of a list/array column are not implemented — use the list operators
`has`/`hasSome`/`hasEvery` for array columns instead of a bare equality.

`PolicyAbilityFactory` traverses condition objects and arrays, replacing recognized complete string
values from the placeholder list in
[Scoping Placeholder Conventions](#scoping-placeholder-conventions). Other condition strings remain
unchanged. The policy author is responsible for supplying a condition the target Prisma `WhereInput`
and CASL adapter can evaluate. Conditions are JSON data, not executable expressions.

The ability is built with `createPrismaAbility` in the Prisma `WhereInput` dialect, allow rules
before inverted rules per the composition order in
[Stored Rule Contract](#stored-rule-contract). Query filtering reads that ability through
`accessibleBy(ability, action).ofType(Prisma.ModelName.X)` — the `@casl/prisma@2.0.2` API, not the
older `accessibleBy(ability, action)[modelName]` bracket form. `PolicyDomain.accessibleWhere` wraps
`.ofType(...)`; HTTP services pass its result to the domain as the generic `where`, and repository
queries compose that result with business predicates through `AND` (active-row and workspace/project
predicates), never spreading an authorization filter into another `where` object.

**`createCaslExtension()` fail-closed** (stated here once): a denied ability makes `.ofType(...)`
return a special empty condition. Raw Prisma rejects it (it carries an internal marker field), so
the Prisma Client is extended with `createCaslExtension()`, which maps that empty condition to
"matches nothing" — denied list access returns `[]` instead of throwing. Point-operation checks use
the tagged record in the HTTP service when a precise forbidden response is required. Registering the
extension is what makes collection authorization fail closed rather than fail loud.

Object checks tag the loaded record with `PolicyUtil.toSubject(subject, record)`, producing a typed
CASL subject from the Prisma plain object. Because Prisma returns class-less objects, this tagging
is mandatory: CASL cannot detect the subject type by `constructor` and would otherwise match no
conditional rule.

### Runtime validation boundaries

The CASL Prisma adapter translates conditions into a Prisma-shaped `where` object through
`accessibleBy(ability, action).ofType(subject)`. It validates the condition language that CASL
understands, including unsupported operators, invalid operator values, malformed logical structures,
and invalid relation-condition shapes.

The adapter does not have enough runtime schema information to reliably detect an unknown Prisma
field. A misspelled field such as `workpaceId` can be translated into a matching `where` key and is
usually rejected only when Prisma executes the query. TypeScript checks such as
`satisfies Prisma.ProjectWhereInput` help for conditions written in source code, but they do not
validate JSON loaded from an API request or database.

Runtime validation therefore has separate responsibilities:

- Subject-specific schema validation detects unknown fields and scalar or type mismatches.
- CASL Prisma translation validation detects unsupported CASL and Prisma query syntax.
- Prisma query execution remains the final validation boundary for the generated `where` input.

The validation flow is:

```text
JSON/Zod shape validation
    -> subject-specific schema validation
    -> CASL Prisma translation validation
    -> Prisma query execution
```

**Worked example.** A `WorkspaceMember` `update` rule scoped to the active workspace is stored as:

```json
{
    "subject": "WorkspaceMember",
    "action": ["update"],
    "conditions": { "workspaceId": "${workspaceId}" }
}
```

`PolicyAbilityFactory` resolves `${workspaceId}` from the explicit placeholder values before the rule
is added to the ability, so the ability carries the literal id, e.g. `{ "workspaceId": "3f2b..." }`.
The same rule drives both enforcement forms:

```ts
const ability = this.requestStoreService.get<IPolicyAbility>(PolicyAbilityStoreKey); // workspaceId: "3f2b..." resolved

// Record-level: the instance check evaluates the stored condition.
const otherWorkspaceMember = policyUtil.toSubject(
    EnumPolicySubject.WorkspaceMember,
    memberFromOtherWorkspace
);
const activeWorkspaceMember = policyUtil.toSubject(
    EnumPolicySubject.WorkspaceMember,
    memberFromActiveWorkspace
);
ability.can('update', otherWorkspaceMember); // false — workspaceId mismatch
ability.can('update', activeWorkspaceMember); // true

// Query-level: accessibleWhere wraps accessibleBy(ability, 'update').ofType(...WorkspaceMember),
// yielding a Prisma.WorkspaceMemberWhereInput, e.g. { workspaceId: "3f2b..." }.
const authorizationWhere = this.policyDomain.accessibleWhere(
    ability,
    EnumPolicyAction.update,
    EnumPolicySubject.WorkspaceMember
);
```

## Ability Lifecycle

`UserGuard` authenticates only: it stores the user under `UserStoreKey` and loads no policies.
`WorkspaceMemberGuard` and `ProjectMemberGuard` store the membership rows and load no policies. The
request ability comes from one of three fixed-scope ability guards, each composed by a policy
decorator, and is stored under `PolicyAbilityStoreKey`:

| Guard | Scope | Policies loaded, in composition order |
| --- | --- | --- |
| `PlatformPolicyAbilityGuard` | `platform` | The authenticated user's platform role |
| `WorkspacePolicyAbilityGuard` | `workspace` | The platform role, then the acting workspace member's role |
| `ProjectPolicyAbilityGuard` | `project` | The platform role, then the acting workspace member's role, then the acting project member's role when the caller has one |

`PolicyAbilityDomain` (a domain, not a service) builds the ability. Each layer's rules load through
the policy repository and resolve only the placeholders that layer owns:

```ts
const ability = await policyAbilityDomain.buildAbility({
    scope: EnumPolicyAbilityScope.workspace,
    user: { id: user.id, roleId: user.roleId },
    workspace: { id: workspace.id, member: { id: member.id, roleId: member.roleId } },
});
requestStoreService.set(PolicyAbilityStoreKey, ability);
```

`PolicyAbilityFactory` is a pure composition service. `buildFromPolicies` receives the explicit
placeholder values available at the current layer, interpolates recognized placeholders, drops
rules whose conditions cannot be resolved, and returns an ability. `build` adds every allowing rule
before every inverted rule. The factory does not read or write request context.

An ability guard that finds an ability under `PolicyAbilityStoreKey` returns without loading or
overwriting anything, so a stacked policy decorator reuses the first ability built for the request.
On an admin resource route the workspace policy decorator is written above
`@PlatformPolicyProtected`, so the platform ability is stored first. An ability guard whose
required context (user, workspace, member, project) is missing from the store throws
`RequestContextMissingException`. The project ability guard permits an absent project member and
builds the project layer empty.

`PlatformPolicyAbilityGuard` also resolves `${workspaceId}` and `${projectId}` from valid
`:workspaceId` and `:projectId` route params, so a platform rule on an admin route can be scoped to
the workspace or project the path addresses.

Consumers read the ability from `PolicyAbilityStoreKey`. `PolicyGuard` passes the subject type to
`PolicyDomain.assertCan(ability, action, subject)` for the route capability gate. The record
enforcement guards tag the loaded record with `PolicyUtil.toSubject` and pass it to
`PolicyDomain.assertCan`. HTTP services pass the same ability to
`PolicyDomain.accessibleWhere(ability, action, subject)` or `requireAccessibleWhere` for collection
filtering, and may call `ability.can(action, subject)` for local capability decisions. A `manage`
rule remains CASL's literal wildcard action and is evaluated by the ability itself. Domains do not
read the request ability implicitly.

`assertCan` throws through `ForbiddenError.from(ability).throwUnlessCan(action, subject)` rather than
a bare boolean branch, so the matched rule's `reason` is captured. The domain maps that
`ForbiddenError` into `PolicyForbiddenException`, carrying the reason while keeping the existing i18n
status-code kit (`policy.constant.ts` `DocPolicyErrorResponses`). A denial therefore reports why
without losing its i18n message.

`@RoleProtected()`, `RoleGuard`, and the super-admin bypass do not exist. The super-admin role holds
a persisted `manage`/`all` rule and proceeds through the same ability construction and CASL
evaluation as every other role, keeping permission data as the single source of authorization
decisions.

## Enforcement Layers

The enforcement path is realized as ability guards for the request ability, policy enforcement
guards for the route capability gate and target records, HTTP services for collection predicates,
domains for business orchestration, and repositories for Prisma execution. Domains remain usable by
non-HTTP callers.

### Guard Layer

Each policy decorator applies `UseGuards(<ability guard>, <enforcement guard>)` and sets the route
metadata its enforcement guard reads:

| Decorator | Enforcement guard | Metadata |
| --- | --- | --- |
| `@PlatformPolicyProtected({ subject, action[] })` | `PolicyGuard` | `PolicyRequiredMetaKey`: `{ subject, action[] }` objects |
| `@WorkspaceSubjectPolicyProtected({ subject, action[] })` | `PolicyGuard` | `PolicyRequiredMetaKey` |
| `@WorkspacePolicyProtected(...actions)` | `WorkspacePolicyGuard` | `WorkspacePolicyRequiredMetaKey`: actions on `Workspace` |
| `@WorkspaceMemberPolicyProtected(...actions)` | `WorkspaceMemberPolicyGuard` | `WorkspaceMemberPolicyRequiredMetaKey`: actions on `WorkspaceMember` |
| `@ProjectPolicyProtected(...actions)` | `ProjectPolicyGuard` | `ProjectPolicyRequiredMetaKey`: actions on `Project` |
| `@ProjectMemberPolicyProtected(...actions)` | `ProjectMemberPolicyGuard` | `ProjectMemberPolicyRequiredMetaKey`: actions on `ProjectMember` |
| `@PolicyAbilityProtected(scope)` | none | none |

The workspace and project decorators fix their subject and take actions only. A route that declares
no required policy throws `PolicyPredefinedNotFoundException`. The decorator usage at the call site:

```ts
@WorkspacePolicyProtected(EnumPolicyAction.update)
@WorkspaceMemberProtected()
@WorkspaceProtected()
@Patch('/update')
updateWorkspace(...) { ... }
```

`PolicyGuard` reads the resolved ability and route metadata, then asks `PolicyDomain` for a type-level
decision per required `{ subject, action }`. It loads no policy rows and no resource records.

```ts
// guards/policy.guard.ts
canActivate(context: ExecutionContext): boolean {
    const ability = this.requestStoreService.get<PolicyAbility>(PolicyAbilityStoreKey);
    if (!ability) {
        throw new RequestContextMissingException(PolicyAbilityStoreKey);
    }

    const policyMetadata = this.reflector.get<IPolicyRequired[]>(
        PolicyRequiredMetaKey,
        context.getHandler()
    );
    const requiredPolicies = policyMetadata ?? [];
    if (requiredPolicies.length === 0) {
        throw new PolicyPredefinedNotFoundException();
    }

    for (const { subject, action } of requiredPolicies) {
        for (const one of action) {
            this.policyDomain.assertCan(ability, one, subject);
        }
    }

    return true;
}
```

The record guards resolve a real record and judge it tagged with its subject:

- `WorkspacePolicyGuard` judges the `Workspace` record: `:workspaceId` when the route carries it
  (admin routes, soft-deleted workspaces included), otherwise the workspace `WorkspaceGuard` stored.
- `WorkspaceMemberPolicyGuard` judges the target workspace member. The `:workspaceMemberId` param
  always wins; the acting member is the target only when the route carries no param. The target
  loads through `PolicyDomain.requireAccessibleWhere` and
  `WorkspaceMemberDomain.getOneByIdAndWorkspace`, so a record the ability does not reach answers
  not found, and the authorized record is stored under `WorkspaceMemberTargetStoreKey` for
  `@WorkspaceMemberTargetCurrent()`.
- `ProjectPolicyGuard` judges the `Project` record `ProjectGuard` stored.
- `ProjectMemberPolicyGuard` judges the target project member `:projectMemberId` addresses, loaded
  the same way and stored under `ProjectMemberTargetStoreKey`. A route with no param (assign) has no
  target record, so only the subject-type check applies.

`PolicyDomain.assertCan` evaluates the supplied ability. `superAdmin`'s `manage`/`all` rule satisfies
the same checks as any other role's rules, without a role-name bypass in any guard.

### HTTP Service Layer

HTTP services receive the authorized target from the enforcement guard through the target
decorators and pass it to the domain, so a point operation does not read the target twice. The
domain keeps its business invariants and the repository keeps Prisma execution.

For a policy-controlled collection, the HTTP service reads the ability from request context,
generates the CASL predicate, and passes it to the domain as the generic `where`:

```ts
const accessibleWhere = this.policyDomain.requireAccessibleWhere<Prisma.WorkspaceWhereInput>(
    ability,
    EnumPolicyAction.read,
    EnumPolicySubject.Workspace
);

return this.workspaceDomain.getListForAdmin(params, accessibleWhere, isPublic?.where);
```

The repository AND-composes the policy predicate with its mandatory constraints (active rows,
workspace or project boundary) and with the caller's search and equality filters, and executes the
Prisma query. It does not resolve abilities or accept an authorization predicate directly from a
request DTO. `requireAccessibleWhere` throws `PolicyForbiddenException` when the ability holds no
rule for the subject; `accessibleWhere` returns `null` in that case, and the project list then passes
no predicate.

Writes that are consequences of one authorized operation, such as creating memberships while
claiming an invite, stay inside that operation's transaction and do not invent separate permissions
for internal steps. Domains called by processors and automations use trusted paths without HTTP
authorization state.

**Canonical end-to-end example.** `PATCH /user/workspace/member/:workspaceMemberId/role/update`
traces the HTTP boundary:

```ts
@WorkspaceMemberPolicyProtected(EnumPolicyAction.update)
@WorkspaceMemberProtected()
@WorkspaceProtected()
@Patch('/member/:workspaceMemberId/role/update')
async memberUpdateRole(
    @WorkspaceCurrent() workspace: Workspace,
    @WorkspaceMemberCurrent() actorMember: IWorkspaceMemberWithRole,
    @WorkspaceMemberTargetCurrent() targetMember: IWorkspaceMemberWithRole,
    @Body({ schema: WorkspaceMemberUpdateRoleRequestSchema }) body: WorkspaceMemberUpdateRoleRequestDto
) {
    await this.workspaceMemberHttpService.updateMemberRole(
        workspace.id,
        actorMember,
        targetMember,
        body
    );
}
```

`WorkspaceMemberPolicyGuard` has already loaded the addressed member through the policy predicate
and judged `update` on it, so the service receives an authorized record. The update then runs as a
separate domain and repository operation. Query pushdown can be added to a mutation where
database-level protection against a policy change during the request is required; the current
design does not make that protection universal.

### Alternatives Considered

The model uses three complementary mechanisms, each at the boundary where it has the required
information.

| Option | Mechanism | Trade-off |
| --- | --- | --- |
| **Guard record check** | The enforcement guard loads the target through the policy predicate and calls `PolicyDomain.assertCan` with a tagged record. | Supports arbitrary conditions, precise 403 responses, and policy reasons. The decision and mutation are separate operations. |
| **HTTP-service pagination filter** | The HTTP service calls `PolicyDomain.accessibleWhere` and passes the result as the generic `where`. | Filters collections in the database and preserves correct pagination. |
| **Mutation query pushdown** | A mutation composes `accessibleBy(...).ofType(Model)` with its own Prisma predicate. | Closes the check/write window, but a denied mutation has not-found semantics and does not carry the matched policy reason. |

The adopted model uses guard record checks for point operations and HTTP-service pagination
predicates for collection reads. Mutation query pushdown remains an available hardening mechanism
for operations that require database-level protection against a check/write race.

## Effective Permissions Endpoint

A client cannot render UI conditionally, and support cannot debug an access complaint, from a role
name alone — both need the caller's actual effective actions for the active workspace or project.
This adds one read-only endpoint per scope that reports the effective actions represented by the
request's resolved ability, with no new ability-construction path.

| Controller | Route | Guard stack | Response |
| --- | --- | --- | --- |
| `WorkspaceUserController` | `GET /permissions` — current workspace from `x-workspace-id`, no path param, same as `get` | `@PolicyAbilityProtected(workspace)`, `@WorkspaceMemberProtected()`, `@WorkspaceProtected()`, `@UserProtected()`, `@FeatureFlagProtected('workspace')`, `@AuthJwtAccessProtected()`, `@ApiKeyProtected()`, `@RequestThrottle` | `{ permissions: IEffectivePermission[] }` scoped to `Workspace`, `WorkspaceMember`, `WorkspaceInvite`, `WorkspaceJoinRequest`, and the workspace-role `Project`/`ProjectMember`/`analytic` grants |
| `ProjectUserController` | `GET /permissions/:projectId` — path param, same as every other project route | `@PolicyAbilityProtected(project)`, `@ProjectMemberProtected()`, `@ProjectProtected()`, `@WorkspaceMemberProtected()`, `@WorkspaceProtected()`, `@UserProtected()`, `@FeatureFlagProtected('workspace')`, `@AuthJwtAccessProtected()`, `@ApiKeyProtected()`, `@RequestThrottle` | `{ permissions: IEffectivePermission[] }` scoped to `Project`, `ProjectMember` |

The workspace route takes no id because no workspace route does — `get`, `update`, `updateIsPublic`,
`updateSlug`, `ownershipTransfer`, and `leave` all resolve the active workspace from the
`x-workspace-id` header through `@WorkspaceCurrent()`. The project route carries `:projectId` because
every project route does — there is no per-request "current project" header, so `@ProjectCurrent()`
always resolves from the path.

The response rows carry a subject and the actions the caller holds on it (`EffectivePermissionSchema`):

```ts
interface IEffectivePermission {
    subject: EnumPolicySubject;
    actions: EnumPolicyAction[]; // the concrete EnumPolicyAction members the caller holds for this subject
}
```

A `member` role and an `owner` role hitting `GET /permissions` for the same workspace get different
results — a `member` holds no rule beyond `Workspace:read` and `WorkspaceMember:read`, while an `owner` holds the full
workspace-family grant (see
[Policy Matrix & Default Scoped Role Rules](#policy-matrix--default-scoped-role-rules) for the source
of these grants):

```json
// member
{ "permissions": [
    { "subject": "Workspace", "actions": ["read"] },
    { "subject": "WorkspaceMember", "actions": ["read"] }
] }

// owner
{ "permissions": [
    { "subject": "Workspace", "actions": ["manage", "read", "create", "update", "delete"] },
    { "subject": "WorkspaceMember", "actions": ["read", "update", "delete"] },
    { "subject": "WorkspaceInvite", "actions": ["manage", "read", "create", "update", "delete"] },
    { "subject": "WorkspaceJoinRequest", "actions": ["update"] },
    { "subject": "Project", "actions": ["read", "create", "update", "delete"] },
    { "subject": "ProjectMember", "actions": ["create", "update", "delete"] },
    { "subject": "analytic", "actions": ["read"] }
] }
```

Each controller's handler follows its own existing idiom: the guards resolve the current resource
and member, and the handler passes them through:

```ts
// controllers/workspace.user.controller.ts
@PolicyAbilityProtected(EnumPolicyAbilityScope.workspace)
@WorkspaceMemberProtected()
@WorkspaceProtected()
@Get('/permissions')
async permissions(
    @WorkspaceCurrent() workspace: Workspace,
    @WorkspaceMemberCurrent() workspaceMember: IWorkspaceMemberWithRole
): Promise<IResponseReturn<{ permissions: IEffectivePermission[] }>> {
    return this.workspaceHttpService.getEffectivePermissions(workspace, workspaceMember);
}

// controllers/project.user.controller.ts
@PolicyAbilityProtected(EnumPolicyAbilityScope.project)
@ProjectMemberProtected()
@ProjectProtected()
@Get('/permissions/:projectId')
async permissions(
    @ProjectCurrent() project: Project,
    @ProjectMemberCurrent() projectMember: IProjectMemberWithRole
): Promise<IResponseReturn<{ permissions: IEffectivePermission[] }>> {
    return this.projectHttpService.getEffectivePermissions(project, projectMember);
}
```

The service reads the resolved ability from request context and calls
`PolicyDomain.getEffectivePermissions` over the workspace- or project-level subjects, which probes
`ability.can(action, subject)` for each `EnumPolicyAction` member and collects only the actions that
return `true`. A `manage` holder passes every one of those
probes, since `manage` is CASL's literal wildcard action ([Ability Lifecycle](#ability-lifecycle)).
No second ability is built for this endpoint.

## Policy Matrix & Default Scoped Role Rules

CASL decisions are applied after the existing workspace and project guards succeed. The first table
maps each operation to its subject/action pair (or to "none" for the no-permission operations); the
second lists the default rules each seeded scoped role holds.

**Operation matrix**

| Operation group | Subject | Actions | Existing boundary context | Notes |
| --- | --- | --- | --- | --- |
| Workspace list/create/switch/leave | none | none | authenticated user; switch and leave need membership in the target workspace | No CASL metadata; see [Actions](#actions). List result set filtered by membership/visibility as a query concern. |
| Workspace get (user and admin) | `Workspace` | `read` | workspace member (user) or platform admin | `workspaceId` condition per [Scoping Placeholder Conventions](#scoping-placeholder-conventions); admin routes resolve it from `:workspaceId`. |
| Workspace update/visibility/slug/delete | `Workspace` | `update`, `delete` | current workspace member | `workspaceId` condition. |
| Ownership transfer | `Workspace` | `update` | current workspace membership | `workspaceId` condition; owner-exclusivity is enforced as a domain invariant in `WorkspaceMemberDomain.transferOwnership`, independent of the guard, since `update` is also held by `admin`. |
| Member list | `WorkspaceMember` | `read` | current workspace member | `workspaceId` condition; subject-type gate, with the policy predicate merged into the pagination `where`. |
| Member role/remove | `WorkspaceMember` | `update`, `delete` (owner holds `manage`) | current workspace and member | `workspaceId` condition. |
| Invite list/claim | none | none | current member (list) or token-verified invite claimant (claim) | No CASL metadata. |
| Invite create | `WorkspaceInvite` | `create` | current workspace member | `workspaceId` condition. |
| Invite resend | `WorkspaceInvite` | `update` | current workspace member | `workspaceId` condition. |
| Invite revoke | `WorkspaceInvite` | `delete` | current workspace member | `workspaceId` condition. |
| Join request create/list | none | none | public workspace requester (create) or current workspace member (list) | No CASL metadata. |
| Join request accept/reject | `WorkspaceJoinRequest` | `update` (owner holds `manage`) | current workspace member | `workspaceId` condition. |
| Project list (user) | none | none | current workspace member | The route builds the workspace ability and enforces no policy; `ProjectHttpService.getListForMember` probes `can('read', 'Project')` to decide whether the list spans every project in the workspace or only the caller's assigned projects. |
| Admin workspace/project list and workspace member list | `Workspace` / `Project` | `read` | platform admin | Platform-role rule, no scope condition; admin get uses `:workspaceId`/`:projectId`. |
| Project get/update/slug/delete | `Project` | `read`, `update`, `delete` (owner holds `manage`) | current workspace and project membership | `id` condition resolved from `${projectId}`, the same pair whether a workspace or project role holds the rule. |
| Project create | `Project` | `create` | current workspace member | Bare `Project:create` carries no scope condition; the create check evaluates the incoming project's own attributes. |
| Project member list | `Project` | `read` | current workspace member (project membership optional) | `ProjectPolicyProtected(read)` gate. |
| Project member role/remove | `ProjectMember` | `update`, `delete` (owner holds `manage`) | current workspace, project, and project membership | `projectId` condition resolved from `${projectId}`. |
| Project member assign | `ProjectMember` | `create` | current workspace, project, and project membership | Carries the `projectId` scope condition; no member-instance condition. |
| Project leave | none | none | caller's current project membership | |
| Analytics (admin and user) | `analytic` | `read` | platform admin/super-admin (admin routes) or workspace owner/admin (user routes) | Capability subject with no persisted record; workspace-role grants carry a `workspaceId` condition resolved from `${workspaceId}`. |

**Default scoped role rules**

`PolicyDomain` combines platform-role policies with the workspace and project roles resolved from the
request memberships. Every capability below implicitly carries the subject's fixed scope pair per
[Scoping Placeholder Conventions](#scoping-placeholder-conventions), the same pair whichever kind of
role holds the rule, and matches the seeds in [Initial Seed Rules](#initial-seed-rules).

| Role     | Scope     | Capabilities                                                                                                                                                 |
| -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `owner`  | workspace | `Workspace`: `manage`; `WorkspaceMember`: `manage`; `WorkspaceInvite`: `manage`; `WorkspaceJoinRequest`: `manage`; `Project`: `manage`; `ProjectMember`: `manage`; `analytic`: `read` |
| `admin`  | workspace | `Workspace`: `read`, `update`; `WorkspaceMember`: `update`, `delete`; `WorkspaceInvite`: `manage`; `WorkspaceJoinRequest`: `update`; `Project`: `read`, `create`, `update`, `delete`; `ProjectMember`: `create`, `update`, `delete`; `analytic`: `read` |
| `member` | workspace | `Workspace`: `read`                                                                                                                                          |
| `owner`  | project   | `Project`: `manage`; `ProjectMember`: `manage`                                                                                                                |
| `admin`  | project   | `Project`: `read`, `update`; `ProjectMember`: `create`, `update`, `delete`                                                                                    |
| `member` | project   | `Project`: `read`                                                                                                                                              |
| `viewer` | project   | `Project`: `read`                                                                                                                                              |

The workspace `admin` and `owner` roles receive project authority through workspace-scoped CASL
rules, so they act on projects in the active workspace without being assigned a project-scoped role.
Workspace `admin` holds full project control — `Project` CRUD and `ProjectMember` CRUD — but not
`Workspace:delete`, the destructive capability reserved for the owner.

Owner and admin differ by design: **owner holds `manage`; admin holds explicit CRUD.** Per the
`manage` principle in [Actions](#actions), owner roles are granted `manage` on every subject they
fully control, while admin roles keep explicit CRUD so a specific action (most notably `delete`) can
be withheld without touching the owner grant. Because `manage` grants exactly a subject's registered
actions, `workspace: owner` holding `WorkspaceMember: manage` is functionally `{update, delete}` and
`WorkspaceJoinRequest: manage` is functionally `{update}` — nothing beyond what admin's explicit CRUD
already lists for those two subjects. The one deliberate exception is `WorkspaceInvite`: both `admin`
and `owner` hold `manage`, granting create, resend, and revoke together rather than through a
separate CRUD grant. `Workspace` itself keeps `manage` reserved for `owner` only, so
`Workspace:delete` stays withheld from admin. Ownership transfer requires `Workspace:update`, which
admin also holds, so owner-exclusivity for that operation is enforced as a domain invariant in
`WorkspaceMemberDomain.transferOwnership` rather than by the guard's required action.

Project `owner` and workspace `owner` both hold `manage` on `Project` and `ProjectMember`, so an owner
never needs a narrower CRUD grant to fully control the projects in its scope. Project members and
viewers both start with `Project:read`; members are the extension point for future project
capabilities, while viewers remain read-only unless the preset is deliberately changed. Project and
project-member listing are gated by membership alone, so no role carries a `ProjectMember` `read`
rule.

Role administration uses the `Role` subject: platform administrators read the preset catalog and
update role display metadata and policy rows. Role creation, deletion, key changes, and scope changes
are not exposed; workspace owners, workspace admins, and project admins cannot administer roles or
policies. Policy writes do not check a rule's subject against the role's scope or a rule's action
against a catalog. The workspace
`owner` role remains the only role recognized by ownership-transfer and last-owner domain
invariants.

The existing domain rules remain in force after a scoped role grants the action: an owner cannot be
removed through a peer operation, the last owner cannot leave, and role-transition validation
continues to protect membership invariants.

## Initial Seed Rules

The initial policy seed is explicit rather than derived from every enum member.

- `superAdmin`: `manage` on `all`.
- `admin` (platform): every `EnumPolicyAction` on each platform/admin resource subject
  (`ActivityLog`, `ApiKey`, `Device`, `FeatureFlag`, `PasswordHistory`, `Role`, `Session`,
  `TermPolicy`, `User`), `read` on `analytic`, and `read` on `Workspace` and `Project`. The
  `analytic` grant is workspace-scoped in the seed catalog. Additional actions are added only with
  matching admin endpoints.
- `user` (platform): seeds no workspace-family rule. Workspace `list`/`create`, invite `claim`, and
  join-request `create` carry no CASL permission.
- Workspace roles: seed `owner`, `admin`, and `member` once with the workspace rows in the scoped role
  matrix — `owner` with `manage` on `Workspace`, `WorkspaceMember`, `WorkspaceInvite`,
  `WorkspaceJoinRequest`, `Project`, and `ProjectMember`; `admin` with explicit CRUD on the same
  subjects plus `WorkspaceInvite: manage` — including workspace-scoped `analytic:read` for owner
  and admin.
- Project roles: seed `owner`, `admin`, `member`, and `viewer` once with the project rows in the
  scoped role matrix; `owner` with `manage` on `Project` and `ProjectMember`; `ProjectMember:create`
  (held by `admin`) carries the project-scope condition and no member-instance condition.

The seed replaces the managed policy rows for the fixed roles and recreates them from the declarative
rule catalog. There is no priority-based identity or ordering.

The project creator is seeded as the project **`owner`** role (`EnumRoleProjectKey.owner`), so a
freshly created project has an owner from the first request. This requires the `owner` key on
`EnumRoleProjectKey` and the project `owner` role row (scope `project`, key `owner`) in the role seed.

## Resolved Decisions

The design questions raised during planning are settled:

- **Request authorization boundary** — fixed-scope ability guards build the request ability,
  `PolicyGuard` and the record enforcement guards own the route gate and target-record checks, HTTP
  services own collection predicates, domains remain reusable by internal callers, and
  repositories own Prisma execution.
- **Record-level checks** — the record enforcement guards call `PolicyDomain.assertCan` with
  records tagged by `PolicyUtil.toSubject`, loaded through the policy predicate. A synthetic
  tagged subject is never built from route ids.
- **Generating Prisma `where` from rule conditions** — HTTP services call
  `PolicyDomain.accessibleWhere` or `requireAccessibleWhere` for policy-controlled collection
  queries and pass the result to the domain as the generic `where`. `createCaslExtension()` provides fail-closed collection behavior.
- **Mutation hardening** — mutation query pushdown is available for operations that require database
  enforcement against a check/write race; it is not universal in v1.
- **`manage` stays unbounded on every subject** — CASL's `createAliasResolver` explicitly forbids
  aliasing or scoping `manage`, so bounding it per subject is application responsibility CASL does
  not support out of the box. Rather than hand-roll a substitute, `manage` passes through
  `PolicyAbilityFactory` as CASL's literal wildcard action whatever subject it names, `all` and any
  specific subject alike (see [Actions](#actions), [Ability Lifecycle](#ability-lifecycle)).
- **Write-time action and scope validation** — policy writes persist structurally valid rule data
  without role-scope compatibility checks. Scope conditions are supplied explicitly by seed helpers,
  while CASL evaluates the resulting rules at request time (see
  [Stored Rule Contract](#stored-rule-contract), [Subjects](#subjects)).
- **`IPolicyRepository`** — kept. It has no DI-token seam of its own, but the other modules keep
  repository interfaces as house style, so it stays for consistency.
- **Project creator role** — the creator becomes the project `owner`, not `admin` (see
  [Initial Seed Rules](#initial-seed-rules)).
- **Member-instance placeholders** — `${workspaceMemberId}` and `${projectMemberId}` are available
  when a membership guard has established those records. Seeded rules currently use workspace and
  project scope conditions rather than member-instance conditions.

## Test Plan

Unit specs live under `test/**/*.spec.ts`, ordered most critical first — a failure in Tier 1 means an
authorization decision can be silently wrong. Run scoped suites with `pnpm test policy`,
`pnpm test role`, `pnpm test workspace`, and `pnpm test project`; query-adapter integration coverage
runs against PostgreSQL in its dedicated environment, outside this unit suite.

### Tier 1 — Critical (authorization correctness and security boundary)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyGuard.canActivate` | Required policy absent from ability | Guard rejects the request instead of falling through |
| Ability guards (`PlatformPolicyAbilityGuard`, `WorkspacePolicyAbilityGuard`, `ProjectPolicyAbilityGuard`) | A stored ability already present | Guard returns without loading or overwriting the ability |
| `PolicyDomain.assertCan` | Ability denies the action | Throws `PolicyForbiddenException`, does not return `false` silently |
| Record enforcement guards | Conditional workspace, project, or member record | Guard calls `PolicyDomain.assertCan` with `PolicyUtil.toSubject`; denial carries the policy reason |
| HTTP service collection authorization | Conditional workspace or project list | Service passes `PolicyDomain.accessibleWhere` to the domain as the generic `where` |
| Ability build (`PolicyAbilityFactory`) | Inverted rule vs. allow, same subject, in either input order | Matching inverted rules remain authoritative |
| Record-level `can(action, PolicyUtil.toSubject(subject, record))` | Record from a different workspace against a `workspaceId`-scoped rule | Condition mismatch denies — the instance check evaluates the scoping placeholder, the type-level check does not |
| `PolicyAbilityDomain.buildAbility` | Platform, workspace, and project rules for one user | The domain composes platform → workspace → project policies and interpolates the placeholders each layer owns |
| `PolicyGuard.canActivate` | `superAdmin` role, no special-cased bypass in code | Evaluates through the seeded `manage`/`all` rule like any other role, not a hardcoded short-circuit |
| Policy write persistence (`PolicyDomain` create/update path) | Structurally valid rules across platform, workspace, and project roles | Persists the rule without applying role-scope compatibility checks |

### Tier 2 — High (core data-shaping and business invariants)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyDomain.accessibleWhere` | Subject with an active-scope condition | Produces the exact Prisma `WhereInput` the HTTP service passes to the domain before the repository query |
| Policy seed (`policy.seed.ts` or equivalent) | Re-running the seed after a rule's conditions changed | Replaces the managed policy set |
| Role assignment domain (`User`/`WorkspaceMember`/`ProjectMember` role write) | Assigning a workspace-scoped role to a `ProjectMember.roleId` (wrong scope) | Rejected — scope validation runs before the write, not just at read time |
| `WorkspaceDomain` ownership transfer / last-owner check | Attempt to remove or demote the sole `owner` after the CASL migration | Last-owner invariant still blocks the operation regardless of the caller's CASL grant |
| `getEffectivePermissions` | Role with a narrow rule set vs. a role with a broad one, same subject | Returned action list matches exactly what `can()` would allow for each action — no extra, no missing |

### Tier 3 — Medium (composition and boundary wiring)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyRepository` read path | Rows for one role fetched in bulk | Returns the role's policy rows without requiring priority ordering |
| Ability guard composition | Platform, workspace, and project ability guards | Each guard stores the resolved ability of its scope and never stores raw policy rows |
| Guard stacking (`WorkspaceGuard`/`ProjectGuard` + policy guards) | Cross-workspace project id in the route | Boundary guard rejects before the policy guards run — CASL never sees an out-of-boundary record |
| Membership-only operations (workspace switch, workspace/project leave) | Caller has no matching CASL rule at all | Operation still succeeds — these routes carry no policy metadata by design |
| Domain automation path | No HTTP request ability | Domain operation remains callable without request authorization state |

### Tier 4 — Low (DTO validation and catalog completeness)

| Method | Description | What it tests |
| --- | --- | --- |
| Rule DTO validation | `conditions` is not a JSON object | Rejected at the DTO boundary, before reaching the domain |
| Placeholder catalog | Every `EnumPolicyConditionPlaceholder` member | Uses the canonical flat token values and fails closed when a recognized token has no value |
| Seed data catalog | Every seeded role/scope pair | Uses explicit workspace, project, or unscoped conditions for the intended role scope |
