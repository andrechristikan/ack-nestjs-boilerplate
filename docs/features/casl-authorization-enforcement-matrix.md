# CASL Authorization Enforcement Matrix

## Purpose

This matrix is the use-case inventory for the desired CASL authorization architecture. It identifies
the protected subject, action, one authorization decision, its enforcement mode, and the denied
result for user-request operations. The rows do not represent separate policy definitions: they show
how the same request ability is enforced at the route, domain, and persistence boundaries.

The design details, condition profiles, and code examples live in the
[policy implementation specification](./casl-authorization-policy-spec.md).

## Legend

| Term | Meaning |
| --- | --- |
| `@PolicyProtected` check | The route guard verifies that the ability grants the action on the subject type. |
| `authorize` | The domain checks a CASL subject name, existing record, or prospective record. Creation uses this same method; there is no separate `authorizeCreate`. |
| `scope` | The domain produces the typed `accessibleBy` condition and the repository composes it into the database query. |
| Authorized lookup | `scope(read, subject)` is composed with the requested identifier; an empty result becomes a feature `404`. |
| Authorized mutation | `scope(update/delete, subject)` is included in the final mutating statement. |
| Feature `404` | The domain maps an authorized lookup or mutation miss to the feature's not-found exception. |
| Filtered | Rows outside the CASL predicate are absent from the result. |
| Trusted | The operation has no user request ability and calls the shared repository method without an additional authorization condition. |

For collection queries, the CASL predicate is the first item in the repository's `AND` array. For
single-record updates and deletes, the predicate is part of the final mutating statement.
In the table, `subject` means the model named in that row's Subject column.

## Platform Administration

