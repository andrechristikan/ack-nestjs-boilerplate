import { EnumActivityLogAction } from '@generated/prisma-client/client';

/**
 * Target-side workspace and project actions left out of workspace volume metrics, so each paired action counts once.
 * @public
 */
export const ActivityLogWorkspaceVolumeContract: readonly EnumActivityLogAction[] =
    [
        EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
        EnumActivityLogAction.workspaceMemberRemovedByAdmin,
        EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
        EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
        EnumActivityLogAction.workspaceJoinRejectedByAdmin,
        EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
        EnumActivityLogAction.workspaceInviteCreatedByAdmin,
        EnumActivityLogAction.workspaceInviteRevokedByAdmin,
        EnumActivityLogAction.projectMemberAssignedByAdmin,
        EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
        EnumActivityLogAction.projectMemberRemovedByAdmin,
    ];
