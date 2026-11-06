import { EnumActivityLogAction } from '@generated/prisma-client/client';

/** @public */
export const ActivityLogWorkspaceVolumeContract: readonly EnumActivityLogAction[] =
    [
        EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
        EnumActivityLogAction.workspaceMemberRemovedByAdmin,
        EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
        EnumActivityLogAction.workspaceJoinAcceptedByAdmin,
        EnumActivityLogAction.workspaceJoinRejectedByAdmin,
        EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
        EnumActivityLogAction.workspaceInviteCreatedByAdmin,
        EnumActivityLogAction.workspaceInviteResentByAdmin,
        EnumActivityLogAction.workspaceInviteRevokedByAdmin,
        EnumActivityLogAction.projectMemberAssignedByAdmin,
        EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
        EnumActivityLogAction.projectMemberRemovedByAdmin,
    ];