| Surface and operation | Action | Subject | Authorization path | Persistence enforcement | Denied result |
| --- | --- | --- | --- | --- | --- |
| Activity log list | `read` | `ActivityLog` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).ActivityLog` | Filtered |
| API key list | `read` | `ApiKey` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).ApiKey` | Filtered |
| API key detail | `read` | `ApiKey` | scope(read, <subject>) | `id AND accessibleBy(...).ApiKey` | Feature `404` |
| API key create | `create` | `ApiKey` | authorize(create, <subject>, proposed) | Create after domain assertion | `403` |
| API key metadata, date, status, or secret reset | `update` | `ApiKey` | scope(update, <subject>) | `id AND accessibleBy(...).ApiKey` | Feature `404` |
| API key delete | `delete` | `ApiKey` | scope(delete, <subject>) | `id AND accessibleBy(...).ApiKey` | Feature `404` |
| Device ownership list | `read` | `DeviceOwnership` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).DeviceOwnership` | Filtered |
| Device ownership remove | `delete` | `DeviceOwnership` | scope(delete, <subject>) | `id AND accessibleBy(...).DeviceOwnership` | Feature `404` |
| Feature flag list | `read` | `FeatureFlag` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).FeatureFlag` | Filtered |
| Feature flag detail | `read` | `FeatureFlag` | scope(read, <subject>) | `id AND accessibleBy(...).FeatureFlag` | Feature `404` |
| Feature flag create | `create` | `FeatureFlag` | authorize(create, <subject>, proposed) | Create after domain assertion | `403` |
| Feature flag status or metadata update | `update` | `FeatureFlag` | scope(update, <subject>) | `id AND accessibleBy(...).FeatureFlag` | Feature `404` |
| Feature flag delete | `delete` | `FeatureFlag` | scope(delete, <subject>) | `id AND accessibleBy(...).FeatureFlag` | Feature `404` |
| Password history list | `read` | `PasswordHistory` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).PasswordHistory` | Filtered |
| Role list | `read` | `Role` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).Role` | Filtered |
| Role detail | `read` | `Role` | scope(read, <subject>) | `id AND accessibleBy(...).Role` | Feature `404` |
| Role create | `create` | `Role` | authorize(create, <subject>, proposed) | Create after domain assertion | `403` |
| Role update | `update` | `Role` | scope(update, <subject>) | `id AND accessibleBy(...).Role` | Feature `404` |
| Role delete | `delete` | `Role` | scope(delete, <subject>) | `id AND accessibleBy(...).Role` | Feature `404` |
| Policy list for a role | `read` | `Role` | @PolicyProtected check, then scope(read, <subject>) | `Policy` filtered through `role: { is: accessibleBy(...).Role }` | Filtered |
| Policy create for a role | `update` | `Role` | scope(update, Role) plus definition validation | Target `Role` uses `id AND accessibleBy(...).Role`; policy create follows | Feature `404` for inaccessible role; invalid definition is validation error |
| Policy update | `update` | `Role` | `scope(update, Role)` plus policy definition validation | `Policy` lookup nested through accessible `Role`; update remains in one transaction | Feature `404` |
| Policy delete | `update` | `Role` | `scope(update, Role)` | `Policy` delete nested through accessible `Role` | Feature `404` |
| Session list | `read` | `Session` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).Session` | Filtered |
| Session detail | `read` | `Session` | scope(read, <subject>) | `id AND accessibleBy(...).Session` | Feature `404` |
| Session revoke | `delete` | `Session` | scope(delete, <subject>) | `id AND accessibleBy(...).Session` | Feature `404` |
| Revoke every session for a user | `update` | `User` | scope(update, User) plus transactional session mutation | Target `User` uses `id AND accessibleBy(...).User` | Feature `404` |
| Term policy list | `read` | `TermPolicy` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).TermPolicy` | Filtered |
| Term policy detail | `read` | `TermPolicy` | scope(read, <subject>) | `id AND accessibleBy(...).TermPolicy` | Feature `404` |
| Term policy create | `create` | `TermPolicy` | authorize(create, <subject>, proposed) | Create after domain assertion | `403` |
| Term policy metadata update | `update` | `TermPolicy` | scope(update, <subject>) | `id AND accessibleBy(...).TermPolicy` | Feature `404` |
| Term policy publish | `update` | `TermPolicy` | scope(update, <subject>) | `id AND accessibleBy(...).TermPolicy` in transaction | Feature `404` |
| Term policy content read | `read` | `TermPolicy` | scope(read, TermPolicy) | Parent `TermPolicy` uses `id AND accessibleBy(...).TermPolicy` | Feature `404` |
| Term policy content add, update, or remove | `update` | `TermPolicy` | scope(update, TermPolicy) | Parent `TermPolicy` authorization reapplied in transaction | Feature `404` |
| Term policy delete | `delete` | `TermPolicy` | scope(delete, <subject>) | `id AND accessibleBy(...).TermPolicy` | Feature `404` |
| User list | `read` | `User` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).User` | Filtered |
| User import | `create` | `User` | @PolicyProtected check plus authorize(create, proposed) | Batch create contains only asserted rows | `403` or rejected import row, according to import contract |
| User detail | `read` | `User` | scope(read, <subject>) | `id AND accessibleBy(...).User` | Feature `404` |
| User create | `create` | `User` | authorize(create, <subject>, proposed) | Create after domain assertion | `403` |
| User profile or status update | `update` | `User` | scope(update, <subject>) | `id AND accessibleBy(...).User` | Feature `404` |
| User password administration | `update` | `User` | `scope(update, User)` plus transactional update | Target `User` uses `id AND accessibleBy(...).User` | Feature `404` |
| User two-factor administration | `update` | `User` | `scope(update, User)` plus transactional update | Target `User` uses `id AND accessibleBy(...).User` | Feature `404` |
| User delete | `delete` | `User` | scope(delete, <subject>) | `id AND accessibleBy(...).User` | Feature `404` |
| Workspace administration list | `read` | `Workspace` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).Workspace` | Filtered |
| Workspace administration detail | `read` | `Workspace` | scope(read, <subject>) | `id AND accessibleBy(...).Workspace` | Feature `404` |

## Workspace Operations

