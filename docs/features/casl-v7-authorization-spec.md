# CASL v7 Authorization Implementation Spec

## Table of Contents

- [Scope](#scope)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Existing Authorization Surface](#existing-authorization-surface)
- [`src/modules/policy/` Module Changes](#srcmodulespolicy-module-changes)
- [Authorization Model](#authorization-model)
  - [Boundary Composition](#boundary-composition)
  - [Scoped Roles](#scoped-roles)
  - [Actions](#actions)
  - [Subjects](#subjects)
  - [Scoping Placeholder Conventions](#scoping-placeholder-conventions)
- [Stored Rule Contract](#stored-rule-contract)
- [PostgreSQL and Prisma Conditions](#postgresql-and-prisma-conditions)
  - [Leveraging a condition in practice](#leveraging-a-condition-in-practice)
  - [Turning a condition into a Prisma filter](#turning-a-condition-into-a-prisma-filter)
- [Ability Lifecycle](#ability-lifecycle)
  - [Checking a user's permission](#checking-a-users-permission)
  - [How `PolicyGuard` changes](#how-policyguard-changes)
- [Object Enforcement](#object-enforcement)
  - [Protecting a resource end to end](#protecting-a-resource-end-to-end)
- [Effective Permissions Endpoint](#effective-permissions-endpoint)
- [Workspace and Project Policy Matrix](#workspace-and-project-policy-matrix)
- [Default Scoped Role Rules](#default-scoped-role-rules)
- [Initial Seed Rules](#initial-seed-rules)
- [Delivery Plan](#delivery-plan)
  - [Phase 1: Characterize Existing Behavior](#phase-1-characterize-existing-behavior)
  - [Phase 2: Scoped Role Migration](#phase-2-scoped-role-migration)
  - [Phase 3: Schema, DTO, and Seed Migration](#phase-3-schema-dto-and-seed-migration)
  - [Phase 4: Typed Prisma Ability](#phase-4-typed-prisma-ability)
  - [Phase 5: Object Checks](#phase-5-object-checks)
  - [Phase 6: Prisma Query Filtering](#phase-6-prisma-query-filtering)
  - [Phase 7: Explicit Actions](#phase-7-explicit-actions)
  - [Phase 8: Effective Permissions Endpoint](#phase-8-effective-permissions-endpoint)
- [Test Matrix](#test-matrix)
- [Unit Test Plan](#unit-test-plan)
  - [Tier 1 — Critical (authorization correctness and security boundary)](#tier-1--critical-authorization-correctness-and-security-boundary)
  - [Tier 2 — High (core data-shaping and business invariants)](#tier-2--high-core-data-shaping-and-business-invariants)
  - [Tier 3 — Medium (composition and boundary wiring)](#tier-3--medium-composition-and-boundary-wiring)
  - [Tier 4 — Low (DTO validation and catalog completeness)](#tier-4--low-dto-validation-and-catalog-completeness)
- [Acceptance Checklist](#acceptance-checklist)

## Scope

This specification defines a CASL v7 authorization model for the PostgreSQL and Prisma
application. It covers platform roles, workspace and project boundaries, stored rule evaluation,
object checks, and Prisma query filtering.

The implementation uses `@casl/ability` v7 and adds `@casl/prisma` when the Prisma query
adapter lands. Policy decisions remain in the policy domain and feature domains. Controllers
continue to delegate HTTP work, and repositories continue to own Prisma query shapes.

## Goals

- Store complete CASL rules with allow and deny semantics.
- Evaluate one request-scoped ability consistently in guards and domains.
- Preserve the workspace and project guards as resource-boundary checks.
- Support object-level checks and PostgreSQL/Prisma query filters.
- Validate persisted rules, conditions, and placeholders before storage.
- Give every permission-controlled operation an explicit subject/action pair.
- Keep role, policy, workspace, and project behavior covered by focused unit tests.

## Non-Goals

- Replace authentication, feature flags, term-policy gates, or workspace and project membership guards.
- Add a second authorization language beside CASL.
- Infer authorization from route names or HTTP verbs.
- Add unrestricted JSON conditions or arbitrary request placeholders.
- Change all feature repositories in the first implementation phase.
- Restrict rules to individual fields. Field-level permissions can extend the rule contract later.
- Allow workspaces or projects to create, update, or delete their own roles.

## Existing Authorization Surface

Policies are persisted as rows related to a platform `Role`. A row currently stores one
`subject` and an array of `action` values. `RoleGuard` loads the caller's role policies into
request storage, and `PolicyGuard` creates a `MongoAbility` for static route checks.

`EnumPolicySubject` already includes `workspace` and `project`. Their admin read routes use
`@RoleProtected()` and `@PolicyProtected()`. User-scope workspace and project routes use the
workspace, project, and membership guard family to establish and protect the active workspace
and project.

This specification replaces the one-subject-per-row storage contract. It includes the Prisma
schema migration, client generation, seed update, and all affected role/policy DTOs. The schema
change is part of this work because full CASL rules cannot be represented by the existing table.

## `src/modules/policy/` Module Changes

The subject-level model above lands as concrete changes to the files under
`src/modules/policy/`. Nothing moves out of the module; the factory, guard, decorator, and
domain keep their current names and responsibilities, but each supports the simple v1 rule
contract.

| File | Today | Target state |
| --- | --- | --- |
| `factories/policy.factory.ts` | `PolicyAbilityFactory.createForUser()` builds an `AbilityBuilder<IPolicyAbilityRule>` from flat `Policy[]` rows with one `can(action, subject)` call per row — no conditions. | Adds each rule's `conditions`, `inverted` flag, and optional `reason`, mapping its subject through `abilitySubjectOf` — the registry's Prisma model, or the virtual subject's own name. Inverted rules are added after allows so a matching deny is authoritative. |
| `guards/policy.guard.ts` | `canActivate` reads `PolicyRequiredMetaKey` metadata plus CLS-stored `user`/`policies`, and delegates to `PolicyDomain.validatePolicyGuard`, which short-circuits `true` for `superAdmin`. | `canActivate` reads the same metadata, keeps an explicit user check as defense-in-depth, and calls `PolicyDomain.assertCan` once per required `(subject, action)` pair. The `superAdmin` short-circuit is removed — `superAdmin` gets a persisted `manage`/`all` rule and evaluates through the same ability as every other role (see [Ability Lifecycle](#ability-lifecycle)). |
| `decorators/policy.decorator.ts` | `@PolicyProtected(...requiredPolicies: PolicyRequestDto[])` applies `UseGuards(PolicyGuard)` + `SetMetadata(PolicyRequiredMetaKey, requiredPolicies)`. | Unchanged at the call site — policy metadata still names only `{ subject, action }`. |
| `domains/policy.domain.ts` | `PolicyDomain` is admin CRUD orchestration (create/update/delete a role's policy rows) plus `validatePolicyGuard`. | Gains the ability-lifecycle surface — `buildForRequest`, `getCurrentAbility`, `can`, `assertCan`, `toWhere` (see [Ability Lifecycle](#ability-lifecycle)) — used by guards and by feature domains directly. `validatePolicyGuard` is replaced by `assertCan`. |
| `interfaces/policy.interface.ts` | `IPolicyAbilityRule = MongoAbility<[EnumPolicyAction, IPolicyAbilitySubject]>`; `IPolicyAbilitySubject` is the flat `EnumPolicySubject`. | Adds `IPolicyAbility` (the request-scoped `PrismaAbility` alias used by `PolicyDomain`), `IPolicySubjectInput` (an enum subject or a loaded record paired with its registry subject), `IPolicyScopePair` (the condition key and placeholder tying a rule to its boundary), and `IPolicyRuleSubject` (a Prisma model name or the `all`/`analytic` virtuals) alongside the existing rule type. |
| `interfaces/policy.repository.interface.ts`, `repositories/policy.repository.ts` | Read/write `Policy` rows keyed by `(roleId, subject)`; `action` is a typed `EnumPolicyAction[]` column. | Read/write policy rows with typed `action`, optional `conditions`, `inverted`, and explanatory `reason`; no priority metadata is stored. |
| — (new) `PolicySubjectRegistry`, `policy.condition.util.ts` | Do not exist. | New files inside `src/modules/policy/` — the registry maps each `EnumPolicySubject` to its Prisma model, valid action list, and scope pair ([Subjects](#subjects)); `policy.condition.util.ts` holds placeholder resolution and scope helpers: `resolvePlaceholders`, `scopePairOf`, `scopedCondition`, and `hasScopePair` ([PostgreSQL and Prisma Conditions](#postgresql-and-prisma-conditions)). |

What does **not** change: `controllers/policy.admin.controller.ts` and
`controllers/policy.system.controller.ts` keep their existing routes and request/response DTO
shapes — the rule contract is richer, but the HTTP surface for reading and writing a role's
policies is the same set of endpoints. The `Policy` Prisma model keeps its role relation and its
one-row-per-something identity; it gains the new columns from
[Stored Rule Contract](#stored-rule-contract) rather than moving into a second table. The
`@PolicyCurrent()` param decorator, which reads the CLS-stored raw `Policy[]` for the current
user, is kept as-is for call sites that need the raw rows rather than an evaluated ability
decision.

## Authorization Model

### Boundary Composition

Platform roles and workspace/project memberships describe different dimensions of authority.

- Admin-scope routes use `@PolicyProtected()`. A route narrowed to a workspace or project
  accepts a validated path id and does not read `x-workspace-id`.
- User and shared workspace routes keep `@WorkspaceProtected()` and the membership-resolving
  `@WorkspaceMemberProtected()` form as the workspace boundary. Project routes also keep
  `@ProjectProtected()` and `@ProjectMemberProtected()`.
- CASL adds capability and record decisions after those guards establish the caller and
  workspace/project context. CASL does not turn a cross-workspace project into an accessible
  record.
- Workspace-owner project authority is expressed by the owner's workspace-role rules. It remains
  constrained to the active workspace and does not become a global project permission.

### Scoped Roles

`EnumWorkspaceMemberRole`, `EnumProjectMemberRole`, and `EnumRoleType` are removed. Permission
decisions come from CASL rules, so retaining any of these enums as a route or domain gate would
leave a second authorization system in place. Built-in roles use immutable keys such as
`superAdmin`, `admin`, `user`, `owner`, `member`, and `viewer`. `scope` and `key` identify a role;
the key does not grant permission by itself.

The existing `Role` model becomes the common policy parent for `platform`, `workspace`, and
`project` scopes. Sharing the model is appropriate because every role is the same concept: a
named, assignable collection of CASL rules. Reusing the current platform-only shape
without an explicit scope is not appropriate. Workspace roles are assignable only to workspace
members, project roles are assignable only to project members, and platform roles are assignable
only to users. `Policy` continues to point to `Role`, so all scopes use the same rule validation
and evaluation path.

The expected Prisma shape is:

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
- Project: `admin`, `member`, `viewer`.

`@@unique([scope, key])` permits the same readable key in different scopes while keeping each
seeded role unambiguous. Assignment domains validate the expected scope before writing
`User.roleId`, `WorkspaceMember.roleId`, or `ProjectMember.roleId`. Role keys and scopes are
immutable because domains use them for assignment validation and ownership invariants.

Only platform administrators can update role display metadata or policy rows. The first version
does not expose role creation or deletion, and workspace/project administrators have no role or
policy administration endpoints. A policy update changes that preset for every assignment using
the role. Workspace-owned custom roles remain a future schema and API extension.

`WorkspaceMember.role` changes to `roleId` with a relation to a workspace-scoped role.
`ProjectMember.role` changes to `roleId` with a relation to a project-scoped role. The role
resolver validates the expected workspace or project scope before the role enters request
storage.

`WorkspaceInvite.workspaceRole` and `WorkspaceInvite.projectRole` likewise become
`workspaceRoleId` and `projectRoleId`. Invite creation validates both role scopes before storing
the invitation, and invite claim repeats the validation inside the membership transaction.

The seeded workspace and project roles use the matrix in this document. Ownership transfer,
last-owner protection, peer management, and role-scope validation remain domain invariants.

### Actions

`manage` remains CASL's only wildcard action and `all` remains its wildcard subject. `manage`
with `all` is the super-admin rule; it is not editable through the role-policy API and `all`
accepts no other action. `manage` on a specific subject means every action on that subject, and
is valid on any persisted subject — this is ordinary CASL usage, not a separate mechanism from
the `all`-wildcard case.

Every subject uses one action vocabulary, `EnumPolicyAction { manage, read, create, update,
delete }`, stored in the `Policy.action` column as a typed Prisma enum array. There are no
per-subject workflow enums: a domain operation maps to a CRUD verb, or to `manage`/`update` when
it is a privileged or status-transition action that must not be granted piecemeal.

`PolicySubjectRegistry` (see [Subjects](#subjects)) is the **enforced** catalog of which actions
are valid for which subject — unlike a purely descriptive table, an action not registered for a
subject is rejected at rule-validation time, not merely inert:

| Subject                | Actions                              | Operations covered                                                             |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| `workspace`            | `read`, `update`, `delete`, `manage` | `manage` covers ownership transfer and implies `read`/`update`/`delete`         |
| `workspaceMember`      | `update`, `delete`                   | role change, member removal                                                    |
| `workspaceInvite`      | `create`, `manage`                   | `manage` covers create, resend, and revoke                                     |
| `workspaceJoinRequest` | `update`                             | accept and reject (a status transition; cannot be granted separately)          |
| `project`              | `read`, `create`, `update`, `delete` | project lifecycle                                                              |
| `projectMember`        | `create`, `update`, `delete`         | `create` assigns a member; role change; removal                                |

Granting `manage` on `workspaceInvite` therefore grants resend and revoke together with create,
and granting it on `workspace` grants ownership transfer. Only the workspace `owner` role holds
`workspace:manage`; the domain still restricts transfer to the owner.

`update` on `workspace` covers name, description, visibility, and slug changes. `update` on
`project` covers name, description, and slug changes. These operations receive separate actions
only when the product needs different grants.

The following operations require no CASL permission and have no subject or action:

- Workspace `list`, `create`, `leave`, and `switch`. Every authenticated user may perform them,
  and each only ever touches workspaces the caller has access to. Switching succeeds when the
  caller belongs to the target workspace and fails otherwise. Leaving a workspace or project is a
  self-service membership operation.
- Workspace member `list`, workspace invite `list`, and workspace join-request `list`. Membership
  in the workspace is the gate, so any member may list them.
- Project `list` and project member `list`. Membership in the workspace (project list) or the
  project (member list) is the gate, so any such member may list. The project list result set is
  filtered by visibility as a query concern.
- Project member `leave`. Every project member may leave; the domain enforces last-admin style
  invariants.
- Workspace invite `claim`. The invite token and the authenticated caller are both required.
- Workspace join-request `create`. The domain verifies that the target workspace is public and
  that the caller is not already a member.

The domains still enforce identity, membership, last-owner, and related business invariants.

### Subjects

The policy subject enum contains these workspace/project resources:

```text
workspace
workspaceMember
workspaceInvite
workspaceJoinRequest
project
projectMember
```

Each subject maps to one persisted resource with its own conditions and Prisma query shape.
Subjects use camelCase model-aligned names rather than colon-delimited values. For example,
`workspaceInvite` maps directly to `WorkspaceInvite`; `workspace:invite` would require an
additional enum-to-model translation without changing the permission boundary.

`PolicySubjectRegistry` maps every enum value to its Prisma model, valid action list, condition
columns, and mandatory scope pair. Enum values remain camelCase; Prisma model names remain
PascalCase. This avoids using an enum string as a model constructor or a Prisma delegate, and —
unlike deriving everything mechanically from the subject name — it lets rule validation reject an
action that is not registered for its subject, checked against the single `EnumPolicyAction`
vocabulary from [Actions](#actions).

Every subject definition also carries a `scope` pair — the condition key and placeholder tying
its stored rules to the active workspace or project (see
[Scoping Placeholder Conventions](#scoping-placeholder-conventions) below for the normative rule
and its one exception, `project:create`):

```ts
type IPolicyScopePair = {
    key: 'id' | 'workspaceId' | 'projectId';
    placeholder: '${workspace.id}' | '${project.id}';
};

type IPolicySubjectDefinition = {
    // Prisma model the subject resolves to; null for the `all` wildcard and `analytic`.
    model: Prisma.ModelName | null;
    actions: readonly EnumPolicyAction[];
    // The condition pair tying a scoped-role rule to the active workspace or project.
    scope: IPolicyScopePair | null;
};

const PolicySubjectRegistry = {
    workspace: {
        model: Prisma.ModelName.Workspace,
        actions: [
            EnumPolicyAction.read,
            EnumPolicyAction.update,
            EnumPolicyAction.delete,
            EnumPolicyAction.manage,
        ],
        scope: {
            key: Prisma.WorkspaceScalarFieldEnum.id,
            placeholder: '${workspace.id}',
        },
    },
    workspaceMember: {
        model: Prisma.ModelName.WorkspaceMember,
        actions: [EnumPolicyAction.update, EnumPolicyAction.delete],
        scope: {
            key: Prisma.WorkspaceMemberScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    workspaceInvite: {
        model: Prisma.ModelName.WorkspaceInvite,
        actions: [EnumPolicyAction.create, EnumPolicyAction.manage],
        scope: {
            key: Prisma.WorkspaceInviteScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    workspaceJoinRequest: {
        model: Prisma.ModelName.WorkspaceJoinRequest,
        actions: [EnumPolicyAction.update],
        scope: {
            key: Prisma.WorkspaceJoinRequestScalarFieldEnum.workspaceId,
            placeholder: '${workspace.id}',
        },
    },
    project: {
        model: Prisma.ModelName.Project,
        actions: [
            EnumPolicyAction.read,
            EnumPolicyAction.create,
            EnumPolicyAction.update,
            EnumPolicyAction.delete,
        ],
        // Mandatory `${project.id}` -> `id` condition, in addition to the workspace
        // scope a project inherits transitively through `workspaceId` — waived only for
        // `create` (see §5 exception).
        scope: {
            key: Prisma.ProjectScalarFieldEnum.id,
            placeholder: '${project.id}',
        },
    },
    projectMember: {
        model: Prisma.ModelName.ProjectMember,
        actions: [
            EnumPolicyAction.create,
            EnumPolicyAction.update,
            EnumPolicyAction.delete,
        ],
        // Mandatory `${project.id}` -> `projectId` condition. `create` (assigning a member) is
        // the exception noted in §5: the permission itself is the only gate for "can assign any
        // member in the project," so a `create` rule carries the `projectId` scope but no
        // member-instance (`id`) condition.
        scope: {
            key: Prisma.ProjectMemberScalarFieldEnum.projectId,
            placeholder: '${project.id}',
        },
    },
} as const satisfies Record<string, IPolicySubjectDefinition>;
```

Scope keys are assigned from the generated client scalar-field enums for the corresponding
Prisma model. Workspace and project resources use `id`; workspace-scoped member, invite, and
join-request resources use their model's `workspaceId`; project members use
`Prisma.ProjectMemberScalarFieldEnum.projectId`. The virtual `analytic` subject uses
`Prisma.WorkspaceMemberScalarFieldEnum.workspaceId` for its workspace boundary because it has no
Prisma model of its own. This makes a scope-key typo a compile-time error while the stored
condition remains the same string key. Scope keys are derived from the generated client
(`Prisma.<Model>ScalarFieldEnum`), so they cannot drift from `schema.prisma`. `all` and
`analytic` are virtual subjects (`model: null`); `abilitySubjectOf(subject)`
resolves an enum subject to its registry model, or to the virtual's own name, when an ability
rule is built or checked.

The registry includes definitions for every existing platform subject before rule validation is
enabled for that subject. Rule validation rejects an action that is not registered for its
subject. Relation paths use Prisma relation syntax and are listed explicitly.

A subject's `scope` pair also drives role-scope validation: platform roles may hold any
subject and are exempt from the mandatory scope pair (the platform `admin` holds `read` on
`workspace` and `project` without a scope condition); workspace roles hold platform-level,
workspace-level, and project-level subjects (the workspace `owner` holds project rules); project
roles hold project-level subjects only. The mandatory scope pair applies only to workspace and
project roles. See [Scoping Placeholder Conventions](#scoping-placeholder-conventions) for the
normative rule.

The operations listed under [Actions](#actions) as requiring no CASL permission (workspace
`list`/`create`/`leave`/`switch`, member/invite/join-request `list`, project `list`/member
`list`, project member `leave`, invite `claim`, and join-request `create`) carry no subject and
no action — they have no registry entry at all. Visibility and membership still filter their
result sets, but that is a query concern the repository applies directly, not a policy decision.

### Scoping Placeholder Conventions

Every workspace-scoped and project-scoped subject rule carries the placeholder condition that
ties it to the active boundary. This was implied by the placeholder allow-list and the "Default
Scoped Role Rules" prose; it is a normative rule:

- The rules below bind rules held by **workspace and project roles**. Platform-role rules are
  exempt from the mandatory scope pair.
- Every **workspace-scoped** subject (`workspace`, `workspaceMember`, `workspaceInvite`,
  `workspaceJoinRequest`) rule held by a workspace role MUST include a `workspaceId` key (`id`
  for the `workspace` subject itself) resolved from the `${workspace.id}` placeholder, populated
  from the request's `x-workspace-id` header on user and shared routes and from the validated
  `:workspaceId` path param on admin routes.
- Every **project-scoped** subject (`project`, `projectMember`) rule's stored condition MUST
  include a `projectId` key (`id` for the `project` subject itself) resolved from the
  `${project.id}` placeholder, populated from the request's `:projectId` route param. This is in
  addition to the workspace scope a project rule already carries transitively, because a project
  belongs to a workspace.
- Conditions are generated and processed in three steps:
  1. Seeds and the rule DTO build the stored `conditions` through
     `scopedCondition(subject, action, extra?)`, which returns `{ [key]: placeholder, ...extra }`
     from the subject's registry scope pair (`scopePairOf`). For example, a `workspaceMember`
     rule is stored as `{ "workspaceId": "${workspace.id}" }`.
  2. Rule validation requires every non-inverted rule of a scoped subject to carry
     `conditions[key] === placeholder` at the top level or inside a top-level `AND`. A pair
     nested under `OR` or `NOT` does not count. Inverted rules are exempt. Other condition keys
     and operators are stored as provided by the trusted policy author.
  3. At request time `resolvePlaceholders` (in `policy.condition.util.ts`) replaces the
     placeholder with the resolved id, so CASL receives `{ "workspaceId": "<uuid>" }`. Nothing
     is injected implicitly: the stored rule is the single source of truth, and `toWhere`
     reuses the same condition.
- The mandatory scope pair is waived only for `project:create`. The ability is built from the
  caller's role in the workspace `WorkspaceProtected` already verified, and creation takes its
  `workspaceId` from that same context, so a `workspaceId` condition on the new row could never
  fail. `projectMember:create` (assigning a member) keeps its `projectId` scope but carries no
  member-instance (`id`) condition: holding the permission means "can assign any member in the
  project."
- Operations without a subject (see [Actions](#actions)) need no entry in this rule at all: they
  carry no action, so they have no condition to validate. Listing is a query concern —
  visibility and membership filter the result set directly — not a policy decision.

The placeholder allow-list `resolvePlaceholders` accepts is:

- `${user.id}`
- `${user.roleId}`
- `${user.role.key}`
- `${workspace.id}`
- `${workspaceMember.id}`
- `${workspaceMember.roleId}`
- `${workspaceMember.role.key}`
- `${project.id}`
- `${projectMember.id}`
- `${projectMember.roleId}`
- `${projectMember.role.key}`
- `${request.language}`

## Stored Rule Contract

One policy row represents one CASL rule. A rule has one subject, one or more actions, optional
conditions, an optional inversion, and optional explanatory reason metadata. The v1 contract
deliberately has no priority or field-level permission metadata.

```ts
interface IPolicyRuleStorage {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
    conditions: Prisma.JsonValue | null;
    inverted: boolean;
    reason: string | null;
}
```

`action` is `EnumPolicyAction[]` — the single action vocabulary from [Actions](#actions) means
the column stays a typed Prisma enum array; no `String[]` migration is needed. The policy domain
validates the (subject, action) pair against `PolicySubjectRegistry` before persistence. Conditions
are trusted JSON in v1 and are passed through to CASL after placeholder resolution.

The Prisma `Policy` model keeps `action EnumPolicyAction[]` and gains `conditions Json?`,
`inverted Boolean @default(false)`, and `reason String?`. The old subject uniqueness is replaced
with an index on `[roleId, subject]`, allowing multiple rules for the same subject.

Ability composition is deterministic: platform rules are added first, workspace rules second,
and project rules third. Within the composed set, allow rules are added before inverted rules, so
an inverted rule is authoritative whenever it matches. An absent narrower rule does not revoke a
broader allow; a narrowing role uses an explicit inverted rule.

The role-policy API exposes a rule request DTO with one subject, action array, optional conditions,
optional inverted flag, and optional reason. The existing single-row endpoints retain these
semantics through the create and update DTOs.

## PostgreSQL and Prisma Conditions

Persisted conditions use the Prisma `WhereInput` dialect for the subject's model. They do not use
Mongo operators or dotted paths. For example, an ownership rule is stored as:

```json
{
    "userId": "${user.id}"
}
```

A relation condition is represented with Prisma operators:

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

`resolvePlaceholders` traverses an object or array and replaces recognized complete string values
from the placeholder list in [Scoping Placeholder Conventions](#scoping-placeholder-conventions).
Other condition strings remain unchanged. The policy author is responsible for supplying a
condition that the target Prisma `WhereInput` and CASL adapter can evaluate. Conditions are JSON
data, not executable expressions.

The adapter builds `PrismaAbility` with `createPrismaAbility`. It uses the subject's derived model name
when deriving `accessibleBy(ability, action)[modelName]`. Repository queries compose that result
with business predicates through `AND`, including active-row and workspace/project predicates.
They never spread an authorization filter into another `where` object.

Object checks use `subject(abilitySubjectOf(subject), record)` with a loaded, typed record.
They do not rely on `constructor` detection for Prisma plain objects.

### Leveraging a condition in practice

A `workspaceMember` `update` rule scoped to the active workspace is stored as:

```json
{
    "subject": "workspaceMember",
    "action": ["update"],
    "conditions": { "workspaceId": "${workspace.id}" }
}
```

`resolvePlaceholders` resolves `${workspace.id}` from the request context before the
rule is added to the ability, so the ability the request actually evaluates against carries the
literal id, e.g. `{ "workspaceId": "3f2b..." }`. An object check against a record from a
different workspace fails even though the caller otherwise holds the `update` action on
`workspaceMember`:

```ts
const ability = this.policyDomain.getCurrentAbility(); // workspaceId: "3f2b..." resolved
ability.can('update', subject('WorkspaceMember', memberFromOtherWorkspace)); // false — workspaceId mismatch
ability.can('update', subject('WorkspaceMember', memberFromActiveWorkspace)); // true
```

### Turning a condition into a Prisma filter

The same rule, read through `toWhere`, becomes the `where` clause a query or mutation composes
with its own predicates instead of a second in-memory pass over every row — here an update whose
`update` action is registered for `workspaceMember`:

```ts
const authorizationWhere = this.policyDomain.toWhere('update', EnumPolicySubject.workspaceMember);
// => { workspaceId: { equals: "3f2b..." } }

await this.databaseService.client.workspaceMember.updateMany({
    where: {
        AND: [authorizationWhere, { id: memberId }],
    },
    data,
});
```

This is the mechanism the [Prisma Query Filtering](#phase-6-prisma-query-filtering) delivery
phase introduces for every list/detail flow: the authorization filter and the business filter are
two `AND` predicates on one query, never a filter spread into the caller-supplied `where`.

## Ability Lifecycle

`PolicyDomain` owns ability construction and evaluation. It provides:

```ts
buildForRequest(context: IPolicyRequestContext): IPolicyAbility;
getCurrentAbility(): IPolicyAbility;
can(action: EnumPolicyAction, subject: IPolicySubjectInput): boolean;
assertCan(action: EnumPolicyAction, subject: IPolicySubjectInput): void;
toWhere(action: EnumPolicyAction, subject: EnumPolicySubject): Prisma.JsonObject;
```

Every method takes the plain `EnumPolicyAction` type — a single vocabulary spans every subject,
so no per-call parameterization is needed. `PolicyDomain` still validates the action against the
resolved subject's `PolicySubjectRegistry` entry before evaluating the ability.

The policy domain creates an ability once, stores it under a dedicated request-store key, and
reuses it for route checks and downstream domain calls. The context is read from the resolved
user, workspace, workspace membership, project, and project membership entries. A missing entry
is an error only when the route's guard stack requires it.

`PolicyGuard` reads static route metadata and calls `PolicyDomain.assertCan`. `PolicyDomain`
loads the platform role from the user and the workspace/project roles from the resolved
memberships. A workspace route can therefore use CASL without a platform-role guard solely to
populate policy storage.

`@RoleProtected()`, `RoleGuard`, and the super-admin bypass are removed after their routes carry
equivalent policy metadata. The super-admin role receives a persisted `manage`/`all` rule and
proceeds through the same ability construction and CASL evaluation as every other role. This
keeps permission data as the single source of authorization decisions.

### Checking a user's permission

A feature domain calls `PolicyDomain` directly, the same way `PolicyGuard` does, whenever it
needs a decision that a static route check cannot express — for example, before an update whose
targeted record was only just loaded:

```ts
// src/modules/workspace/domains/workspace.domain.ts
async updateWorkspace(user: IUser, workspaceId: string, dto: WorkspaceUpdateRequestDto) {
    const workspace = await this.workspaceRepository.findById(workspaceId);

    const allowed = this.policyDomain.can('update', {
        subject: EnumPolicySubject.workspace,
        record: workspace,
    });
    if (!allowed) {
        throw new WorkspaceForbiddenException();
    }

    // ...apply dto, persist
}
```

`assertCan` is the throwing counterpart of `can`, used where the caller wants the exception
raised inline instead of branching on a boolean:

```ts
this.policyDomain.assertCan('update', {
    subject: EnumPolicySubject.workspace,
    record: workspace,
}); // throws PolicyForbiddenException when the ability denies the action
```

Both calls read the ability `PolicyDomain.buildForRequest` already constructed and cached for
this request — no factory call and no rule fetch happens at the call site.

### How `PolicyGuard` changes

The decorator usage at the controller is unchanged:

```ts
@PolicyProtected({ subject: EnumPolicySubject.workspace, action: [EnumPolicyAction.update] })
@Patch(':workspaceId')
updateWorkspace(...) { ... }
```

Today, the guard resolves the caller's flat policy rows and checks them directly:

```ts
// guards/policy.guard.ts — today
async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPolicies = this.reflector.get<PolicyRequestDto[]>(
        PolicyRequiredMetaKey,
        context.getHandler(),
    ) ?? [];
    const user = this.requestStoreService.get<IUser>(UserStoreKey);
    const policies = this.requestStoreService.get<Policy[]>(PolicyStoreKey);
    return this.policyDomain.validatePolicyGuard(user, policies, requiredPolicies);
}
```

The target guard drops the raw-row lookup and the super-admin special case, and asks
`PolicyDomain` for a decision instead:

```ts
// guards/policy.guard.ts — target
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

    for (const { subject, action } of requiredPolicies) {
        for (const one of action) {
            this.policyDomain.assertCan(one, subject);
        }
    }

    return true;
}
```

`PolicyDomain.assertCan` builds (or reuses) the request-scoped ability from the resolved user,
workspace, and project context, so the guard no longer touches `Policy[]` rows or the
`superAdmin` role name directly — `superAdmin`'s `manage`/`all` rule satisfies every `assertCan`
call the same way any other role's rules would.

## Object Enforcement

Feature domains perform object decisions after loading the target record through their
repository. A route guard can check a resource already resolved by `WorkspaceGuard` or
`ProjectGuard`; it does not gain an unrestricted record-loading service.

Every permission-controlled feature-domain entry point asserts its subject/action pair before the
primary write. Route metadata provides the early static rejection, but it does not replace the
domain check. Writes that are consequences of one authorized operation, such as creating
memberships while claiming an invite, remain inside that operation's transaction and do not
invent separate permissions for internal steps.

An update or delete with conditions uses the authorization `where` in the mutation predicate
where the repository API can express it. This makes authorization and mutation one database
operation. A missing affected row follows the endpoint's established not-found or forbidden
contract without revealing an inaccessible row.

### Protecting a resource end to end

`WorkspaceMemberDomain.updateMember` traces every layer above through one operation:

```ts
async updateMember(user: IUser, workspaceId: string, memberId: string, dto: WorkspaceMemberUpdateRequestDto) {
    // 1. WorkspaceGuard/WorkspaceMemberProtected already established `workspaceId` as the
    //    caller's active workspace before this domain method runs.
    const member = await this.workspaceMemberRepository.findFirst({
        id: memberId,
        workspaceId,
    });
    if (!member) {
        // A record outside the caller's workspace, or one that does not exist, reads the same:
        // 404, never a 403 that would confirm a workspace-scoped row exists elsewhere.
        throw new WorkspaceMemberNotFoundException();
    }

    // 2. Object decision: does this ability allow `update` on THIS record?
    this.policyDomain.assertCan('update', {
        subject: EnumPolicySubject.workspaceMember,
        record: member,
    }); // throws PolicyForbiddenException — surfaces as 403, the record is known to exist

    // 3. Mutation composes the authorization `where` so the update itself cannot touch a row
    //    the ability would deny, even under a race with a rule change.
    const authorizationWhere = this.policyDomain.toWhere('update', EnumPolicySubject.workspaceMember);
    return this.workspaceMemberRepository.updateFirst(
        { AND: [authorizationWhere, { id: memberId }] },
        dto,
    );
}
```

The not-found/forbidden split in step 1 vs. step 2 is deliberate: a row the boundary guards
already scoped out of the workspace is a 404 (it does not exist *for this caller*), while a row
that exists in-scope but that the caller's ability denies is a 403. Step 3 then makes the
authorization decision part of the same database statement as the write, so there is no window
between "checked" and "mutated" where a second request could invalidate the decision.

## Effective Permissions Endpoint

A client cannot render UI conditionally, and support cannot debug an access complaint, from a
role name alone — both need the caller's actual effective actions for the active workspace or
project. This adds one read-only endpoint per scope that reports exactly what `getCurrentAbility`
already decided, with no new ability-construction path.

| Controller | Route | Guard stack | Response |
| --- | --- | --- | --- |
| `WorkspaceUserController` | `GET /permission` — current workspace from `x-workspace-id`, no path param, same as `get` | `@WorkspaceMemberProtected()`, `@WorkspaceProtected()`, `@UserProtected()`, `@FeatureFlagProtected('workspace')`, `@AuthJwtAccessProtected()`, `@ApiKeyProtected()`, `@RequestThrottle` | `{ permissions: IEffectivePermission[] }` scoped to `workspace`, `workspaceMember`, `workspaceInvite`, `workspaceJoinRequest` |
| `ProjectUserController` | `GET /permission/:projectId` — path param, same as every other project route | `@ProjectMemberProtected(admin, member, viewer)`, `@ProjectProtected()`, `@WorkspaceMemberProtected()`, `@WorkspaceProtected()`, `@UserProtected()`, `@FeatureFlagProtected('workspace')`, `@AuthJwtAccessProtected()`, `@ApiKeyProtected()`, `@RequestThrottle` | `{ permissions: IEffectivePermission[] }` scoped to `project`, `projectMember` |

The workspace route takes no id because no workspace route does — `get`, `update`,
`updateIsPublic`, `updateSlug`, `ownershipTransfer`, and `leave` all resolve the active workspace
from the `x-workspace-id` header through `@WorkspaceCurrent()`. The project route carries
`:projectId` because every project route does — there is no per-request "current project" header,
so `@ProjectCurrent()` always resolves from the path.

The response reuses the existing `{ subject, actions }` row shape already returned by the
role-policy list endpoints (`PolicySchema`), rather than inventing a new one:

```ts
interface IEffectivePermission {
    subject: EnumPolicySubject;
    actions: string[]; // subset of EnumPolicyAction valid for the subject, per PolicySubjectRegistry
}
```

A `member` role and an `owner` role hitting `GET /permission` for the same workspace get
different results — a `member` holds no rule beyond `workspace:read`, while an `owner` holds
`manage` on most workspace-family subjects (see [Default Scoped Role
Rules](#default-scoped-role-rules)):

```json
// member
{ "permissions": [
    { "subject": "workspace", "actions": ["read"] }
] }

// owner
{ "permissions": [
    { "subject": "workspace", "actions": ["read", "update", "delete", "manage"] },
    { "subject": "workspaceMember", "actions": ["update", "delete"] },
    { "subject": "workspaceInvite", "actions": ["create", "manage"] },
    { "subject": "workspaceJoinRequest", "actions": ["update"] }
] }
```

Each controller's handler follows its own existing idiom exactly — the guards resolve the current
resource and member, and the handler passes them straight through:

```ts
// controllers/workspace.user.controller.ts
@Get('/permission')
async permission(
    @WorkspaceCurrent() workspace: Workspace,
    @WorkspaceMemberCurrent() workspaceMember: WorkspaceMember
): Promise<IResponseReturn<{ permissions: IEffectivePermission[] }>> {
    return this.workspaceHttpService.getEffectivePermissions(workspace, workspaceMember);
}
```

```ts
// controllers/project.user.controller.ts
@Get('/permission/:projectId')
async permission(
    @ProjectCurrent() project: Project,
    @ProjectMemberCurrent() projectMember: ProjectMember
): Promise<IResponseReturn<{ permissions: IEffectivePermission[] }>> {
    return this.projectHttpService.getEffectivePermissions(project, projectMember);
}
```

The service delegates to `PolicyDomain`, which iterates the workspace- or project-scoped entries
of `PolicySubjectRegistry` and, for each subject's full action union, calls `can(action, {
subject, record })`, collecting only the actions that return `true`. It reuses
`getCurrentAbility()` from [Ability Lifecycle](#ability-lifecycle) — no second ability is built
for this endpoint.

This endpoint depends on `PolicyDomain.can` and `PolicySubjectRegistry`, so it ships as
[Phase 8](#phase-8-effective-permissions-endpoint) after the CASL v7 migration itself lands.

## Workspace and Project Policy Matrix

The following CASL decisions are added incrementally after the existing workspace and project
guards succeed.

| Operation group | Subject | Actions | Existing boundary context | Notes |
| --- | --- | --- | --- | --- |
| Workspace list/create/switch/leave | none | none | authenticated user; switch and leave need membership in the target workspace | No CASL metadata. List result set filtered by membership/visibility as a query concern (§5). |
| Workspace get (user and admin) | `workspace` | `read` | workspace member (user) or platform admin | `workspaceId` condition per §5; admin routes resolve it from `:workspaceId`. |
| Workspace update/visibility/slug/delete | `workspace` | `update`, `delete` | current workspace member | `workspaceId` condition per §5. |
| Ownership transfer | `workspace` | `manage` | current workspace membership | `workspaceId` condition per §5. |
| Member list | none | none | current workspace member | No CASL metadata; membership is the gate. |
| Member role/remove | `workspaceMember` | `update`, `delete` | current workspace and member | `workspaceId` condition per §5. |
| Invite list/claim | none | none | current member (list) or token-verified invite claimant (claim) | No CASL metadata. |
| Invite create/resend/revoke | `workspaceInvite` | `manage` | current workspace member | `workspaceId` condition per §5. |
| Join request create/list | none | none | public workspace requester (create) or current workspace member (list) | No CASL metadata. |
| Join request accept/reject | `workspaceJoinRequest` | `update` | current workspace member | `workspaceId` condition per §5. |
| Project list (user) | none | none | current workspace member | No CASL metadata; result set filtered by visibility as a query concern. |
| Admin workspace/project list and workspace member list | `workspace` / `project` | `read` | platform admin | Platform-role rule, no scope condition; admin get uses `:workspaceId`/`:projectId` per §5. |
| Project get/update/slug/delete | `project` | `read`, `update`, `delete` | current workspace and project membership | `projectId` condition per §5 (`id` on the project row). |
| Project create | `project` | `create` | current workspace member | No scope condition (§5 exception). |
| Project member list | none | none | current project member | No CASL metadata; membership is the gate. |
| Project member role/remove | `projectMember` | `update`, `delete` | current workspace, project, and project membership | `projectId` condition per §5. |
| Project member assign | `projectMember` | `create` | current workspace, project, and project membership | `projectId` condition, no member-instance condition (§5 exception). |
| Project leave | none | none | caller's current project membership | |

## Default Scoped Role Rules

Workspace and project capabilities are persisted rules on workspace- and project-scoped roles.
`PolicyDomain.buildForRequest` combines platform-role policies with the workspace and project
roles resolved from the request memberships.

Each scoped rule is constrained to the active workspace or project per the
[Scoping Placeholder Conventions](#scoping-placeholder-conventions) above: workspace rules carry
a `workspaceId` condition resolved from `${workspace.id}`, and project rules carry a `projectId`
condition resolved from `${project.id}` in addition to the workspace scope they inherit
transitively. A scoped role therefore does not grant access to another workspace or project when
its actions are reused downstream. Every capability listed below implicitly carries its
subject's mandatory placeholder condition from §5 unless the row says otherwise.

| Role     | Scope     | Capabilities                                                                                                                                                 |
| -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `owner`  | workspace | `workspace`: `manage`; `workspaceMember`: `update`, `delete`; `workspaceInvite`: `manage`; `workspaceJoinRequest`: `update`; every `project` and `projectMember` action |
| `admin`  | workspace | `workspace`: `read`, `update`; `workspaceMember`: `update`, `delete`; `workspaceInvite`: `manage`; `workspaceJoinRequest`: `update`; `project`: `create`, `delete` |
| `member` | workspace | `workspace`: `read`                                                                                                                                          |
| `admin`  | project   | `project`: `read`, `update`; `projectMember`: `create` (no member-instance condition, §5 exception), `update`, `delete`                                     |
| `member` | project   | `project`: `read`                                                                                                                                            |
| `viewer` | project   | `project`: `read`                                                                                                                                            |

The workspace `admin` role has the project actions granted directly by the current route guards.
It does not receive project read or update authority through its workspace role; those actions
require a project membership. The workspace `owner` role retains project authority through its
workspace-scoped CASL rules.

Project and project-member listing are gated by workspace and project membership alone, so no
role carries a `projectMember` `read` rule.

Role administration uses the existing `role` subject. Platform administrators can read the
complete preset catalog and update role display metadata and policy rows. Role creation,
deletion, key changes, and scope changes are not exposed. Workspace owners, workspace admins,
and project admins cannot administer roles or policies.

Policy updates validate each rule's subject against both the role's scope and
`PolicySubjectRegistry`'s action catalog. Platform roles may hold any subject and carry no
mandatory scope pair, workspace roles hold platform-level, workspace-level, and project-level
subjects, and project roles hold project-level subjects only — and every action in a role's
rules must be registered for that subject. The workspace `owner` role remains the only role
recognized by ownership-transfer and last-owner domain invariants.

Workspace creation, join-request creation, and invite claim happen before a workspace membership
exists, so they carry no CASL rule and no base authenticated-user grant. The join-request domain
verifies that the target workspace is public and that the caller is not already a member. Invite
claim is token-verified; the authenticated caller and the invite token are both required.

Member, invite, and join-request listing are gated by workspace membership alone.

Workspace switching and workspace/project leave are membership-derived operations. The switch
domain validates membership for the selected workspace; leave routes resolve the current caller's
membership row and remove that row. These operations do not consult CASL.

The existing domain rules remain in force after a scoped role grants the action: an owner cannot
be removed through a peer operation, the last owner cannot leave, and role-transition validation
continues to protect membership invariants.

## Initial Seed Rules

The initial policy seed is explicit rather than derived from every enum member.

- `superAdmin`: `manage` on `all`.
- `admin`: platform-management rules plus `read` on `workspace` and `project` for existing
  admin-scope endpoints (the admin workspace member list is gated by `workspace:read`).
  Additional actions are added only with matching admin endpoints.
- `user`: seeds no workspace-family rule. Workspace `list`/`create`, invite `claim`, and
  join-request `create` carry no CASL permission.
- Workspace roles: seed `owner`, `admin`, and `member` once with the workspace rows in the scoped
  role matrix.
- Project roles: seed `admin`, `member`, and `viewer` once with the project rows in the scoped
  role matrix (`projectMember:create` is the §5 exception: `projectId` condition only, no
  member-instance condition).

The seed replaces the managed policy rows for the fixed roles and recreates them from the
declarative rule catalog. There is no priority-based identity or ordering.

## Delivery Plan

### Phase 1: Characterize Existing Behavior

- Cover current policy factory, policy guard, policy domain, and role guard behavior.
- Cover super-admin bypass, missing user, missing metadata, denied static action, and policy
  storage by `RoleGuard`.
- Cover workspace/project guard ordering, cross-workspace project rejection, workspace-owner
  project bypass, and user-scope visibility behavior.

### Phase 2: Scoped Role Migration

- Add role scope and immutable role keys to the authorization schema.
- Replace `WorkspaceMember.role`, `ProjectMember.role`, and the role fields on `WorkspaceInvite`
  with scoped role relations. Migrate existing owner/admin/member/viewer values to default roles.
- Seed the fixed workspace and project roles once, then backfill membership and invitation
  references to those roles.
- Replace role-gated workspace/project decorators and guards with membership resolution plus
  CASL action checks.
- Keep role and policy administration platform-only. Expose no workspace/project role creation,
  update, or deletion endpoints.
- Preserve owner, peer-management, and role-scope constraints in their domains and repositories.

### Phase 3: Schema, DTO, and Seed Migration

- Add `conditions` and `inverted`, the new `EnumPolicySubject` values, and generated client
  updates. `Policy.action` stays `EnumPolicyAction[]`, stored as-is; the policy domain validates
  the (subject, action) pair against `PolicySubjectRegistry`.
- Replace the one-subject-per-row DTO and response shape with the rule DTO.
- Update repository reads, writes, policy routes, seed data, and schema migration.
- Seed the super-admin `manage/all` rule and the fixed scoped-role rules.

### Phase 4: Typed Prisma Ability

- Add the subject scope map, placeholder resolver, and typed Prisma ability.
- Build allow rules first and inverted rules second so inverted rules are authoritative.
- Store and reuse one request-scoped ability.
- Keep static `@PolicyProtected()` checks working through `PolicyGuard`.

### Phase 5: Object Checks

- Add domain-level `assertCan` checks for one platform resource and one workspace/project
  resource already resolved by the workspace/project guards.
- Use subject instances for in-memory decisions and constrained repository mutations for writes.

### Phase 6: Prisma Query Filtering

- Add `@casl/prisma` and the policy query adapter.
- Introduce `AND`-composed authorization filters in a representative list and detail flow.
- Add repository integration coverage outside the unit suite for generated Prisma conditions.

### Phase 7: Explicit Actions

- Normalize actions to `EnumPolicyAction` (CRUD plus `manage`), then add policy metadata to every
  permission-controlled endpoint, including the mandatory `workspaceId`/`projectId` scope
  placeholder per subject and its documented exception.
- Update role-policy API examples and durable authorization documentation with the shipped
  behavior.

### Phase 8: Effective Permissions Endpoint

- Add the `GET /permission` route to `WorkspaceUserController` and `GET /permission/:projectId`
  to `ProjectUserController` (see [Effective Permissions Endpoint](#effective-permissions-endpoint)).
- Depends on Phase 4 (`PolicyDomain`/`PolicySubjectRegistry` must exist) and Phase 5 (object
  checks against a loaded workspace/project record).
- Add the `IEffectivePermission` response DTO and the `getEffectivePermissions` service/domain
  method on both scopes.

## Test Matrix

- Rule DTO validation: enum values and trusted JSON conditions; role-scope validation from the registry,
  mandatory scope-placeholder presence per scoped
  subject (with the `project:create` waiver and the member-instance-free `projectMember:create`
  rule).
- Ability factory: allow, deny-authoritative inversion, condition resolution, `manage/all`, and
  immutable CASL rule arrays.
- Policy domain: request-scoped reuse, `can`, `assertCan`, object subjects, and Prisma `where`
  generation.
- Guards: static metadata, missing context, platform policy behavior, workspace/project stacking,
  scoped-role resolution, and no admin dependency on a workspace header.
- Workspace/project domains: workspace and project boundaries remain active before capability checks;
  unauthorized mutations use constrained database predicates; owner and peer-management
  invariants survive role-policy changes.
- Permission inventory: every permission-controlled operation maps to one subject/action pair;
  the operations listed under Actions as needing no permission (workspace list/create/switch/
  leave, member/invite/join-request list, invite claim, join-request create) stay membership- or
  authentication-only, and a plain workspace member can list members, invites, and join
  requests.
- Seed data: platform, workspace, and project role sets map to valid subjects, scopes, and actions.

Run unit checks with `pnpm test policy`, `pnpm test role`, `pnpm test workspace`, and
`pnpm test project`. Run `pnpm typecheck`, `pnpm lint`, and `pnpm spell` after each completed
implementation phase. Query-adapter integration coverage runs against PostgreSQL in its dedicated
test environment.

## Unit Test Plan

Concrete unit specs (`test/**/*.spec.ts`) for the Test Matrix above, ordered most critical
first — a failure here means an authorization decision can be silently wrong.

### Tier 1 — Critical (authorization correctness and security boundary)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyGuard.canActivate` | Required policy absent from ability | Guard rejects the request instead of falling through |
| `PolicyDomain.assertCan` | Ability denies the action | Throws `PolicyForbiddenException`, does not return `false` silently |
| `PolicyAbilityFactory.createForUser` | Inverted rule vs. allow, same subject, in either input order | Matching inverted rules remain authoritative |
| `PolicyAbilityFactory.createForUser` | Record from a different workspace against a `workspaceId`-scoped rule | Condition mismatch denies — scoping placeholder actually constrains the ability |
| `PolicyDomain.buildForRequest` | Platform, workspace, and project rules for one user | Composition order is platform → workspace → project; a narrower rule can override a broader one |
| `PolicyGuard.canActivate` | `superAdmin` role, no special-cased bypass in code | Evaluates through the seeded `manage`/`all` rule like any other role, not a hardcoded short-circuit |
| Rule validation (`PolicyDomain` create/update path) | Workspace- or project-scoped subject rule with no `workspaceId`/`projectId` condition | Rejected, except the `project:create` waiver and the member-instance-free `projectMember:create` rule |

### Tier 2 — High (core data-shaping and business invariants)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyDomain.toWhere` | Subject with an active-scope condition | Produces the exact Prisma `WhereInput` the repository will `AND` into its query |
| Rule validation (`PolicyDomain` create/update path) | Action not registered for the subject in `PolicySubjectRegistry` | Rejects the action/subject pair instead of persisting it unchecked |
| Policy seed (`policy.seed.ts` or equivalent) | Re-running the seed after a rule's conditions changed | Replaces the managed policy set without priority-based identity |
| Role assignment domain (`User`/`WorkspaceMember`/`ProjectMember` role write) | Assigning a workspace-scoped role to a `ProjectMember.roleId` (wrong scope) | Rejected — scope validation runs before the write, not just at read time |
| `WorkspaceDomain` ownership transfer / last-owner check | Attempt to remove or demote the sole `owner` after the CASL migration | Last-owner invariant still blocks the operation regardless of the caller's CASL grant |
| `getEffectivePermissions` | Role with a narrow rule set vs. a role with a broad one, same subject | Returned action list matches exactly what `can()` would allow for each action — no extra, no missing |

### Tier 3 — Medium (composition and boundary wiring)

| Method | Description | What it tests |
| --- | --- | --- |
| `PolicyRepository` read path | Rows for one role fetched in bulk | Returns the role's policy rows without requiring priority ordering |
| `PolicyDomain.getCurrentAbility` | Called twice within the same request | Returns the same cached ability instance — no rebuild, no duplicate rule fetch |
| Guard stacking (`WorkspaceGuard`/`ProjectGuard` + `PolicyGuard`) | Cross-workspace project id in the route | Boundary guard rejects before `PolicyGuard` runs — CASL never sees an out-of-boundary record |
| Membership-only operations (workspace switch, workspace/project leave) | Caller has no matching CASL rule at all | Operation still succeeds — these routes carry no policy metadata by design |

### Tier 4 — Low (DTO validation and catalog completeness)

| Method | Description | What it tests |
| --- | --- | --- |
| Rule DTO validation | `conditions` is not a JSON object | Rejected at the DTO boundary, before reaching the domain |
| `PolicySubjectRegistry` shape check | Iterate every `EnumPolicySubject` member | Each has a registry entry with `model`, `actions`, and `scope`; concrete scope keys use the corresponding generated Prisma scalar-field enum member |
| Seed data catalog | Every seeded role/scope pair | Maps only to actions valid for its scope (no platform action on a workspace role, etc.) |

## Acceptance Checklist

- `Role` carries only an explicit platform/workspace/project scope, immutable key, display
  metadata, policies, and assignments. It has no `EnumRoleType`, `isSystem`, `isOwner`,
  `workspaceId`, or `projectId` field.
- The fixed role catalog is seeded once, with unique keys inside each scope.
- PostgreSQL schema stores the v1 rule contract: `subject`, `action`, `conditions`, `inverted`,
  and optional `reason`.
  Multiple rules are permitted for one role/subject.
- Policy create/update accepts only the v1 rule contract; priority and field-level
  permissions are intentionally outside the first version.
- Conditions are stored as trusted JSON in the Prisma `WhereInput` dialect and are evaluated by
  CASL and Prisma at request time.
- The subject registry covers workspace, workspace member, workspace invite, workspace join
  request, project, and project member resources with their valid actions and scope pairs.
- Every permission uses `EnumPolicyAction` (`manage`, `read`, `create`, `update`, `delete`);
  privileged operations such as ownership transfer and invite resend/revoke map to `manage`. The
  registry rejects invalid action/subject pairs, and the persisted `action` column is a typed
  `EnumPolicyAction[]`.
- The ability is request-scoped and the super-admin role evaluates through CASL.
- `@RoleProtected()`, `RoleGuard`, and the super-admin bypass are removed after equivalent CASL
  metadata covers their routes.
- Workspace members, project members, and invitations reference scoped roles; the role enums and
  their hard-coded permission guards are removed.
- Only platform administrators can update preset roles and policies. Workspace/project role
  administration and custom roles are outside the first version.
- Workspace and project guards remain resource boundaries.
- Every permission-controlled operation has explicit CASL policy metadata and a domain assertion.
- Workspace list/create/switch/leave, project leave, member/invite/join-request list, invite
  claim, and join-request create use authentication, membership, and domain invariants without a
  CASL permission.
- Object and query enforcement are introduced only with their matching domain and repository
  behavior.
- Seeds, DTOs, OpenAPI responses, activity contracts, and tests move with every new action or
  subject.
- Workspace-scoped and project-scoped subject rules carry their mandatory `workspaceId`/
  `projectId` condition, except the documented `project:create` exception.
- Registry scope keys use generated Prisma scalar-field enum members for the target model, with
  the virtual `analytic` subject using the generated `workspaceId` member from a workspace-scoped
  model.
- Operations without a subject require no policy metadata: no subject, no action, no condition.
- Workspace and project user controllers expose a read-only effective-permissions endpoint whose
  response matches the caller's live ability.
