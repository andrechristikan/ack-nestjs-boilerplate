import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.actor-metadata.dto';
import { ActivityLogApiKeyMetadataSchema } from '@modules/activity-log/dtos/activity-log.api-key-metadata.dto';
import { ActivityLogDeviceActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-actor-metadata.dto';
import { ActivityLogDeviceMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-metadata.dto';
import { ActivityLogDeviceTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.device-target-metadata.dto';
import { ActivityLogEmptyMetadataSchema } from '@modules/activity-log/dtos/activity-log.empty-metadata.dto';
import { ActivityLogExportMetadataSchema } from '@modules/activity-log/dtos/activity-log.export-metadata.dto';
import { ActivityLogImportMetadataSchema } from '@modules/activity-log/dtos/activity-log.import-metadata.dto';
import { ActivityLogInviteMetadataSchema } from '@modules/activity-log/dtos/activity-log.invite-metadata.dto';
import { ActivityLogNotificationSettingMetadataSchema } from '@modules/activity-log/dtos/activity-log.notification-setting-metadata.dto';
import { ActivityLogOwnershipActorMetadataSchema } from '@modules/activity-log/dtos/activity-log.ownership-actor-metadata.dto';
import { ActivityLogOwnershipTargetMetadataSchema } from '@modules/activity-log/dtos/activity-log.ownership-target-metadata.dto';
import { ActivityLogPolicyMetadataSchema } from '@modules/activity-log/dtos/activity-log.policy-metadata.dto';
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
import type { IActivityLogActionContracts } from '@modules/activity-log/interfaces/activity-log.interface';

/** @public */
export const ActivityLogActionContract: IActivityLogActionContracts = {
    [EnumActivityLogAction.userCreated]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userBlockedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userStatusUpdatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userPasswordUpdatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userMfaResetByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userLoggedInWithCredential]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLoginFailed]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userReauthenticationFailed]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLoggedInWithGoogle]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLoggedInWithApple]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLoggedInWithPasskey]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userSignedUp]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userPasswordResetRequested]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userPasswordReset]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userEmailVerified]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userVerificationEmailSent]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMobileNumberVerified]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userVerificationMobileNumberSent]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userReauthenticationOtpSent]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMaxPasswordAttemptReached]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMaxMfaAttemptReached]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userSessionRevokedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionTargetMetadataSchema,
    },
    [EnumActivityLogAction.userAllSessionsRevokedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionAllTargetMetadataSchema,
    },
    [EnumActivityLogAction.userSessionRevokedByDeviceLogin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionAllTargetMetadataSchema,
    },
    [EnumActivityLogAction.userDeviceRemoved]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogDeviceMetadataSchema,
    },
    [EnumActivityLogAction.userCreatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserTargetMetadataSchema,
    },
    [EnumActivityLogAction.userDeviceRemovedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogDeviceTargetMetadataSchema,
    },

    [EnumActivityLogAction.userProfileUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userNotificationSettingUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogNotificationSettingMetadataSchema,
    },
    [EnumActivityLogAction.userPhotoProfileUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userPasswordChanged]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userSelfDeleted]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMobileNumberAdded]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMobileNumberUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMobileNumberDeleted]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userUsernameClaimed]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userTokenRefreshed]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userSessionRevoked]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userAllSessionsRevoked]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userTermPolicyAccepted]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaTotpSetUp]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaTotpEnabled]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaTotpDisabled]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaVerified]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaVerificationFailed]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaBackupCodesRegenerated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaPasskeyRegistered]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaPasskeyUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userMfaPasskeyDeleted]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userDeviceRefreshed]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },
    [EnumActivityLogAction.userLoggedOut]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogEmptyMetadataSchema,
    },

    [EnumActivityLogAction.adminSessionRevoked]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionActorMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyCreated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyReset]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyDatesUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyStatusUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminApiKeyDeleted]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogApiKeyMetadataSchema,
    },
    [EnumActivityLogAction.adminRoleCreated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogRoleMetadataSchema,
    },
    [EnumActivityLogAction.adminRoleUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogRoleMetadataSchema,
    },
    [EnumActivityLogAction.adminRoleDeleted]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogRoleMetadataSchema,
    },
    [EnumActivityLogAction.adminPolicyCreated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminPolicyUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminPolicyDeleted]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyCreated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyDeleted]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyContentUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyContentAdded]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyContentRemoved]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyPublished]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminTermPolicyEmailResent]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogTermPolicyMetadataSchema,
    },
    [EnumActivityLogAction.adminUserCreated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserActorMetadataSchema,
    },
    [EnumActivityLogAction.adminUserStatusUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserActorMetadataSchema,
    },
    [EnumActivityLogAction.adminUserPasswordUpdated]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserActorMetadataSchema,
    },
    [EnumActivityLogAction.adminUserMfaReset]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogUserActorMetadataSchema,
    },
    [EnumActivityLogAction.adminUserImported]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogImportMetadataSchema,
    },
    [EnumActivityLogAction.adminUserExported]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogExportMetadataSchema,
    },
    [EnumActivityLogAction.adminDeviceRemoved]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogDeviceActorMetadataSchema,
    },
    [EnumActivityLogAction.adminAllSessionsRevoked]: {
        user: EnumActivityLogUser.payload,
        workspace: EnumActivityLogWorkspace.none,
        metadata: ActivityLogSessionAllActorMetadataSchema,
    },
    [EnumActivityLogAction.adminWorkspaceOwnershipTransferred]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogOwnershipActorMetadataSchema,
    },

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
    [EnumActivityLogAction.workspaceInviteResent]: {
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
    [EnumActivityLogAction.workspaceOwnershipTransferredByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceOwnershipRemovedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogOwnershipTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteCreatedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    [EnumActivityLogAction.workspaceInviteResentByAdmin]: {
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