Workspace routes load the caller's workspace role before ability construction. Policies using
`workspaceScope` additionally constrain model queries to the active workspace.

| Surface and operation | Action | Subject | Authorization path | Persistence enforcement | Denied result |
| --- | --- | --- | --- | --- | --- |
| Workspace detail | `read` | `Workspace` | scope(read, <subject>) | `id AND accessibleBy(...).Workspace` | Feature `404` |
| Workspace update, visibility change, or slug change | `update` | `Workspace` | scope(update, <subject>) | `id AND accessibleBy(...).Workspace` | Feature `404` |
| Workspace ownership transfer | `update` | `Workspace` | `scope(update, Workspace)` plus transactional business validation | Final `Workspace` mutation includes `accessibleBy(...).Workspace` | Feature `404` |
| Workspace delete | `delete` | `Workspace` | scope(delete, <subject>) | `id AND accessibleBy(...).Workspace` | Feature `404` |
| Workspace member list | `read` | `WorkspaceMember` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).WorkspaceMember AND workspaceId` | Filtered |
| Workspace member detail | `read` | `WorkspaceMember` | scope(read, <subject>) | `id AND accessibleBy(...).WorkspaceMember` | Feature `404` |
| Workspace member role update | `update` | `WorkspaceMember` | scope(update, <subject>) plus ownership rules | Final mutation includes `accessibleBy(...).WorkspaceMember` | Feature `404` |
| Workspace member remove | `delete` | `WorkspaceMember` | scope(delete, <subject>) plus ownership rules | Final delete includes `accessibleBy(...).WorkspaceMember` | Feature `404` |
| Workspace invite list | `read` | `WorkspaceInvite` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).WorkspaceInvite AND workspaceId` | Filtered |
| Workspace invite detail | `read` | `WorkspaceInvite` | scope(read, <subject>) | `id AND accessibleBy(...).WorkspaceInvite` | Feature `404` |
| Workspace invite create | `create` | `WorkspaceInvite` | authorize(create, <subject>, proposed) | Create after domain assertion | `403` |
| Workspace invite resend | `update` | `WorkspaceInvite` | scope(update, <subject>) | `id AND accessibleBy(...).WorkspaceInvite` | Feature `404` |
| Workspace invite revoke | `delete` | `WorkspaceInvite` | scope(delete, <subject>) | `id AND accessibleBy(...).WorkspaceInvite` | Feature `404` |
| Workspace join request list | `read` | `WorkspaceJoinRequest` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).WorkspaceJoinRequest AND workspaceId` | Filtered |
| Workspace join request detail | `read` | `WorkspaceJoinRequest` | scope(read, <subject>) | `id AND accessibleBy(...).WorkspaceJoinRequest` | Feature `404` |
| Workspace join request accept or reject | `update` | `WorkspaceJoinRequest` | scope(update, <subject>) | Final mutation includes `accessibleBy(...).WorkspaceJoinRequest` | Feature `404` |
| Workspace effective permissions | Ability only | Request ability | `@PolicyAbility` reads the already-built request ability | No model query required for authorization | `403` when the route's ability precondition fails |

## Project Operations

Project routes load the caller's project role when one exists. `projectScope` constrains a project
or its members to the active project. `assignedProject` constrains project queries by workspace and
membership relation.

| Surface and operation | Action | Subject | Authorization path | Persistence enforcement | Denied result |
| --- | --- | --- | --- | --- | --- |
| Project list | `read` | `Project` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).Project AND workspaceId` | Filtered |
| Project detail | `read` | `Project` | scope(read, <subject>) | `id AND accessibleBy(...).Project` | Feature `404` |
| Project create | `create` | `Project` | authorize(create, <subject>, proposed) with `workspaceId` | Create after domain assertion | `403` |
| Project update or slug change | `update` | `Project` | scope(update, <subject>) | `id AND accessibleBy(...).Project` | Feature `404` |
| Project delete | `delete` | `Project` | scope(delete, <subject>) | `id AND accessibleBy(...).Project` | Feature `404` |
| Project member list | `read` | `ProjectMember` | @PolicyProtected check, then scope(read, <subject>) | `accessibleBy(...).ProjectMember AND projectId` | Filtered |
| Project member detail | `read` | `ProjectMember` | scope(read, <subject>) | `id AND accessibleBy(...).ProjectMember` | Feature `404` |
| Project member assign | `create` | `ProjectMember` | authorize(create, <subject>, proposed) with `projectId` | Create after domain assertion | `403` |
| Project member role update | `update` | `ProjectMember` | scope(update, <subject>) | Final mutation includes `accessibleBy(...).ProjectMember` | Feature `404` |
| Project member remove | `delete` | `ProjectMember` | scope(delete, <subject>) | Final delete includes `accessibleBy(...).ProjectMember` | Feature `404` |
| Project effective permissions | Ability only | Request ability | `@PolicyAbility` reads the already-built request ability | No model query required for authorization | `403` when the route's ability precondition fails |

