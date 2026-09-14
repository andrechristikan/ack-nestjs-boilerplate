import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogApiKeyMetadataSchema } from '@modules/activity-log/dtos/activity-log.api-key-metadata.dto';
import { ActivityLogDeviceMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-metadata.dto';
import { ActivityLogEmptyMetadataSchema } from '@modules/activity-log/dtos/activity-log.empty-metadata.dto';
import { ActivityLogNotificationSettingMetadataSchema } from '@modules/activity-log/dtos/activity-log.notification-setting-metadata.dto';
import { ActivityLogRoleMetadataSchema } from '@modules/activity-log/dtos/activity-log.role-metadata.dto';
import { ActivityLogSessionMetadataSchema } from '@modules/activity-log/dtos/activity-log.session-metadata.dto';
import { ActivityLogTermPolicyMetadataSchema } from '@modules/activity-log/dtos/activity-log.term-policy-metadata.dto';
import { ActivityLogUserMetadataSchema } from '@modules/activity-log/dtos/activity-log.user-metadata.dto';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
import { IActivityLogContract } from '@modules/activity-log/interfaces/activity-log.interface';

export const ActivityLogContractByAction: Record<
    EnumActivityLogAction,
    IActivityLogContract
> = {
    // Pre-auth / subject-id without JWT / dual-feed subject rows
    [EnumActivityLogAction.userCreated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.userBlocked]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.userUpdateStatus]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.userUpdatePasswordByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.userResetTwoFactorByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.userLoginCredential]: {
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
        metadata: ActivityLogSessionMetadataSchema,
    },
    [EnumActivityLogAction.userRevokeAllSessionsByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userRemoveDevice]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogDeviceMetadataSchema,
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
        metadata: ActivityLogSessionMetadataSchema,
    },
    [EnumActivityLogAction.userRevokeAllSessions]: {
        user: EnumActivityLogUser.payload,
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
        metadata: ActivityLogSessionMetadataSchema,
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
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.adminUserUpdateStatus]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.adminUserUpdatePassword]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.adminUserResetTwoFactor]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserMetadataSchema,
    },
    [EnumActivityLogAction.adminUserImport]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.adminDeviceRemove]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogDeviceMetadataSchema,
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
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceMemberRemoved]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceMemberLeft]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceOwnershipTransferred]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteCreated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteAccepted]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteRevoked]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceJoinRequested]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceJoinAccepted]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.workspaceJoinRejected]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
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
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberRoleUpdated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberRemoved]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.projectMemberLeft]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogEmptyMetadataSchema,
    },
};
