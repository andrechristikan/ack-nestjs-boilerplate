---
title: Activity Log Reference
description: Every activity-log action with its row owner, workspace, and metadata, the actor and target pairs, and the fields of a stored row.
---

# Activity Log Reference

This page lists the actions of `ActivityLogActionContract`, for a developer who looks up which rows an action writes and what its metadata holds.

## Table of Contents

- [Related Documents](#related-documents)
- [Actions](#actions)
- [Actor and target pairs](#actor-and-target-pairs)
- [Metadata shapes](#metadata-shapes)
- [Stored row](#stored-row)

## Related Documents

- [Activity Log][ref-doc-concept-activity-log]: how an entry is recorded, how rows pair, and how the lists mask them
- [Activity Log Guide][ref-doc-guide-activity-log]: record a new action
- [Workspace][ref-doc-concept-workspace]: the workspace actions
- [Project][ref-doc-concept-project]: the project actions
- [Device][ref-doc-concept-device]: the device actions
- [Session][ref-doc-concept-session]: the session actions
- [User][ref-doc-concept-user]: the account actions
- [Database Reference][ref-doc-reference-database]: the `ActivityLog` model
- [Status Codes][ref-doc-reference-status-codes-activity-log]: `ActivityLogContractInvalidException`

## Actions

Every action has the same entry: the `user` value, the `workspace` value, and the metadata keys of its schema.

- `user` is where the owner comes from. With `payload`, the owner and `createdBy` come from the request's JWT. With `target`, both come from the input: the owner as `userId` and the actor as `createdBy`. A self action may use either (`userSessionRevoked` is `payload`, `userAllSessionsRevoked` is `target`).
- `workspace` is `none` or `target`. Under `target` the input carries the `workspaceId`, and the row stores it. Under `none` the input carries none and the row stores `null`. Every action with a workspace uses `target`.
- Every key is required unless the entry says `optional`.
- Each action has a message under `activityLog.<action>` in `src/languages/en/activityLog.json`.

### User actions

| Action | `user` | `workspace` | Metadata |
| --- | --- | --- | --- |
| `userCreated` | `target` | `none` | none |
| `userBlockedByAdmin` | `target` | `none` | `actorUserId`, `timestamp` |
| `userStatusUpdatedByAdmin` | `target` | `none` | `actorUserId`, `timestamp` |
| `userPasswordUpdatedByAdmin` | `target` | `none` | `actorUserId`, `timestamp` |
| `userMfaResetByAdmin` | `target` | `none` | `actorUserId`, `timestamp` |
| `userLoggedInWithCredential` | `target` | `none` | none |
| `userLoginFailed` | `target` | `none` | none |
| `userReauthenticationFailed` | `target` | `none` | none |
| `userLoggedInWithGoogle` | `target` | `none` | none |
| `userLoggedInWithApple` | `target` | `none` | none |
| `userLoggedInWithPasskey` | `target` | `none` | none |
| `userSignedUp` | `target` | `none` | none |
| `userPasswordResetRequested` | `target` | `none` | none |
| `userPasswordReset` | `target` | `none` | none |
| `userEmailVerified` | `target` | `none` | none |
| `userVerificationEmailSent` | `target` | `none` | none |
| `userMobileNumberVerified` | `payload` | `none` | none |
| `userVerificationMobileNumberSent` | `payload` | `none` | none |
| `userReauthenticationOtpSent` | `payload` | `none` | none |
| `userMaxPasswordAttemptReached` | `target` | `none` | none |
| `userMaxMfaAttemptReached` | `target` | `none` | none |
| `userSessionRevokedByAdmin` | `target` | `none` | `actorUserId`, `timestamp`, `sessionId` |
| `userAllSessionsRevokedByAdmin` | `target` | `none` | `actorUserId`, `sessionCount` |
| `userSessionRevokedByDeviceLogin` | `target` | `none` | `actorUserId`, `sessionCount` |
| `userDeviceRemoved` | `target` | `none` | `deviceOwnershipId`, `deviceId`, `sessionCount` |
| `userCreatedByAdmin` | `target` | `none` | `actorUserId`, `timestamp` |
| `userDeviceRemovedByAdmin` | `target` | `none` | `actorUserId`, `timestamp`, `deviceOwnershipId`, `deviceId`, `sessionCount` |
| `userProfileUpdated` | `payload` | `none` | none |
| `userNotificationSettingUpdated` | `payload` | `none` | `channel`, `type`, `isActive`, each optional |
| `userPhotoProfileUpdated` | `payload` | `none` | none |
| `userPasswordChanged` | `payload` | `none` | none |
| `userSelfDeleted` | `payload` | `none` | none |
| `userMobileNumberAdded` | `payload` | `none` | none |
| `userMobileNumberUpdated` | `payload` | `none` | none |
| `userMobileNumberDeleted` | `payload` | `none` | none |
| `userUsernameClaimed` | `payload` | `none` | none |
| `userTokenRefreshed` | `payload` | `none` | none |
| `userSessionRevoked` | `payload` | `none` | none |
| `userAllSessionsRevoked` | `target` | `none` | none |
| `userTermPolicyAccepted` | `payload` | `none` | none |
| `userMfaTotpSetUp` | `target` | `none` | none |
| `userMfaTotpEnabled` | `target` | `none` | none |
| `userMfaTotpDisabled` | `payload` | `none` | none |
| `userMfaVerified` | `target` | `none` | none |
| `userMfaVerificationFailed` | `target` | `none` | none |
| `userMfaBackupCodesRegenerated` | `payload` | `none` | none |
| `userMfaPasskeyRegistered` | `payload` | `none` | none |
| `userMfaPasskeyUpdated` | `payload` | `none` | none |
| `userMfaPasskeyDeleted` | `payload` | `none` | none |
| `userDeviceRefreshed` | `payload` | `none` | none |
| `userLoggedOut` | `payload` | `none` | none |

### Admin actions

| Action | `user` | `workspace` | Metadata |
| --- | --- | --- | --- |
| `adminSessionRevoked` | `payload` | `none` | `targetUserId`, `targetUsername`, `timestamp`, `sessionId` |
| `adminApiKeyCreated` | `payload` | `none` | `apiKeyId`, `apiKeyName`, `apiKeyType`, `timestamp`, each optional |
| `adminApiKeyReset` | `payload` | `none` | `apiKeyId`, `apiKeyName`, `apiKeyType`, `timestamp`, each optional |
| `adminApiKeyUpdated` | `payload` | `none` | `apiKeyId`, `apiKeyName`, `apiKeyType`, `timestamp`, each optional |
| `adminApiKeyDatesUpdated` | `payload` | `none` | `apiKeyId`, `apiKeyName`, `apiKeyType`, `timestamp`, each optional |
| `adminApiKeyStatusUpdated` | `payload` | `none` | `apiKeyId`, `apiKeyName`, `apiKeyType`, `timestamp`, each optional |
| `adminApiKeyDeleted` | `payload` | `none` | `apiKeyId`, `apiKeyName`, `apiKeyType`, `timestamp`, each optional |
| `adminRoleCreated` | `payload` | `none` | `roleId`, `roleName`, `roleType`, `timestamp`, each optional |
| `adminRoleUpdated` | `payload` | `none` | `roleId`, `roleName`, `roleType`, `timestamp`, each optional |
| `adminRoleDeleted` | `payload` | `none` | `roleId`, `roleName`, `roleType`, `timestamp`, each optional |
| `adminPolicyCreated` | `payload` | `none` | `roleId`, `subject`, `action` |
| `adminPolicyUpdated` | `payload` | `none` | `roleId`, `subject`, `action` |
| `adminPolicyDeleted` | `payload` | `none` | `roleId`, `subject`, `action` |
| `adminTermPolicyCreated` | `payload` | `none` | `termPolicyId`, `termPolicyType`, `termPolicyVersion`, `timestamp`, each optional |
| `adminTermPolicyDeleted` | `payload` | `none` | `termPolicyId`, `termPolicyType`, `termPolicyVersion`, `timestamp`, each optional |
| `adminTermPolicyContentUpdated` | `payload` | `none` | `termPolicyId`, `termPolicyType`, `termPolicyVersion`, `timestamp`, each optional |
| `adminTermPolicyContentAdded` | `payload` | `none` | `termPolicyId`, `termPolicyType`, `termPolicyVersion`, `timestamp`, each optional |
| `adminTermPolicyContentRemoved` | `payload` | `none` | `termPolicyId`, `termPolicyType`, `termPolicyVersion`, `timestamp`, each optional |
| `adminTermPolicyPublished` | `payload` | `none` | `termPolicyId`, `termPolicyType`, `termPolicyVersion`, `timestamp`, each optional |
| `adminTermPolicyEmailResent` | `payload` | `none` | `termPolicyId`, `termPolicyType`, `termPolicyVersion`, `timestamp`, each optional |
| `adminUserCreated` | `payload` | `none` | `targetUserId`, `targetUsername`, `timestamp` |
| `adminUserStatusUpdated` | `payload` | `none` | `targetUserId`, `targetUsername`, `timestamp` |
| `adminUserPasswordUpdated` | `payload` | `none` | `targetUserId`, `targetUsername`, `timestamp` |
| `adminUserMfaReset` | `payload` | `none` | `targetUserId`, `targetUsername`, `timestamp` |
| `adminUserImported` | `payload` | `none` | `userCount` |
| `adminUserExported` | `payload` | `none` | `count` |
| `adminDeviceRemoved` | `payload` | `none` | `targetUserId`, `targetUsername`, `timestamp`, `deviceOwnershipId`, `deviceId`, `sessionCount` |
| `adminAllSessionsRevoked` | `payload` | `none` | `targetUserId`, `sessionCount` |
| `adminWorkspaceOwnershipTransferred` | `target` | `target` | `targetUserId`, `workspaceId`, `previousOwnerUserId` |

### Workspace actions

| Action | `user` | `workspace` | Metadata |
| --- | --- | --- | --- |
| `workspaceCreated` | `target` | `target` | none |
| `workspaceUpdated` | `target` | `target` | none |
| `workspaceVisibilityUpdated` | `target` | `target` | none |
| `workspaceDeleted` | `target` | `target` | none |
| `workspaceSwitched` | `target` | `target` | none |
| `workspaceMemberRoleUpdated` | `target` | `target` | `targetUserId` |
| `workspaceMemberRemoved` | `target` | `target` | `targetUserId` |
| `workspaceMemberLeft` | `target` | `target` | none |
| `workspaceOwnershipTransferred` | `target` | `target` | `targetUserId` |
| `workspaceInviteCreated` | `target` | `target` | `workspaceInviteId`, and `targetUserId` when the email belongs to an active account |
| `workspaceInviteResent` | `target` | `target` | `workspaceInviteId`, and `targetUserId` when the email belongs to an active account |
| `workspaceInviteAccepted` | `target` | `target` | `targetUserId` |
| `workspaceInviteRevoked` | `target` | `target` | `workspaceInviteId`, and `targetUserId` when the email belongs to an active account |
| `workspaceJoinRequested` | `target` | `target` | none |
| `workspaceJoinAccepted` | `target` | `target` | `targetUserId` |
| `workspaceJoinRejected` | `target` | `target` | `targetUserId` |
| `workspaceCreatedByAdmin` | `target` | `target` | `actorUserId` |
| `workspaceMemberRoleUpdatedByAdmin` | `target` | `target` | `actorUserId` |
| `workspaceMemberRemovedByAdmin` | `target` | `target` | `actorUserId` |
| `workspaceOwnershipTransferredByOwner` | `target` | `target` | `actorUserId` |
| `workspaceOwnershipTransferredByAdmin` | `target` | `target` | `actorUserId` |
| `workspaceOwnershipRemovedByAdmin` | `target` | `target` | `actorUserId`, `targetUserId` |
| `workspaceInviteCreatedByAdmin` | `target` | `target` | `actorUserId` |
| `workspaceInviteResentByAdmin` | `target` | `target` | `actorUserId` |
| `workspaceInviteAcceptedByInvitee` | `target` | `target` | `actorUserId` |
| `workspaceInviteRevokedByAdmin` | `target` | `target` | `actorUserId` |
| `workspaceJoinAcceptedByAdmin` | `target` | `target` | `actorUserId` |
| `workspaceJoinRejectedByAdmin` | `target` | `target` | `actorUserId` |

### Project actions

| Action                            | `user`   | `workspace` | Metadata       |
| --------------------------------- | -------- | ----------- | -------------- |
| `projectCreated`                  | `target` | `target`    | none           |
| `projectUpdated`                  | `target` | `target`    | none           |
| `projectDeleted`                  | `target` | `target`    | none           |
| `projectMemberAssigned`           | `target` | `target`    | `targetUserId` |
| `projectMemberRoleUpdated`        | `target` | `target`    | `targetUserId` |
| `projectMemberRemoved`            | `target` | `target`    | `targetUserId` |
| `projectMemberLeft`               | `target` | `target`    | none           |
| `projectMemberAssignedByAdmin`    | `target` | `target`    | `actorUserId`  |
| `projectMemberRoleUpdatedByAdmin` | `target` | `target`    | `actorUserId`  |
| `projectMemberRemovedByAdmin`     | `target` | `target`    | `actorUserId`  |

## Actor and target pairs

An action one user takes on another writes the actor row and, when the affected user is someone else, the target row. The actor row carries the affected user as `targetUserId`. The target row belongs to the affected user and carries `actorUserId`. `ByAdmin` names a platform admin on an admin-surface pair, and the workspace or project owner or admin on a workspace or project pair. On `workspaceInviteAccepted` the `targetUserId` is the inviter, and on `workspaceOwnershipRemovedByAdmin` it is the new owner.

| Actor action | Target action | Affected user |
| --- | --- | --- |
| `adminUserCreated` | `userCreatedByAdmin`, and `workspaceCreatedByAdmin` for the personal workspace | The new user |
| `adminUserImported` | `userCreatedByAdmin` and `workspaceCreatedByAdmin` for each imported user, beside one `adminUserImported` row for the admin | Each new user |
| `adminUserStatusUpdated` | `userBlockedByAdmin` for status `blocked`, `userStatusUpdatedByAdmin` for any other status | The updated user |
| `adminUserPasswordUpdated` | `userPasswordUpdatedByAdmin` | The updated user |
| `adminUserMfaReset` | `userMfaResetByAdmin` | The updated user |
| `adminSessionRevoked` | `userSessionRevokedByAdmin` | The session owner |
| `adminAllSessionsRevoked` | `userAllSessionsRevokedByAdmin` | The session owner |
| `adminDeviceRemoved` | `userDeviceRemovedByAdmin` | The device owner |
| `adminWorkspaceOwnershipTransferred` | `workspaceOwnershipRemovedByAdmin`, `workspaceOwnershipTransferredByAdmin` | The previous owner, the new owner |
| `workspaceMemberRoleUpdated` | `workspaceMemberRoleUpdatedByAdmin` | The target member |
| `workspaceMemberRemoved` | `workspaceMemberRemovedByAdmin` | The removed member |
| `workspaceOwnershipTransferred` | `workspaceOwnershipTransferredByOwner` | The new owner |
| `workspaceInviteCreated` | `workspaceInviteCreatedByAdmin` | The active account whose email matches the invite |
| `workspaceInviteResent` | `workspaceInviteResentByAdmin` | The active account whose email matches the invite |
| `workspaceInviteRevoked` | `workspaceInviteRevokedByAdmin` | The active account whose email matches the invite |
| `workspaceInviteAccepted` | `workspaceInviteAcceptedByInvitee` | The inviter |
| `workspaceJoinAccepted` | `workspaceJoinAcceptedByAdmin` | The requester |
| `workspaceJoinRejected` | `workspaceJoinRejectedByAdmin` | The requester |
| `projectMemberAssigned` | `projectMemberAssignedByAdmin` | The assigned member |
| `projectMemberRoleUpdated` | `projectMemberRoleUpdatedByAdmin` | The target member |
| `projectMemberRemoved` | `projectMemberRemovedByAdmin` | The removed member |

- An action that appears in no row of the table writes one row: a self action such as `userDeviceRemoved` or `userLoginFailed`, or an admin action with no affected user such as `adminApiKeyCreated`.
- A device sign-in writes `userSessionRevokedByDeviceLogin` as a target row with no actor row, one per user whose live sessions it revoked. Its `createdBy` and `actorUserId` are the user who signed in on the device.
- An invite actor row is written whether or not the email has an account, and the target row only when the email belongs to an active account.
- An admin onboarding writes `userCreatedByAdmin` and `workspaceCreatedByAdmin` for each new user with `createdBy` set to the admin, and `adminUserCreated` or `adminUserImported` for the admin.
- A sign-up writes `userSignedUp` and `userVerificationEmailSent`, and a social sign-up writes `userCreated`. Both write `workspaceCreated` for a personal workspace, or the `workspaceInviteAccepted` pair for an invite token, with the new user as `createdBy`.
- `ActivityLogWorkspaceVolumeContract` lists fourteen target actions that the workspace volume metrics leave out: `workspaceMemberRoleUpdatedByAdmin`, `workspaceMemberRemovedByAdmin`, `workspaceOwnershipTransferredByOwner`, `workspaceOwnershipRemovedByAdmin`, `workspaceOwnershipTransferredByAdmin`, `workspaceJoinAcceptedByAdmin`, `workspaceJoinRejectedByAdmin`, `workspaceInviteAcceptedByInvitee`, `workspaceInviteCreatedByAdmin`, `workspaceInviteResentByAdmin`, `workspaceInviteRevokedByAdmin`, `projectMemberAssignedByAdmin`, `projectMemberRoleUpdatedByAdmin`, and `projectMemberRemovedByAdmin`.

## Metadata shapes

A schema is a strict zod object under `src/modules/activity-log/dtos/`. Metadata is stored as `null` when empty. The response declares every key as optional, types `timestamp` as a string, and strips a stored key it does not declare.

| Schema | Keys |
| --- | --- |
| `ActivityLogEmptyMetadataSchema` | none |
| `ActivityLogActorMetadataSchema` | `targetUserId` |
| `ActivityLogTargetMetadataSchema` | `actorUserId` |
| `ActivityLogUserActorMetadataSchema` | `targetUserId`, `targetUsername`, `timestamp` |
| `ActivityLogUserTargetMetadataSchema` | `actorUserId`, `timestamp` |
| `ActivityLogSessionActorMetadataSchema` | the user actor keys and `sessionId` |
| `ActivityLogSessionTargetMetadataSchema` | the user target keys and `sessionId` |
| `ActivityLogSessionAllActorMetadataSchema` | `targetUserId`, `sessionCount` |
| `ActivityLogSessionAllTargetMetadataSchema` | `actorUserId`, `sessionCount` |
| `ActivityLogDeviceMetadataSchema` | `deviceOwnershipId`, `deviceId`, `sessionCount` |
| `ActivityLogDeviceActorMetadataSchema` | the user actor keys and the device keys |
| `ActivityLogDeviceTargetMetadataSchema` | the user target keys and the device keys |
| `ActivityLogInviteMetadataSchema` | a union of `ActivityLogInviteEmailMetadataSchema` (`workspaceInviteId`) and `ActivityLogInviteAccountMetadataSchema` (`workspaceInviteId` and `targetUserId`, for an active account) |
| `ActivityLogOwnershipActorMetadataSchema` | `targetUserId`, `workspaceId`, `previousOwnerUserId` |
| `ActivityLogOwnershipTargetMetadataSchema` | `actorUserId`, `targetUserId` |
| `ActivityLogImportMetadataSchema` | `userCount` |
| `ActivityLogExportMetadataSchema` | `count` |
| `ActivityLogNotificationSettingMetadataSchema` | `channel`, `type`, `isActive`, each optional |
| `ActivityLogApiKeyMetadataSchema` | `apiKeyId`, `apiKeyName`, `apiKeyType`, `timestamp`, each optional |
| `ActivityLogRoleMetadataSchema` | `roleId`, `roleName`, `roleType`, `timestamp`, each optional |
| `ActivityLogPolicyMetadataSchema` | `roleId`, `subject`, `action` |
| `ActivityLogTermPolicyMetadataSchema` | `termPolicyId`, `termPolicyType`, `termPolicyVersion`, `timestamp`, each optional |

## Stored row

| Field | Holds |
| --- | --- |
| `id` | Drawn when the entry is recorded, so a retried job recognizes a row it wrote |
| `userId` | The owner of the row, embedded as `user` on read |
| `createdBy` | The user who performed the action, nullable in a response |
| `action` | An `EnumActivityLogAction` member, a Prisma enum |
| `description` | The text of `activityLog.<action>`, rendered when the entry is recorded in the default language (`message.defaultLanguage`) |
| `ipAddress` | From the request log, nullable |
| `userAgent` | From the request log |
| `geoLocation` | From the request log, nullable |
| `metadata` | The validated metadata, `null` when empty |
| `workspaceId` | Per the contract's `workspace` value, `null` for `none` |
| `createdAt` | The time the entry was recorded |

<!-- REFERENCES -->

[ref-doc-concept-activity-log]: ../concepts/activity-log.md
[ref-doc-concept-workspace]: ../concepts/workspace.md
[ref-doc-concept-project]: ../concepts/project.md
[ref-doc-concept-device]: ../concepts/device.md
[ref-doc-concept-session]: ../concepts/session.md
[ref-doc-concept-user]: ../concepts/user.md
[ref-doc-guide-activity-log]: ../guides/activity-log.md
[ref-doc-reference-database]: database.md
[ref-doc-reference-status-codes-activity-log]: status-codes.md#activity-log