## Non-Model Subjects

These subjects authorize a capability rather than a Prisma model. They use `@PolicyProtected` checks and
do not accept condition profiles.

| Surface and operation | Action | Subject | Authorization path | Persistence enforcement | Denied result |
| --- | --- | --- | --- | --- | --- |
| Platform analytics reads | `read` | `Analytic` | @PolicyProtected check | Analytics repository applies business filters only | `403` |
| Workspace analytics reads | `read` | `WorkspaceAnalytic` | @PolicyProtected check after workspace role resolution | Analytics repository scopes by the active workspace | `403` |
| Route protected by global subject | Decorated action | `all` | @PolicyProtected check | Operation-specific repository behavior still applies | `403` |

The active role set provides workspace or project context for non-model capabilities. Attaching a
condition profile to these subjects is a policy-definition error.

## Trusted And Public Flows

The following flows reuse the same repository methods without a CASL-generated additional `where`
condition. Their domain method and entry point provide the independently reviewable trust boundary.

| Flow | Authorization source | Repository shape | Expected failure |
| --- | --- | --- | --- |
| Authentication credential lookup | Authentication protocol and credential verification | Shared lookup without additional policy condition | Authentication error |
| Current-user bootstrap before ability construction | Authenticated user identity | Shared lookup without additional policy condition | Authentication error |
| Public registration or public invitation acceptance | Public route contract and token validation | Shared create or token lookup without additional policy condition | Validation, conflict, or token error |
| Queue processor | Trusted job producer and processor contract | Shared repository operation without additional policy condition | Job failure and retry policy |
| Initial data seeding | Owner-invoked migration process | Shared repository operation without additional policy condition | Migration failure |
| Internal integrity or scheduled maintenance | Internal service contract | Shared repository operation without additional policy condition | Internal operation failure |

Trusted domain methods and entry points remain narrow and use-case specific. The repository itself
does not introduce parallel authorized and unfiltered APIs.

## Implementation Completion Checks

- [ ] Every user-request list in this matrix passes a `scope(read, subject)` predicate.
- [ ] Every single-record read uses `id AND scope(read, subject)` and maps `null` to a feature `404`.
- [ ] Every update and delete includes `scope(update/delete, subject)` in the final mutating statement.
- [ ] Every create calls `authorize(create, prospectiveSubject)` when the subject has record attributes.
- [ ] Policy operations authorize the target `Role` with action `update`.
- [ ] Relation-backed conditions are evaluated in database queries, not partial in-memory records.
- [ ] Non-model subjects reject condition profiles.
- [ ] Trusted paths reuse repository methods without an additional policy condition.
- [ ] Every CASL-protected route uses `@PolicyProtected` or `@PolicyAbility`; no scope-specific policy decorator or `RequireAccess` exists.
- [ ] Allowed, denied, and inaccessible-existing-record tests cover each applicable row.

## Related Documentation

- [CASL authorization policy implementation specification](./casl-authorization-policy-spec.md)
- [Authorization documentation](../authorization.md)
