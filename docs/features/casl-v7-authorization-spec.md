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
- [Ability Lifecycle](#ability-lifecycle)
- [Enforcement Layers](#enforcement-layers)
  - [Guard Layer](#guard-layer)
  - [Domain Layer](#domain-layer)
  - [Alternatives Considered](#alternatives-considered)
- [Effective Permissions Endpoint](#effective-permissions-endpoint)
- [Policy Matrix & Default Scoped Role Rules](#policy-matrix--default-scoped-role-rules)
- [Initial Seed Rules](#initial-seed-rules)
- [Resolved Decisions](#resolved-decisions)
- [Test Plan](#test-plan)

## Overview & Scope

The system defines a CASL v7 authorization model over PostgreSQL and Prisma. It covers platform
roles, workspace and project boundaries, stored rule evaluation, record-level object checks, and
Prisma query filtering. Policy decisions live in the policy domain and the feature domains;
controllers delegate HTTP work and repositories own Prisma query shapes.

The model uses `@casl/ability@7.0.1` and `@casl/prisma@2.0.2`. `createPrismaAbility` builds the
ability in the Prisma `WhereInput` dialect, and `accessibleBy(ability, action).ofType(Model)`
turns a rule set into a per-model `WhereInput`.

Authorization is enforced in **two layers**, both first-class — record-level enforcement is not
deferred:

- **Type-level** — `PolicyGuard` calls `ability.can(action, subject)` with no record, answering
  "could this role ever do this?" in O(1). CASL does not consult a rule's conditions on a
  type-level check
  ([`@casl/ability` `Rule.ts`](https://github.com/stalniy/casl/blob/master/packages/casl-ability/src/Rule.ts)
  evaluates conditions only against an instance). Every `@PolicyProtected` route runs this gate.
- **Record-level** — the instance form `ability.can(action, subject('Model', record))` evaluates
  the stored conditions, so the seeded scope conditions become enforcing. It runs at the layer where
  the target record first exists: feature domains run it for sub-resource writes (`workspaceMember`,
  `projectMember`, `workspaceInvite`, `workspaceJoinRequest`), whose target is loaded from a
  client-supplied id inside the domain. Repositories additionally push
  `accessibleBy(...).ofType(Model)` into the Prisma `where`. Prisma returns class-less plain objects,
  so tagging the record with `subject('Model', record)` is mandatory for CASL to select the right
  rules.

Without the record-level layer the stored scope conditions are inert: the boundary would rest only
on the workspace/project guards, on which role's policies each guard loads, and on hand-written
repository `where` clauses. This model makes the conditions enforce.

Policies persist as rows related to a `Role`. Each row is one full CASL rule — subject, action
array, conditions, inversion, reason — which the existing one-subject-per-row table cannot
represent, so the model includes the Prisma schema migration, client generation, seed update, and
the affected role/policy DTOs. The `policy.admin.controller.ts` and `policy.system.controller.ts`
routes and their request/response DTO shapes are unchanged: the rule contract is richer, but the
HTTP surface for reading and writing a role's policies is the same set of endpoints. The
Request context stores the authenticated user without role policy rows. The resolved CASL ability is
the request authorization value consumed by guards and domains; raw policy rows remain inside the
role/member data used while the guards compose that ability.

## Goals & Non-Goals

**Goals**

- Store complete CASL rules with allow and deny semantics.
- Evaluate one request-scoped ability consistently in guards and domains.
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

- Admin-scope routes use `@PolicyProtected()`. A route narrowed to a workspace or project accepts
  a validated path id and does not read `x-workspace-id`.
- User and shared workspace routes keep `@WorkspaceProtected()` and the membership-resolving
  `@WorkspaceMemberProtected()` form as the workspace boundary. Project routes keep
  `@ProjectProtected()` and `@ProjectMemberProtected()`.
- CASL adds capability and record decisions after those guards establish the caller and
  workspace/project context. CASL does not turn a cross-workspace project into an accessible
  record.
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
accepts no other action. `manage` on any other subject, such as `workspaceMember`, is the same
unbounded wildcard: building the ability passes a stored `manage` rule straight to
`createPrismaAbility`, and no per-subject action list is consulted when the ability is built.

Every subject uses one action vocabulary, `EnumPolicyAction { manage, read, create, update,
delete }`, stored in `Policy.action` as a typed Prisma enum array. There are no per-subject
workflow enums: a domain operation maps to a CRUD verb, or to `manage`/`update` when it is a
privileged or status-transition action that must not be granted piecemeal.

The table below lists the actions the seeded rules use for each subject. `PolicySubjectRegistry`
(see [Subjects](#subjects)) carries no action list of its own, so nothing in the write path
checks a rule's action against this table; it documents intent, not an enforced catalog:

| Subject                | Actions in use                                   | Operations covered                                                             |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `workspace`            | `read`, `update`, `delete`, `manage`            | ownership transfer requires `update`; `manage` grants every action on the subject |
| `workspaceMember`      | `update`, `delete`, `manage`                    | role change, member removal                             |
| `workspaceInvite`      | `create`, `update`, `delete`, `manage`          | `update` resends a pending invite; `delete` revokes it |
| `workspaceJoinRequest` | `update`, `manage`                              | accept and reject                                   |
| `project`              | `read`, `create`, `update`, `delete`, `manage`  | project lifecycle                      |
| `projectMember`        | `create`, `update`, `delete`, `manage`          | `create` assigns a member; role change; member removal   |
| `analytic`            | `read`                                           | analytics dashboards, platform-wide (admin routes) and workspace (user routes) |
| platform/admin resource subjects | every `EnumPolicyAction`               | `activityLog`, `apiKey`, `device`, `featureFlag`, `passwordHistory`, `role`, `session`, `termPolicy`, `user` (the admin controllers' CRUD, no tenant scope) |

**`manage` is unbounded on every subject, including a specific one.** A stored `manage` rule
reaches `createPrismaAbility` as CASL's literal wildcard action, whatever subject it names:
`manage` on `workspaceMember` authorizes every action CASL evaluates against that subject, not a
bounded subset. The `all` subject carries the same wildcard, so the super-admin `manage`/`all`
rule and a scoped role's `manage` rule on one subject are evaluated the same way (see
[Ability Lifecycle](#ability-lifecycle)). The `owner` roles hold `manage` on the subjects they fully
control; `admin` roles keep explicit CRUD so a specific action (most notably `delete`) can be
withheld, covered in
[Policy Matrix & Default Scoped Role Rules](#policy-matrix--default-scoped-role-rules).

`update` on `workspace` covers name, description, visibility, and slug changes. `update` on
`project` covers name, description, and slug changes. These operations receive separate actions only
when the product needs different grants.

The following operations require **no CASL permission** and have no subject or action — the domains
still enforce identity, membership, last-owner, and related invariants:

- Workspace `list`, `create`, `leave`, and `switch`. Every authenticated user may perform them, and
  each only ever touches workspaces the caller has access to.
- Workspace member `list`, workspace invite `list`, and workspace join-request `list`. Membership
  in the workspace is the gate.
- Project `list` and project member `list`. Membership in the workspace (project list) or the
  project (member list) is the gate. The project list result set is filtered by visibility as a
  query concern.
- Project member `leave`. Every project member may leave; the domain enforces last-admin-style
  invariants.
- Workspace invite `claim`. The invite token and the authenticated caller are both required.
- Workspace join-request `create`. The domain verifies the target workspace is public and the
  caller is not already a member.

### Subjects

`EnumPolicySubject` is the full v1 registry — every subject `@PolicyProtected` names across the 16
admin/user controllers, not a workspace/project-only subset:

```text
all                                             # CASL wildcard subject
activityLog  apiKey  device  featureFlag        # platform/admin resource subjects
passwordHistory  role  session  termPolicy  user
workspace  workspaceMember  workspaceInvite  workspaceJoinRequest
project  projectMember
analytic                                        # capability subject, model: null, workspace-scoped
```

The platform/admin resource subjects back the admin controllers' CRUD (`role`, `user`, `apiKey`,
`device`, `session`, `activityLog`, `passwordHistory`, `termPolicy`, `featureFlag`) — roughly 75
`@PolicyProtected` applications. They are load-bearing v1 subjects: platform-admin policies grant
them every `EnumPolicyAction` with no tenant scope.

Subjects may map to a persisted resource, a relation-backed resource, or a virtual capability such
as `analytic`; a subject need not be a one-to-one Prisma model. Subjects use camelCase
model-aligned names rather than colon-delimited values. For example, `workspaceInvite` maps
directly to `WorkspaceInvite`; `workspace:invite` would require an additional enum-to-model
translation without changing the boundary.

`PolicySubjectRegistry` is static application metadata, not persisted policy data. Each entry is
`{ model, scope }`: `model` is the Prisma model the subject resolves to, feeding `abilitySubjectOf`
and the CASL subject typing; `scope` is the condition key and placeholder `scopedCondition()` uses
to build a rule's stored condition (see [Scoping Placeholder Conventions](#scoping-placeholder-conventions)).
Enum values stay camelCase; Prisma model names stay PascalCase, which avoids using an enum string
as a model constructor or a Prisma delegate.

Each subject carries at most one scope pair, the condition key and placeholder tying a stored rule
to the active boundary (see [Scoping Placeholder Conventions](#scoping-placeholder-conventions) for
the normative rule). Scalar keys come from `Prisma.<Model>ScalarFieldEnum`, so a typo is a
compile-time error.

```ts
type IPolicyScopePair = {
    key: 'id' | 'workspaceId' | 'projectId';
    placeholder: '${workspace.id}' | '${project.id}';
};

type IPolicySubjectDefinition = {
    // Prisma model the subject resolves to; null for the `all` wildcard and the `analytic` capability.
    model: Prisma.ModelName | null;
    scope: IPolicyScopePair | null;
};

const PolicySubjectRegistry = {
    all: { model: null, scope: null }, // CASL wildcard subject; carried only by the super-admin `manage`/`all` rule.
    workspace: {
        model: Prisma.ModelName.Workspace,
        scope: { key: Prisma.WorkspaceScalarFieldEnum.id, placeholder: '${workspace.id}' },
    },
    workspaceMember: {
        model: Prisma.ModelName.WorkspaceMember,
        scope: {
            key: Prisma.WorkspaceMemberScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    workspaceInvite: {
        model: Prisma.ModelName.WorkspaceInvite,
        scope: {
            key: Prisma.WorkspaceInviteScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    workspaceJoinRequest: {
        model: Prisma.ModelName.WorkspaceJoinRequest,
        scope: {
            key: Prisma.WorkspaceJoinRequestScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    project: {
        model: Prisma.ModelName.Project,
        scope: { key: Prisma.ProjectScalarFieldEnum.id, placeholder: '${project.id}' },
    },
    projectMember: {
        model: Prisma.ModelName.ProjectMember,
        scope: {
            key: Prisma.ProjectMemberScalarFieldEnum.projectId,
            placeholder: '${project.id}',
        },
    },
    analytic: {
        // Virtual capability subject: no persisted record, so `model` is null; the scope pair
        // still ties the seeded `read` grant to the active workspace.
        model: null,
        scope: {
            key: Prisma.WorkspaceMemberScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },

    // Platform/admin resource subjects: full CRUD, no tenant scope, no scope pair. `role`, `user`,
    // `apiKey`, `device`, `session`, `activityLog`, `passwordHistory`, `termPolicy`, `featureFlag`
    // all share this shape (model = the matching Prisma model, scope = null).
    role: { model: Prisma.ModelName.Role, scope: null },
    // ...user, apiKey, device, session, activityLog, passwordHistory, termPolicy, featureFlag
} as const satisfies Record<EnumPolicySubject, IPolicySubjectDefinition>;
```

`all` and `analytic` are the only `model: null` subjects. `abilitySubjectOf(subject)` is the single
adapter at the ability boundary: it resolves the persisted enum subject to its registry Prisma
model, or to the virtual subject's own name (`'all'` or `'analytic'`), before the rule enters CASL.
Domain rules stay in application vocabulary while the request-scoped ability uses CASL subject names
and tagged records.

The registry has an entry for every `EnumPolicySubject` member; it needs no entries for health,
hello, country, or notification surfaces because those carry no subject. Role-scope-to-subject
alignment is not enforced by the registry or by rule validation: the only rejection at write time is
naming `all` directly (see [Stored Rule Contract](#stored-rule-contract)), so the seeded scoped-role
rules in [Initial Seed Rules](#initial-seed-rules) are what keeps a role's grants within its intended
domain. The operations listed under [Actions](#actions) as requiring no CASL permission carry no
subject and have no registry entry at all; visibility and membership still filter their result sets,
but that is a query concern the repository applies directly.

The `workspace` and `project` subjects are distinguished operationally: their active records are
resolved and cached in the request store (`WorkspaceStoreKey`/`ProjectStoreKey`) by
`WorkspaceGuard`/`ProjectGuard`, which run before `PolicyGuard`. Those boundary guards establish
resource context; `PolicyGuard` performs the type-level policy check, while feature domains perform
record-level checks for targets they load themselves (see [Enforcement Layers](#enforcement-layers)).

### Scoping Placeholder Conventions

Every workspace-scoped and project-scoped subject rule carries the placeholder condition tying it
to the boundary where the role was assigned. This is normative:

- These rules bind rules held by **workspace and project roles**. Platform-role rules are exempt
  from the mandatory scope pair.
- Every **workspace-scoped** subject (`workspace`, `workspaceMember`, `workspaceInvite`,
  `workspaceJoinRequest`) rule held by a workspace role MUST include a `workspaceId` key (`id` for
  the `workspace` subject itself) resolved from `${workspace.id}`, populated from the request's
  `x-workspace-id` header on user and shared routes and from the validated `:workspaceId` path
  param on admin routes.
- Every project subject rule other than a bare `project:create` carries the subject's own fixed
  scope pair from the registry: `id` resolved from `${project.id}` for `project`, `projectId`
  resolved from `${project.id}` for `projectMember`. The pair is the same whether a workspace role
  or a project role holds the rule; `${project.id}` populates from the request's `:projectId`
  route param, so the rule matches only while a project route resolved that path.
- A bare `project:create` rule (the single action `create`, nothing else) carries no scope
  condition: `scopePairOf` waives the pair for that one case, since no project exists yet to scope
  to. The create check evaluates the incoming project's own attributes before persistence.
- Conditions are generated and processed in three steps:
  1. Seeds and the rule DTO build the stored `conditions` through `scopedCondition(subject,
     action, extra?)`, which reads the subject's fixed scope pair from `PolicySubjectRegistry`
     (waived for a bare `project:create`) and merges in `extra`. A workspace-member rule is stored
     as `{ "workspaceId": "${workspace.id}" }`.
  2. Policy writes do not check whether a rule's subject, actions, or conditions match the role's
     scope. Condition keys and operators are stored as provided by the trusted policy author.
  3. At request time `interpolate` (in `policy.condition.util.ts`) replaces the placeholder
     with the resolved id, so CASL receives `{ "workspaceId": "<uuid>" }`. Nothing is injected
     implicitly: the stored rule is the single source of truth, and `accessibleWhere` reuses the same
     condition.
- `projectMember:create` carries the subject's fixed `projectId` scope pair and no member-instance
  condition: holding the permission means "can assign any member in the permitted project."
- Operations without a subject (see [Actions](#actions)) need no entry here: they carry no action, so
  they have no condition to validate.

The placeholder allow-list `interpolate` accepts is:

- `${user.id}` — record-level ownership rules like `{ "userId": "${user.id}" }`.
- `${workspace.id}` — every workspace-scoped condition.
- `${project.id}` — every project-role project condition.
- `${workspaceMember.id}` — a workspace-member instance condition when the membership guard has
  established that context.
- `${projectMember.id}` — a project-member instance condition when the membership guard has
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
    "userId": "${user.id}"
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

`interpolate` traverses an object or array and replaces recognized complete string values
from the placeholder list in
[Scoping Placeholder Conventions](#scoping-placeholder-conventions). Other condition strings remain
unchanged. The policy author is responsible for supplying a condition the target Prisma `WhereInput`
and CASL adapter can evaluate. Conditions are JSON data, not executable expressions.

The ability is built with `createPrismaAbility` in the Prisma `WhereInput` dialect, allow rules
before inverted rules per the composition order in
[Stored Rule Contract](#stored-rule-contract). Query filtering reads that ability through
`accessibleBy(ability, action).ofType(Prisma.ModelName.X)` — the `@casl/prisma@2.0.2` API, not the
older `accessibleBy(ability, action)[modelName]` bracket form. `PolicyDomain.accessibleWhere` wraps
`.ofType(...)`; repository queries compose its result with business predicates through `AND`
(active-row and workspace/project predicates), never spreading an authorization filter into another
`where` object.

**`createCaslExtension()` fail-closed** (stated here once): a denied ability makes `.ofType(...)`
return a special empty condition. Raw Prisma rejects it (it carries an internal marker field), so
the Prisma Client is extended with `createCaslExtension()`, which maps that empty condition to
"matches nothing" — denied list access returns `[]` instead of throwing, and single-record
`findFirstOrThrow`/`update`/`delete` reject with a not-found error. Registering the extension is what
makes list authorization fail closed rather than fail loud.

Object checks tag the loaded record with `subject(abilitySubjectOf(subject), record)` — a typed
Prisma plain object. Because Prisma returns class-less objects, this tagging is mandatory: CASL
cannot detect the subject type by `constructor` and would otherwise match no conditional rule.

**Worked example.** A `workspaceMember` `update` rule scoped to the active workspace is stored as:

```json
{
    "subject": "workspaceMember",
    "action": ["update"],
    "conditions": { "workspaceId": "${workspace.id}" }
}
```

`interpolate` resolves `${workspace.id}` from the request context before the rule is added
to the ability, so the ability carries the literal id, e.g. `{ "workspaceId": "3f2b..." }`. The same
rule drives both enforcement forms:

```ts
const ability = this.requestStoreService.get<IPolicyAbility>(PolicyAbilityStoreKey); // workspaceId: "3f2b..." resolved

// Record-level: the instance check evaluates the stored condition.
ability.can('update', subject('WorkspaceMember', memberFromOtherWorkspace)); // false — workspaceId mismatch
ability.can('update', subject('WorkspaceMember', memberFromActiveWorkspace)); // true

// Query-level: accessibleWhere wraps accessibleBy(ability, 'update').ofType(...WorkspaceMember),
// yielding a Prisma.WorkspaceMemberWhereInput, e.g. { workspaceId: "3f2b..." }.
const authorizationWhere = this.policyDomain.accessibleWhere(
    ability,
    EnumPolicyAction.update,
    EnumPolicySubject.workspaceMember
);
```

## Ability Lifecycle

`UserGuard` initializes the request ability from the authenticated user's platform-role policies.
`WorkspaceMemberGuard` and `ProjectMemberGuard` extend the same ability with the policies from the
resolved membership roles. Each guard resolves only the placeholders available at its boundary and
writes the resulting ability under `PolicyAbilityStoreKey`.

```ts
const ability = policyAbilityFactory.buildFromPolicies(
    rolePolicies,
    placeholders
);
requestStoreService.set(
    PolicyAbilityStoreKey,
    policyAbilityFactory.build([
        ...previousAbility.rules,
        ...ability.rules,
    ])
);
```

`PolicyAbilityFactory` is a pure composition service. `buildFromPolicies` starts with the supplied
previous ability's rules, interpolates recognized placeholders, drops rules whose conditions cannot
be resolved, and returns a new ability. It does not read or write request context.

The guard that establishes a policy boundary owns the request-store write. Workspace and project
member guards require an existing ability before merging their role policies, so an incomplete guard
chain fails with a missing request-context error. The project member guard permits an absent optional
membership row and leaves the workspace ability unchanged.

Consumers read the ability directly from `PolicyAbilityStoreKey`. `PolicyGuard` passes it to
`PolicyDomain.assertCan(ability, action, subject)`. Feature domains call `ability.can(action,
subject)` for local decisions and pass the same ability to
`PolicyDomain.accessibleWhere(ability, action, subject)` for Prisma filtering. A `manage` rule
remains CASL's literal wildcard action and is evaluated by the ability itself.

`assertCan` throws through `ForbiddenError.from(ability).throwUnlessCan(action, subject)` rather than
a bare boolean branch, so the matched rule's `reason` is captured. The domain maps that
`ForbiddenError` into `PolicyForbiddenException`, carrying the reason while keeping the existing i18n
status-code kit (`policy.constant.ts` `DocPolicyErrorResponses`). A denial therefore reports why
without losing its i18n message.

`PolicyGuard` reads static route metadata, loads the resolved ability from request context, and calls
`PolicyDomain.assertCan`. Policy loading is completed by the user and membership guards before the
policy guard runs.

`@RoleProtected()`, `RoleGuard`, and the super-admin bypass are removed after their routes carry
equivalent policy metadata. The super-admin role receives a persisted `manage`/`all` rule and
proceeds through the same ability construction and CASL evaluation as every other role, keeping
permission data as the single source of authorization decisions.

## Enforcement Layers

The two layers from [Overview & Scope](#overview--scope) are realized as `PolicyGuard` — which does
the type-level gate for every route and the record-level decision for the `workspace`/`project`
subjects, whose active record a boundary guard already cached — plus a domain/query check for the
sub-resource writes, whose target is loaded from a client-supplied id. The governing principle:
**the record-level decision runs at the layer where the target record first exists**, so nothing is
loaded twice.

### Guard Layer

`@PolicyProtected` applies `UseGuards(PolicyGuard)` + `SetMetadata(PolicyRequiredMetaKey, ...)`;
policy metadata names only `{ subject, action }`. The decorator usage is unchanged at the call site:

```ts
@PolicyProtected({ subject: EnumPolicySubject.workspace, action: [EnumPolicyAction.update] })
@Patch(':workspaceId')
updateWorkspace(...) { ... }
```

`PolicyGuard` keeps an explicit user check, reads the route metadata, loads the resolved ability, and
asks `PolicyDomain` for a type-level decision per required `{ subject, action }`. It does not load
policy rows or resource records. Boundary guards establish workspace and project context before it,
while feature domains perform record checks when they load sub-resource targets.

```ts
// guards/policy.guard.ts
canActivate(context: ExecutionContext): boolean {
    // An explicit user check stays ahead of the metadata and ability work as a
    // defense-in-depth measure on this auth-adjacent guard.
    const user = this.requestStoreService.get<IUser>(UserStoreKey);
    if (!user) {
        throw new AuthJwtAccessTokenInvalidException();
    }

    const policyMetadata = this.reflector.get<IPolicyRequired[]>(
        PolicyRequiredMetaKey,
        context.getHandler()
    );
    const requiredPolicies = policyMetadata ?? [];
    if (requiredPolicies.length === 0) {
        throw new PolicyPredefinedNotFoundException();
    }

    const ability = this.requestStoreService.get<IPolicyAbility>(PolicyAbilityStoreKey);
    if (!ability) {
        throw new RequestContextMissingException(PolicyAbilityStoreKey);
    }

    for (const { subject, action } of requiredPolicies) {
        for (const one of action) {
            this.policyDomain.assertCan(ability, one, subject);
        }
    }

    return true;
}
```

`PolicyDomain.assertCan` evaluates the supplied ability. `superAdmin`'s `manage`/`all` rule satisfies
the same checks as any other role's rules, without a role-name bypass in the policy guard.

### Domain Layer

The sub-resource writes — `workspaceMember`, `projectMember`, `workspaceInvite`,
`workspaceJoinRequest` — are decided in their feature domain, because their target row is chosen by a
client-supplied id (`:memberId`, `:inviteId`, …) that no guard resolves. The domain applies a
**hybrid** of two mechanisms driven by the same stored rule:

- **The write itself** — the domain runs an instance check on the record it has already loaded for
  its own logic: `assertCan(action, subject, record)`. No second `select` is issued, and the 403
  carries the matched rule's `reason`. This is where the stored scope conditions enforce, since CASL
  consults conditions only on an instance check. The mutation then `AND`-composes
  `accessibleBy(...).ofType(Model)` (via `PolicyDomain.accessibleWhere`) into its own `where`, so the write
  cannot touch a row the ability would deny even under a race.
- **Lists and detail queries** — the repository pushes `accessibleBy(ability, action).ofType(Model)`
  into the Prisma `where`, `AND`-composed with the business predicate. With
  [`createCaslExtension()`](#conditions-to-prisma) registered, a denied ability filters to nothing
  (`[]` for lists; not-found for single-record fetches) rather than throwing.

Every permission-controlled feature-domain entry point asserts its subject/action pair before the
primary write. Writes that are consequences of one authorized operation — creating memberships while
claiming an invite — stay inside that operation's transaction and do not invent separate permissions
for internal steps. The project list flow uses `PolicyDomain.accessibleWhere`, `AND`-composed with the
business predicate.

**Canonical end-to-end example.** `WorkspaceMemberDomain.updateMember` traces the domain layer:

```ts
async updateMember(user: IUser, workspaceId: string, memberId: string, dto: WorkspaceMemberUpdateRequestDto) {
    // 1. WorkspaceGuard/WorkspaceMemberProtected already established `workspaceId` as the
    //    caller's active workspace before this domain method runs.
    const member = await this.workspaceMemberRepository.findFirst({ id: memberId, workspaceId });
    if (!member) {
        // A record outside the caller's workspace, or one that does not exist, reads the same:
        // 404, never a 403 that would confirm a workspace-scoped row exists elsewhere.
        throw new WorkspaceMemberNotFoundException();
    }

    // 2. Record-level decision on the already-loaded record — no duplicate select. Only the
    //    instance form evaluates the stored `workspaceId` condition.
    this.policyDomain.assertCan(
        ability,
        EnumPolicyAction.update,
        EnumPolicySubject.workspaceMember,
        member
    ); // throws PolicyForbiddenException (with the matched rule's reason) → 403; the record is known to exist

    // 3. The mutation composes the authorization `where` so the write itself cannot touch a row
    //    the ability would deny, even under a race with a rule change.
    const authorizationWhere = this.policyDomain.accessibleWhere(
        ability,
        EnumPolicyAction.update,
        EnumPolicySubject.workspaceMember
    );
    return this.workspaceMemberRepository.updateFirst(
        { AND: [authorizationWhere, { id: memberId }] },
        dto,
    );
}
```

The 404-vs-403 split in step 1 vs. step 2 is deliberate: a row the boundary guards already scoped out
of the workspace is a 404 (it does not exist *for this caller*), while a row that exists in-scope but
that the caller's ability denies is a 403. Step 3 makes the authorization decision part of the same
database statement as the write, so there is no window between "checked" and "mutated" where a second
request could invalidate the decision — the instance check in step 2 gives the precise 403 with a
reason, and the `AND`-composed `where` in step 3 closes the TOCTOU gap.

### Alternatives Considered

The question "how do complex projects enforce record-level rules?" has three common answers. The
model above takes the strongest half of each, and the guard-vs-domain split follows from where the
target record is available rather than from a rule about layers.

| Option | Mechanism | Trade-off |
| --- | --- | --- |
| **Guard + hook** | A guard (or interceptor) loads the target record before the handler and runs the instance `can`. | For a sub-resource the guard must issue its own `select` to load the target, then the handler loads it again to mutate — a **duplicate select** per request. This is why sub-resource checks stay in the domain. It is *not* a cost for `workspace`/`project`, whose record `WorkspaceGuard`/`ProjectGuard` already cached — so those two subjects are checked in the guard exactly because no extra load is needed. |
| **Service-after-select** | The domain loads the record for its own logic, then runs the instance `can` on that object; the write is a separate statement. | No duplicate select, precise 403 + reason. But the decision and the write are two statements, leaving a **TOCTOU window**: a rule change or ownership transfer between the check and the write can let a now-denied write land. |
| **Query pushdown** | Every read and write folds `accessibleBy(...).ofType(Model)` into the Prisma `where`; there is no separate instance check. | Closes the TOCTOU window and never double-selects. But a denied single-object write surfaces only as **not-found**, so the caller cannot tell "no such record" from "forbidden," and the response cannot carry the rule's `reason`. |

The adopted model combines service-after-select (for the precise 403 + reason on the already-loaded
record, no duplicate select) with query pushdown (to fold the same authorization filter into the
write and close the TOCTOU window). It keeps record checks in feature domains and never pays a
duplicate select for a guard hook. Lists and detail use pushdown alone, where a 404-shaped empty
result is the correct and desirable outcome.

## Effective Permissions Endpoint

A client cannot render UI conditionally, and support cannot debug an access complaint, from a role
name alone — both need the caller's actual effective actions for the active workspace or project.
This adds one read-only endpoint per scope that reports the effective actions represented by the
request's resolved ability, with no new ability-construction path.

| Controller | Route | Guard stack | Response |
| --- | --- | --- | --- |
| `WorkspaceUserController` | `GET /permission` — current workspace from `x-workspace-id`, no path param, same as `get` | `@WorkspaceMemberProtected()`, `@WorkspaceProtected()`, `@UserProtected()`, `@FeatureFlagProtected('workspace')`, `@AuthJwtAccessProtected()`, `@ApiKeyProtected()`, `@RequestThrottle` | `{ permissions: IEffectivePermission[] }` scoped to `workspace`, `workspaceMember`, `workspaceInvite`, `workspaceJoinRequest`, and the workspace-role `project`/`projectMember`/`analytic` grants |
| `ProjectUserController` | `GET /permission/:projectId` — path param, same as every other project route | `@ProjectMemberProtected(owner, admin, member, viewer)`, `@ProjectProtected()`, `@WorkspaceMemberProtected()`, `@WorkspaceProtected()`, `@UserProtected()`, `@FeatureFlagProtected('workspace')`, `@AuthJwtAccessProtected()`, `@ApiKeyProtected()`, `@RequestThrottle` | `{ permissions: IEffectivePermission[] }` scoped to `project`, `projectMember` |

The workspace route takes no id because no workspace route does — `get`, `update`, `updateIsPublic`,
`updateSlug`, `ownershipTransfer`, and `leave` all resolve the active workspace from the
`x-workspace-id` header through `@WorkspaceCurrent()`. The project route carries `:projectId` because
every project route does — there is no per-request "current project" header, so `@ProjectCurrent()`
always resolves from the path.

The response reuses the `{ subject, actions }` row shape already returned by the role-policy list
endpoints (`PolicySchema`), rather than inventing a new one:

```ts
interface IEffectivePermission {
    subject: EnumPolicySubject;
    actions: EnumPolicyAction[]; // the concrete EnumPolicyAction members the caller holds for this subject
}
```

A `member` role and an `owner` role hitting `GET /permission` for the same workspace get different
results — a `member` holds no rule beyond `workspace:read`, while an `owner` holds the full
workspace-family grant (see
[Policy Matrix & Default Scoped Role Rules](#policy-matrix--default-scoped-role-rules) for the source
of these grants):

```json
// member
{ "permissions": [
    { "subject": "workspace", "actions": ["read"] }
] }

// owner
{ "permissions": [
    { "subject": "workspace", "actions": ["read", "update", "delete", "manage"] },
    { "subject": "workspaceMember", "actions": ["update", "delete", "manage"] },
    { "subject": "workspaceInvite", "actions": ["create", "update", "delete"] },
    { "subject": "workspaceJoinRequest", "actions": ["update", "manage"] },
    { "subject": "project", "actions": ["read", "create", "update", "delete", "manage"] },
    { "subject": "projectMember", "actions": ["create", "update", "delete", "manage"] },
    { "subject": "analytic", "actions": ["read"] }
] }
```

Each controller's handler follows its own existing idiom: the guards resolve the current resource
and member, and the handler passes them through:

```ts
// controllers/workspace.user.controller.ts
@Get('/permission')
async permission(
    @WorkspaceCurrent() workspace: Workspace,
    @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember
): Promise<IResponseReturn<{ permissions: IEffectivePermission[] }>> {
    return this.workspaceHttpService.getEffectivePermissions(workspace, workspaceMember);
}

// controllers/project.user.controller.ts
@Get('/permission/:projectId')
async permission(
    @ProjectCurrent() project: Project,
    @ProjectMemberCurrent() projectMember: ProjectMember
): Promise<IResponseReturn<{ permissions: IEffectivePermission[] }>> {
    return this.projectHttpService.getEffectivePermissions(project, projectMember);
}
```

The service reads the resolved ability from request context, iterates the workspace- or
project-scoped subjects and, for each `EnumPolicyAction` member, calls `ability.can(action, subject)`,
collecting only the actions that return `true`. A `manage` holder passes every one of those
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
| Workspace get (user and admin) | `workspace` | `read` | workspace member (user) or platform admin | `workspaceId` condition per [Scoping Placeholder Conventions](#scoping-placeholder-conventions); admin routes resolve it from `:workspaceId`. |
| Workspace update/visibility/slug/delete | `workspace` | `update`, `delete` | current workspace member | `workspaceId` condition. |
| Ownership transfer | `workspace` | `update` | current workspace membership | `workspaceId` condition; owner-exclusivity is enforced as a domain invariant in `WorkspaceMemberDomain.transferOwnership`, independent of the guard, since `update` is also held by `admin`. |
| Member list | none | none | current workspace member | No CASL metadata; membership is the gate. |
| Member role/remove | `workspaceMember` | `update`, `delete` (owner holds `manage`) | current workspace and member | `workspaceId` condition. |
| Invite list/claim | none | none | current member (list) or token-verified invite claimant (claim) | No CASL metadata. |
| Invite create | `workspaceInvite` | `create` | current workspace member | `workspaceId` condition. |
| Invite resend | `workspaceInvite` | `update` | current workspace member | `workspaceId` condition. |
| Invite revoke | `workspaceInvite` | `delete` | current workspace member | `workspaceId` condition. |
| Join request create/list | none | none | public workspace requester (create) or current workspace member (list) | No CASL metadata. |
| Join request accept/reject | `workspaceJoinRequest` | `update` (owner holds `manage`) | current workspace member | `workspaceId` condition. |
| Project list (user) | none | none | current workspace member | No CASL metadata on the route; `ProjectDomain.getListForMember` probes `can('read', 'project')` to decide whether the list spans every project in the workspace or only the caller's assigned projects. |
| Admin workspace/project list and workspace member list | `workspace` / `project` | `read` | platform admin | Platform-role rule, no scope condition; admin get uses `:workspaceId`/`:projectId`. |
| Project get/update/slug/delete | `project` | `read`, `update`, `delete` (owner holds `manage`) | current workspace and project membership | `id` condition resolved from `${project.id}`, the same pair whether a workspace or project role holds the rule. |
| Project create | `project` | `create` | current workspace member | Bare `project:create` carries no scope condition; the create check evaluates the incoming project's own attributes. |
| Project member list | none | none | current project member | No CASL metadata; membership is the gate. |
| Project member role/remove | `projectMember` | `update`, `delete` (owner holds `manage`) | current workspace, project, and project membership | `projectId` condition resolved from `${project.id}`. |
| Project member assign | `projectMember` | `create` | current workspace, project, and project membership | Carries the subject's fixed `projectId` scope pair; no member-instance condition. |
| Project leave | none | none | caller's current project membership | |
| Analytics (admin and user) | `analytic` | `read` | platform admin/super-admin (admin routes) or workspace owner/admin (user routes) | Capability subject with no persisted record; `workspaceId` condition resolved from `${workspace.id}` on the seeded workspace-scoped grants. |

**Default scoped role rules**

`PolicyDomain` combines platform-role policies with the workspace and project roles resolved from the
request memberships. Every capability below implicitly carries the subject's fixed scope pair per
[Scoping Placeholder Conventions](#scoping-placeholder-conventions), the same pair whichever kind of
role holds the rule, and matches the seeds in [Initial Seed Rules](#initial-seed-rules).

| Role     | Scope     | Capabilities                                                                                                                                                 |
| -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `owner`  | workspace | `workspace`: `manage`; `workspaceMember`: `manage`; `workspaceInvite`: `manage`; `workspaceJoinRequest`: `manage`; `project`: `manage`; `projectMember`: `manage`; `analytic`: `read` |
| `admin`  | workspace | `workspace`: `read`, `update`; `workspaceMember`: `update`, `delete`; `workspaceInvite`: `manage`; `workspaceJoinRequest`: `update`; `project`: `read`, `create`, `update`, `delete`; `projectMember`: `create`, `update`, `delete`; `analytic`: `read` |
| `member` | workspace | `workspace`: `read`                                                                                                                                          |
| `owner`  | project   | `project`: `manage`; `projectMember`: `manage`                                                                                                                |
| `admin`  | project   | `project`: `read`, `update`; `projectMember`: `create`, `update`, `delete`                                                                                    |
| `member` | project   | `project`: `read`                                                                                                                                              |
| `viewer` | project   | `project`: `read`                                                                                                                                              |

The workspace `admin` and `owner` roles receive project authority through workspace-scoped CASL
rules, so they act on projects in the active workspace without being assigned a project-scoped role.
Workspace `admin` holds full project control — `project` CRUD and `projectMember` CRUD — but not
`workspace:delete`, the destructive capability reserved for the owner.

Owner and admin differ by design: **owner holds `manage`; admin holds explicit CRUD.** Per the
`manage` principle in [Actions](#actions), owner roles are granted `manage` on every subject they
fully control, while admin roles keep explicit CRUD so a specific action (most notably `delete`) can
be withheld without touching the owner grant. Because `manage` grants exactly a subject's registered
actions, `workspace: owner` holding `workspaceMember: manage` is functionally `{update, delete}` and
`workspaceJoinRequest: manage` is functionally `{update}` — nothing beyond what admin's explicit CRUD
already lists for those two subjects. The one deliberate exception is `workspaceInvite`: both `admin`
and `owner` hold `manage`, granting create, resend, and revoke together rather than through a
separate CRUD grant. `workspace` itself keeps `manage` reserved for `owner` only, so
`workspace:delete` stays withheld from admin. Ownership transfer requires `workspace:update`, which
admin also holds, so owner-exclusivity for that operation is enforced as a domain invariant in
`WorkspaceMemberDomain.transferOwnership` rather than by the guard's required action.

Project `owner` and workspace `owner` both hold `manage` on `project` and `projectMember`, so an owner
never needs a narrower CRUD grant to fully control the projects in its scope. Project members and
viewers both start with `project:read`; members are the extension point for future project
capabilities, while viewers remain read-only unless the preset is deliberately changed. Project and
project-member listing are gated by membership alone, so no role carries a `projectMember` `read`
rule.

Role administration uses the `role` subject: platform administrators read the preset catalog and
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
  (`activityLog`, `apiKey`, `device`, `featureFlag`, `passwordHistory`, `role`, `session`,
  `termPolicy`, `user`), `read` on `analytic`, and `read` on `workspace` and `project`. The
  `analytic` grant is `rule(analytic, [read])` — a bare capability rule with **no** condition, since
  `analytic` carries no scope. Additional actions are added only with matching admin endpoints.
- `user` (platform): seeds no workspace-family rule. Workspace `list`/`create`, invite `claim`, and
  join-request `create` carry no CASL permission.
- Workspace roles: seed `owner`, `admin`, and `member` once with the workspace rows in the scoped role
  matrix — `owner` with `manage` on `workspace`, `workspaceMember`, `workspaceInvite`,
  `workspaceJoinRequest`, `project`, and `projectMember`; `admin` with explicit CRUD on the same
  subjects plus `workspaceInvite: manage` — including `analytic:read` for owner and admin (again
  `rule(analytic, [read])`, unconditioned).
- Project roles: seed `owner`, `admin`, `member`, and `viewer` once with the project rows in the
  scoped role matrix; `owner` with `manage` on `project` and `projectMember`; `projectMember:create`
  (held by `admin`) carries the selected role-scope condition and no member-instance condition.

The seed replaces the managed policy rows for the fixed roles and recreates them from the declarative
rule catalog. There is no priority-based identity or ordering.

The project creator is seeded as the project **`owner`** role (`EnumRoleProjectKey.owner`), so a
freshly created project has an owner from the first request. This requires the `owner` key on
`EnumRoleProjectKey` and the project `owner` role row (scope `project`, key `owner`) in the role seed.

## Resolved Decisions

The design questions raised during planning are settled:

- **Record-level enforcement layer** — the record-level decision runs at the layer where the target
  record first exists (see [Enforcement Layers](#enforcement-layers)): feature domains decide
  sub-resource writes on the records they load from client-supplied ids. They compose
  `accessibleBy(...).ofType(Model)` into the Prisma `where` to close
  the TOCTOU window and to filter lists/detail. The
  [Alternatives Considered](#alternatives-considered) table records why feature-domain checks and
  query pushdown are combined.
- **`@PolicyProtected` guard** — retained as the type-level route gate. Record-level checks remain in
  feature domains where the target record is available (see [Guard Layer](#guard-layer)).
- **Generating Prisma `where` from rule conditions** — `PolicyDomain.accessibleWhere` over
  `accessibleBy(...).ofType(Model)`, fail-closed via `createCaslExtension()` (see
  [Conditions to Prisma](#conditions-to-prisma)).
- **`manage` stays unbounded on every subject** — CASL's `createAliasResolver` explicitly forbids
  aliasing or scoping `manage`, so bounding it per subject is application responsibility CASL does
  not support out of the box. Rather than hand-roll a substitute, `manage` passes through
  `PolicyAbilityFactory` as CASL's literal wildcard action whatever subject it names, `all` and any
  specific subject alike (see [Actions](#actions), [Ability Lifecycle](#ability-lifecycle)).
- **Write-time action and scope validation** — policy writes persist structurally valid rule data
  without role-scope compatibility checks. Scope conditions are supplied by seed/catalog helpers,
  while CASL evaluates the resulting rules at request time (see
  [Stored Rule Contract](#stored-rule-contract), [Subjects](#subjects)).
- **`IPolicyRepository`** — kept. It has no DI-token seam of its own, but the other modules keep
  repository interfaces as house style, so it stays for consistency.
- **Project creator role** — the creator becomes the project `owner`, not `admin` (see
  [Initial Seed Rules](#initial-seed-rules)).
- **Member-instance placeholders** — `${workspaceMember.id}` and `${projectMember.id}` stay dropped.
  The follow-up trigger is the first rule that needs to scope to a specific member row; until then no
  rule references a member instance.

## Test Plan

Unit specs live under `test/**/*.spec.ts`, ordered most critical first — a failure in Tier 1 means an
authorization decision can be silently wrong. Run scoped suites with `pnpm test policy`,
`pnpm test role`, `pnpm test workspace`, and `pnpm test project`; query-adapter integration coverage
runs against PostgreSQL in its dedicated environment, outside this unit suite.

### Tier 1 — Critical (authorization correctness and security boundary)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyGuard.canActivate` | Required policy absent from ability | Guard rejects the request instead of falling through |
| `PolicyDomain.assertCan` | Ability denies the action | Throws `PolicyForbiddenException`, does not return `false` silently |
| Ability build (`PolicyAbilityFactory`) | Inverted rule vs. allow, same subject, in either input order | Matching inverted rules remain authoritative |
| Record-level `can(action, subject, record)` | Record from a different workspace against a `workspaceId`-scoped rule | Condition mismatch denies — the instance check evaluates the scoping placeholder, the type-level check does not |
| `PolicyAbilityFactory.buildFromPolicies` | Platform, workspace, and project rules for one user | Guards compose platform → workspace → project policies and interpolate the available placeholders |
| `PolicyGuard.canActivate` | `superAdmin` role, no special-cased bypass in code | Evaluates through the seeded `manage`/`all` rule like any other role, not a hardcoded short-circuit |
| Policy write persistence (`PolicyDomain` create/update path) | Structurally valid rules across platform, workspace, and project roles | Persists the rule without applying role-scope compatibility checks |

### Tier 2 — High (core data-shaping and business invariants)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyDomain.accessibleWhere` | Subject with an active-scope condition | Produces the exact Prisma `WhereInput` the repository will `AND` into its query |
| Policy seed (`policy.seed.ts` or equivalent) | Re-running the seed after a rule's conditions changed | Replaces the managed policy set without priority-based identity |
| Role assignment domain (`User`/`WorkspaceMember`/`ProjectMember` role write) | Assigning a workspace-scoped role to a `ProjectMember.roleId` (wrong scope) | Rejected — scope validation runs before the write, not just at read time |
| `WorkspaceDomain` ownership transfer / last-owner check | Attempt to remove or demote the sole `owner` after the CASL migration | Last-owner invariant still blocks the operation regardless of the caller's CASL grant |
| `getEffectivePermissions` | Role with a narrow rule set vs. a role with a broad one, same subject | Returned action list matches exactly what `can()` would allow for each action — no extra, no missing |

### Tier 3 — Medium (composition and boundary wiring)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyRepository` read path | Rows for one role fetched in bulk | Returns the role's policy rows without requiring priority ordering |
| Guard ability composition | User, workspace-member, and project-member guards in sequence | Each guard stores the cumulative resolved ability and never stores raw policy rows |
| Guard stacking (`WorkspaceGuard`/`ProjectGuard` + `PolicyGuard`) | Cross-workspace project id in the route | Boundary guard rejects before `PolicyGuard` runs — CASL never sees an out-of-boundary record |
| Membership-only operations (workspace switch, workspace/project leave) | Caller has no matching CASL rule at all | Operation still succeeds — these routes carry no policy metadata by design |

### Tier 4 — Low (DTO validation and catalog completeness)

| Method | Description | What it tests |
| --- | --- | --- |
| Rule DTO validation | `conditions` is not a JSON object | Rejected at the DTO boundary, before reaching the domain |
| `PolicySubjectRegistry` shape check | Iterate every `EnumPolicySubject` member | Each has a registry entry with `model` and `scope`; concrete scope keys use the corresponding generated Prisma scalar-field enum member |
| Seed data catalog | Every seeded role/scope pair | Maps only to actions valid for its scope (no platform action on a workspace role, etc.) |
