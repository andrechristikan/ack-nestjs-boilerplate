---
title: Field Access Reference
description: Per resource, which fields each audience reads and writes, the response and request schemas that carry them, and the attribute each rule depends on.
---

# Field Access Reference

This page lists, for each resource whose read or write differs by audience, the fields each audience gets, for a developer or auditor who checks what a caller sees and what a caller may change.

## Table of Contents

- [Related Documents](#related-documents)
- [Entry shape](#entry-shape)
- [Audiences](#audiences)
- [Resources](#resources)
    - [User](#user)
    - [Workspace](#workspace)
    - [Workspace member](#workspace-member)
    - [Workspace invite](#workspace-invite)
    - [Workspace join request](#workspace-join-request)
    - [Project](#project)
    - [Project member](#project-member)
    - [Activity log entry](#activity-log-entry)
    - [Session](#session)
    - [Device ownership](#device-ownership)
    - [Notification](#notification)
    - [MFA](#mfa)
    - [API key](#api-key)
    - [Password history](#password-history)

## Related Documents

- [Authorization][ref-doc-concept-authorization]: the guards that decide which audience a caller is
- [Sensitive Data Reference][ref-doc-reference-sensitive-data]: the protection level of each datum
- [Response][ref-doc-concept-response]: how a response schema strips every undeclared field
- [Request Validation][ref-doc-concept-request-validation]: how a strict request schema rejects an undeclared field
- [Decorators and Guards Reference][ref-doc-reference-decorators-and-guards]: the guards behind each audience
- [Activity Log][ref-doc-concept-activity-log]: masking in the shared lists
- [User][ref-doc-concept-user]: the account flows
- [Workspace][ref-doc-concept-workspace]: members, invites, and join requests
- [Project][ref-doc-concept-project]: project members and roles
- [Session][ref-doc-concept-session]: revocation by the account holder and by a platform admin
- [Device][ref-doc-concept-device]: ownership and the push token
- [Notification][ref-doc-concept-notification]: the censored secrets of a notification
- [MFA][ref-doc-concept-mfa]: factors and re-authentication
- [API Key][ref-doc-concept-api-key]: the secret returned once

## Entry shape

Every resource has the same four fields.

- Audiences: who reads or writes it, by scope.
- Response: the schema each audience receives, with the fields it adds or censors.
- Request: the schema each audience writes with.
- Attribute: the value a rule depends on, such as a role rank, a member role, a status, or the entry's creator.

Every schema follows these conventions.

- A response schema is `z.object` and strips every field it does not declare. A request schema is `z.strictObject` and rejects one.
- Every response schema carries `id` and the six audit fields `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, and `deletedBy`. The delete pair is `deletedAt` and `deletedBy`, and an entry names the fields its schema leaves out.
- A rank rule requires the actor's role type to outrank the target's (`RoleRank`: `superAdmin` 3, `admin` 2, `user` 1). A `superAdmin` actor passes against any target (`RoleService.outranks`), and every platform admin write on a user, a session, a device, an MFA reset, and a role goes through it.
- A blocked user is final: no platform admin action touches a blocked target.

## Audiences

- Platform admin: the `/admin` scope, a role of type `admin` or `superAdmin` plus a policy ability on the subject.
- Account holder: the signed-in user acting on their own account on the `/shared` and `/user` scopes.
- Signed-in user with no membership: any `/user` caller, for a workspace create or a join request.
- Member of the active workspace: a caller the workspace guard accepts through `x-workspace-id`. The member role is the workspace `owner`, a workspace `admin`, or a workspace `member`, and the project member role is a project `admin`, `member`, or `viewer`.
- Visitor: the `/public` scope, no session. It signs up, signs in, and previews a public workspace or an invite.
- System scope: `/system`, a system API key and no JWT. It checks a username or an email.
- Holder of an invite token: previews on `/public` and claims on `/user`, signed in.

## Resources

### User

- Audiences:
    - A platform admin reads any user and writes the users the rank rule allows.
    - The account holder reads and writes their own account.
    - A visitor signs up and signs in.
    - The system scope checks availability.
    - Every reader of an embedded user sees the reference shape.
- Response:
    - `UserSchema` holds `id`, the audit fields, `name`, `username`, `isVerified`, `verifiedAt`, `email`, `roleId`, `role`, `passwordExpired`, `passwordCreated`, `passwordAttempt`, `signUpAt`, `signUpFrom`, `signUpWith`, `status`, `countryId`, `gender`, `lastLoginAt`, `lastIpAddress`, `lastLoginFrom`, `lastLoginWith`, and `photo`.
    - The admin list answers `UserListResponseSchema`: `UserSchema` without `passwordExpired`, `passwordCreated`, `passwordAttempt`, `signUpAt`, `signUpFrom`, `signUpWith`, `gender`, `lastLoginAt`, `lastIpAddress`, `lastLoginFrom`, and `lastLoginWith`.
    - The admin detail and the account holder's profile answer `UserProfileResponseSchema`: `UserSchema` plus `country` and `mobileNumbers`.
    - The admin list and detail answer `email` whole, and the detail answers each mobile `number` whole. The account holder's profile censors both.
    - An embedded user answers `UserRefResponseSchema`: `id`, the audit fields, `name`, `username`, and `photo`. It has no email, status, or role.
    - The system scope answers `badWord` and `exist` for an email, and `pattern` as well for a username.
- Request:
    - A platform admin writes `email` and `roleId` (at create only), `status`, and a temporary password. The account holder writes `gender`, the mobile numbers, the photo, and their own password. Both write `name`, `countryId`, and `username`: the admin at create, the holder by a claim.
    - A platform admin creates with `UserCreateRequestSchema`: `username`, `email`, `roleId`, `countryId`, and an optional `name`.
    - A platform admin changes the status with `UserUpdateStatusRequestSchema`: `status`.
    - The admin password route carries no body. It sets a generated temporary password and sends it to the user by the mandatory `temporaryPasswordByAdmin` email.
    - The account holder updates the profile with `UserUpdateProfileRequestSchema`: `countryId`, `name` (`null` clears it), and `gender`.
    - The account holder claims a `username` with `UserClaimUsernameRequestSchema`.
    - The account holder changes the password with `UserChangePasswordRequestSchema`: the re-authentication proof plus `newPassword`.
    - The account holder adds or changes a mobile number with `countryId` and `number` plus the proof, and deletes one with the proof alone.
    - The proof is `method` with `password`, `passkeyChallengeToken`, or `otp`, as the method needs (`UserReauthenticationRequestSchema`).
    - The account holder sets the photo in two steps: a presign request (`size`, `extension`), then a save (`key`).
    - A visitor signs up with `UserSignUpRequestSchema`: `UserCreateRequestSchema` without `roleId`, plus `password`, `marketing`, `cookies`, `from`, and an optional `inviteToken`.
    - No route changes an `email` after creation.
- Attribute:
    - A platform admin write follows the rank rule. A create checks the role it assigns.
    - A platform admin status or password write refuses the admin's own account and a blocked target.
    - The censoring depends on the scope: the non-admin use case censors, and the schema carries no transform.

### Workspace

- Audiences:
    - A platform admin reads any workspace and transfers ownership.
    - A member reads the workspace they belong to and switches the active workspace.
    - A workspace `admin` updates it.
    - The workspace `owner` transfers ownership and deletes it.
    - A visitor previews a public workspace by slug.
- Response:
    - A platform admin and a member answer `WorkspaceResponseSchema`: `name`, `slug`, `description`, `isPublic`, and the audit fields.
    - The public preview answers `WorkspacePreviewResponseSchema`: `id`, `createdAt`, `updatedAt`, `deletedAt`, `name`, `slug`, and `description`.
- Request:
    - A signed-in user with no membership creates with `WorkspaceCreateRequestSchema`: `name`, and optional `description` and `isPublic`.
    - A workspace `admin` updates with `WorkspaceUpdateRequestSchema` (`name`, `description`, where `null` clears it), `WorkspaceUpdateIsPublicRequestSchema` (`isPublic`), and `WorkspaceUpdateSlugRequestSchema` (`slug`).
    - A member switches with `WorkspaceSwitchRequestSchema`: `workspaceId`.
    - The workspace `owner` and a platform admin transfer with `WorkspaceTransferOwnershipRequestSchema`: `targetUserId`.
    - The delete carries no body and answers the outbox id.
- Attribute:
    - The member's workspace role (`owner`, `admin`, `member`). A role list on the route passes the workspace `owner` always.
    - The preview needs an active workspace with `isPublic` true.

### Workspace member

- Audiences: a platform admin lists any workspace's members, and a member of the active workspace lists its members.
- Response: `WorkspaceMemberResponseSchema`: `workspaceId`, `userId`, `user` (the reference shape, no email), `role`, and `joinedAt`.
- Request: a workspace `admin` changes a role with `WorkspaceMemberUpdateRoleRequestSchema`: `role` is `admin` or `member`, never `owner`.
- Attribute:
    - The target is not the caller and not the workspace `owner`.
    - A workspace `admin` cannot act on another `admin`.
    - The workspace `owner` hands the `owner` role on only by a transfer.

### Workspace invite

- Audiences:
    - A workspace `admin` lists, creates, sends again, and revokes invites.
    - The holder of an invite token previews and claims it.
- Response:
    - A workspace `admin` receives `WorkspaceInviteResponseSchema`: `workspaceId`, `email` (censored), `workspaceRole`, `projectId`, `projectRole`, `reference`, `expiredAt`, `status`, `invitedByUserId`, `acceptedAt`, `acceptedByUserId`, and the audit fields. It has no token.
    - The holder of a token receives `WorkspaceInvitePreviewResponseSchema`: `workspaceName`, `inviterName`, `workspaceRole`, and `expiredAt`.
- Request:
    - A workspace `admin` creates with `WorkspaceInviteCreateRequestSchema`: `email`, `workspaceRole` (`admin` or `member`), and optional `projectId`, `projectRole`, and `expiryDuration`.
    - A workspace `admin` sends again with `WorkspaceInviteResendRequestSchema`: `expiryDuration`.
    - The holder previews and claims with the `inviteToken`.
- Attribute:
    - The invite is pending, and its token digest matches.
    - An invite never grants `owner`.
    - `inviterName` is the workspace name when the inviter's account is deleted.

### Workspace join request

- Audiences: a signed-in user with no membership in the workspace creates one, and a workspace `admin` lists, accepts, and rejects.
- Response: `WorkspaceJoinRequestResponseSchema`: `workspaceId`, `userId`, `status`, `message`, `rejectReasonCode`, `reviewedByUserId`, `reviewedAt`, `expiredAt`, and the audit fields without the delete pair.
- Request:
    - The requester creates with `WorkspaceJoinRequestCreateRequestSchema`: `workspaceId` and an optional `message`.
    - A workspace `admin` rejects with `WorkspaceJoinRequestRejectRequestSchema`: `rejectReasonCode`.
- Attribute: the request status and the reviewer's workspace role.

### Project

- Audiences:
    - A workspace member lists projects.
    - A project member of any role reads one.
    - A project `admin` updates it.
    - A workspace `admin` creates and deletes.
    - A platform admin reads any project.
- Response: `ProjectResponseSchema`: `workspaceId`, `name`, `slug`, `description`, and the audit fields.
- Request:
    - A workspace `admin` creates with `ProjectCreateRequestSchema`: `name` and an optional `description`.
    - A project `admin` updates with `ProjectUpdateRequestSchema` (`name`, `description`) and `ProjectUpdateSlugRequestSchema` (`slug`).
- Attribute:
    - The project member role (`admin`, `member`, `viewer`).
    - A workspace `owner` or `admin` passes a project role list without a project membership row.

### Project member

- Audiences: a project member of any role lists, and a project `admin` assigns, changes, and removes.
- Response: `ProjectMemberResponseSchema`: `projectId`, `userId`, `user` (the reference shape), `role`, and `joinedAt`.
- Request: a project `admin` assigns with `ProjectMemberAssignRequestSchema` (`userId`, `role`) and changes a role with `ProjectMemberUpdateRoleRequestSchema` (`role`).
- Attribute: a project `admin` who is not a workspace `owner` or `admin` cannot assign, change, or remove a project `admin`.

### Activity log entry

- Audiences:
    - The account holder reads the entries whose `userId` is theirs. As a member of the active workspace, they read the entries of that workspace whose `userId` is theirs. Both lists filter `userId`, never `createdBy`.
    - A platform admin reads the entries of any user and of any workspace, optionally narrowed to one `userId`.
- Response:
    - Both scopes answer `ActivityLogResponseSchema`: `id`, `createdAt`, `createdBy`, `userId`, `user` (the reference shape), `action`, `description`, `ipAddress`, `userAgent`, `geoLocation`, and `metadata`. It has no `workspaceId` and no update or delete fields.
    - The shared scope answers an entry the reader created whole.
    - The masking applies to an entry whose `createdBy` is another actor: the shared scope answers it with `ipAddress`, `userAgent`, `geoLocation`, and `createdBy` set to `null` and no `actorUserId` in its metadata (`ActivityLogUtil.toMaskedList`).
    - The admin scope answers every field.
- Request: none. The entry is written by the action it records.
- Attribute: whether the entry's `createdBy` equals the reader's user id.

### Session

- Audiences: the account holder lists their own sessions and revokes one. A platform admin lists a user's sessions and revokes one or all.
- Response: `SessionResponseSchema` in both scopes: `userId`, `user`, `deviceOwnershipId`, `ipAddress`, `userAgent`, `geoLocation`, `expiredAt`, `revokedAt`, `isRevoked`, `revokedById`, `revokedBy`, and the audit fields without the delete pair. It carries no `jtiDigest`.
- Request: the account holder revokes with `SessionRevokeRequestSchema`, a re-authentication proof. The admin routes carry no body.
- Attribute:
    - The session belongs to the caller.
    - A platform admin revoke follows the rank rule and refuses a blocked target.
    - A platform admin revokes every session only for another account.

### Device ownership

- Audiences: the account holder lists their devices, refreshes the current one, and removes one. A platform admin lists a user's devices and removes one.
- Response:
    - `DeviceOwnershipResponseSchema` in both scopes: `deviceId`, `device`, `notificationProvider`, `userId`, `revokedAt`, `isRevoked`, `revokedById`, `revokedBy`, `activeSessionCount`, `isCurrentDevice`, and the audit fields without the delete pair.
    - `device` is `DeviceResponseSchema`: `name`, `platform`, `lastActiveAt`, and the audit fields without the delete pair. It has no fingerprint.
    - No response carries `notificationToken`.
- Request:
    - Sign-in carries `device` as `DeviceRequestSchema`: `fingerprint`, `platform`, and optional `name` and `notificationToken`.
    - The account holder refreshes with `DeviceRefreshRequestSchema`: `name` and `notificationToken` (each `null` clears it) and `platform`.
    - The account holder removes with `DeviceRemoveRequestSchema`, a re-authentication proof.
    - The admin removal carries no body.
- Attribute: the ownership belongs to the caller. A platform admin removal follows the rank rule and refuses a blocked target.

### Notification

- Audiences: the account holder alone, on the `/shared` scope.
- Response:
    - `NotificationResponseSchema`: `userId`, `type`, `priority`, `title`, `body`, `metadata`, `isRead`, `readAt`, and the audit fields without the delete pair.
    - `metadata` has each field censored that the kind's `NotificationKindContract` row lists in `secrets`.
    - The settings answer `NotificationUserSettingResponseSchema`: `settings`, a list of rows with `userId`, `type`, `channel`, `isActive`, and the audit fields without the delete pair.
- Request: the account holder updates a setting with `NotificationUserSettingRequestSchema`: `channel`, `type`, and `isActive`.
- Attribute:
    - A setting row exists for each pair `NotificationSettingContract` lists: `userActivity` with `email`, `inApp`, and `push`, and `marketing` with `email` and `push`. An update to any other pair answers `NotificationSettingInvalidException`.
    - A channel switched off applies to the kinds of that type that are not mandatory.

### MFA

- Audiences: the account holder reads and changes their factors. A platform admin resets a user's factors.
- Response:
    - `MfaStatusResponseSchema`: `isEnabled`, `backupCodesRemaining`, `totp` (`isEnabled`, `isPendingConfirmation`, `confirmedAt`, `lastUsedAt`), and `passkeys`.
    - Each passkey answers `id`, `name`, `deviceType`, `backedUp`, `createdAt`, and `lastUsedAt`. It has no public key and no credential id.
    - `MfaTotpSetupResponseSchema` and `MfaBackupCodesResponseSchema` return the secret and the codes once.
- Request:
    - TOTP setup, enable, and disable, backup-code regeneration, and passkey registration and deletion carry a re-authentication proof, as `UserReauthenticationRequestSchema` or a schema that extends it.
    - A passkey rename takes `MfaPasskeyUpdateRequestSchema`: `name`.
    - The admin reset carries no body.
- Attribute: the factor belongs to the caller. A platform admin reset follows the rank rule and refuses the admin's own account and a blocked target.

### API key

- Audiences: a platform admin with the policy ability `apiKey` for the action of the route.
- Response:
    - `ApiKeyResponseSchema`: `name`, `type`, `key`, `isActive`, `startAt`, `endAt`, and the audit fields without the delete pair. It has no `hash`.
    - `ApiKeyCreateResponseSchema` adds `secret` on create and on reset.
- Request:
    - `ApiKeyCreateRequestSchema`: `name`, `type`, and `startAt` with `endAt`, both or neither.
    - `ApiKeyUpdateRequestSchema`: `name`.
    - `ApiKeyUpdateDateRequestSchema`: `startAt` and `endAt`, both set or both `null`. Both `null` clears the dates, one `null` without the other fails validation, and `endAt` never precedes `startAt`.
    - `ApiKeyUpdateStatusRequestSchema`: `isActive`.
- Attribute: the policy action of the route on the subject `apiKey`.

### Password history

- Audiences: the account holder lists their history. A platform admin lists a user's history.
- Response: `PasswordHistoryResponseSchema`: `userId`, `user`, `type`, `expiredAt`, and `createdAt` and `createdBy`. It has no password hash.
- Request: none.
- Attribute: the history belongs to the caller, or the platform admin holds the policy ability on the route.

<!-- REFERENCES -->

[ref-doc-concept-authorization]: ../concepts/authorization.md
[ref-doc-reference-sensitive-data]: sensitive-data.md
[ref-doc-concept-response]: ../concepts/response.md
[ref-doc-concept-request-validation]: ../concepts/request-validation.md
[ref-doc-reference-decorators-and-guards]: decorators-and-guards.md
[ref-doc-concept-activity-log]: ../concepts/activity-log.md#reading-entries
[ref-doc-concept-user]: ../concepts/user.md
[ref-doc-concept-workspace]: ../concepts/workspace.md
[ref-doc-concept-project]: ../concepts/project.md
[ref-doc-concept-session]: ../concepts/session.md
[ref-doc-concept-device]: ../concepts/device.md
[ref-doc-concept-notification]: ../concepts/notification.md
[ref-doc-concept-mfa]: ../concepts/mfa.md
[ref-doc-concept-api-key]: ../concepts/api-key.md
