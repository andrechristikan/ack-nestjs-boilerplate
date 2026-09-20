import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';
import { ActivityLogApiKeyMetadataSchema } from '@modules/activity-log/dtos/activity-log.api-key-metadata.dto';
import { ActivityLogDeviceActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-actor-metadata.dto';
import { ActivityLogDeviceMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-metadata.dto';
import { ActivityLogDeviceTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-target-metadata.dto';
import { ActivityLogEmptyMetadataSchema } from '@modules/activity-log/dtos/activity-log.empty-metadata.dto';
import { ActivityLogImportMetadataSchema } from '@modules/activity-log/dtos/activity-log.import-metadata.dto';
import { ActivityLogInviteMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-metadata.dto';
import { ActivityLogNotificationSettingMetadataSchema } from '@modules/activity-log/dtos/activity-log.notification-setting-metadata.dto';
import { ActivityLogRoleMetadataSchema } from '@modules/activity-log/dtos/activity-log.role-metadata.dto';
import { ActivityLogSessionActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-actor-metadata.dto';
import { ActivityLogSessionAllActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-all-actor-metadata.dto';
import { ActivityLogSessionAllTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-all-target-metadata.dto';
import { ActivityLogSessionTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-target-metadata.dto';
import { ActivityLogTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.target-metadata.dto';
import { ActivityLogTermPolicyMetadataSchema } from '@modules/activity-log/dtos/activity-log.term-policy-metadata.dto';
import { ActivityLogUserActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-actor-metadata.dto';
import { ActivityLogUserTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-target-metadata.dto';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogActionContract } from '@modules/activity-log/interfaces/activity-log.interface';

/**
 * Per-action contract of an activity-log event: how its user and workspace resolve and the schema its metadata must match.
 * @public
 */
export const ActivityLogActionContract: Record<
    EnumActivityLogAction,
    IActivityLogActionContract
> = {
    // Pre-auth / subject-id without JWT / dual-feed subject rows
    [EnumActivityLogAction.userCreated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userBlocked]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userUpdateStatus]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userUpdatePasswordByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userResetTwoFactorByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userLoginCredential]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLoginFailed]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLoginGoogle]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLoginApple]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userSignedUp]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userForgotPassword]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userResetPassword]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userVerifiedEmail]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userSendVerificationEmail]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userReachMaxPasswordAttempt]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userRevokeSessionByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionTargetMetadataSchema,
    },
    [EnumActivityLogAction.userRevokeAllSessionsByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionAllTargetMetadataSchema,
    },
    [EnumActivityLogAction.userRemoveDevice]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogDeviceMetadataSchema,
    },
    [EnumActivityLogAction.userCreatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userRemoveDeviceByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogDeviceTargetMetadataSchema,
    },

    // Authenticated self-service
    [EnumActivityLogAction.userUpdateProfile]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userUpdateNotificationSetting]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogNotificationSettingMetadataSchema,
    },
    [EnumActivityLogAction.userUpdatePhotoProfile]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userChangePassword]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userDeleteSelf]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userAddMobileNumber]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userUpdateMobileNumber]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userDeleteMobileNumber]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userClaimUsername]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userRefreshToken]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userRevokeSession]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userRevokeAllSessions]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userAcceptTermPolicy]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userSetupTwoFactor]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userEnableTwoFactor]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userDisableTwoFactor]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userVerifyTwoFactor]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userRegenerateTwoFactorBackupCodes]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userDeviceRefresh]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLogout]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },

    // Admin platform + admin dual-feed payload rows
    [EnumActivityLogAction.adminSessionRevoke]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionActorMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyCreate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyReset]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyUpdate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyUpdateDate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyUpdateStatus]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyDelete]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminRoleCreate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogRoleMetadataSchema,
    },
    [EnumActivityLogAction.adminRoleUpdate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogRoleMetadataSchema,
    },
    [EnumActivityLogAction.adminRoleDelete]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogRoleMetadataSchema,
    },
    [EnumActivityLogAction.adminPolicyCreate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.adminPolicyUpdate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.adminPolicyDelete]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyCreate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyDelete]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyUpdateContent]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyAddContent]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyRemoveContent]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyPublish]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminUserCreate]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserActorMetadataSchema,
    },
    [EnumActivityLogAction.adminUserUpdateStatus]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserActorMetadataSchema,
    },
    [EnumActivityLogAction.adminUserUpdatePassword]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserActorMetadataSchema,
    },
    [EnumActivityLogAction.adminUserResetTwoFactor]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserActorMetadataSchema,
    },
    [EnumActivityLogAction.adminUserImport]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogImportMetadataSchema,
    },
    [EnumActivityLogAction.adminDeviceRemove]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogDeviceActorMetadataSchema,
    },
    [EnumActivityLogAction.adminSessionRevokeAll]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionAllActorMetadataSchema,
    },

    // Workspace / project — explicit workspaceId staged
    [EnumActivityLogAction.workspaceCreated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceUpdated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceVisibilityUpdated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceDeleted]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceSwitched]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceMemberRoleUpdated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.workspaceMemberRemoved]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.workspaceMemberLeft]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceOwnershipTransferred]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteCreated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogInviteMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteAccepted]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteRevoked]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogInviteMetadataSchema,
    },
    [EnumActivityLogAction.workspaceJoinRequested]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceJoinAccepted]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.workspaceJoinRejected]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.workspaceCreatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceMemberRemovedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceOwnershipTransferredByOwner]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteCreatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteAcceptedByInvitee]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteRevokedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceJoinAcceptedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceJoinRejectedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },

    [EnumActivityLogAction.projectCreated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.projectUpdated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.projectDeleted]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberAssigned]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberRoleUpdated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberRemoved]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberLeft]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberAssignedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberRoleUpdatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberRemovedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
};
