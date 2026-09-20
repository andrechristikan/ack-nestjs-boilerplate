import { Prisma } from '@generated/prisma-client/client';

/**
 * Request-store key holding the workspace the workspace guard resolved.
 * @public
 */
export const WorkspaceStoreKey = 'WorkspaceStore';

/**
 * Request-store key holding the caller's workspace membership.
 * @public
 */
export const WorkspaceMemberStoreKey = 'WorkspaceMemberStore';

/**
 * Route metadata key holding the workspace roles `@WorkspaceMemberProtected` requires.
 * @public
 */
export const WorkspaceRoleMetaKey = 'WorkspaceRoleMetaKey';

/**
 * Matches a `Workspace` that is not soft-deleted.
 */
export const WorkspaceActiveFilter: Prisma.WorkspaceWhereInput = {
    deletedAt: null,
};

export const WorkspaceInviteUserListSelect = {
    id: true,
    workspaceId: true,
    email: true,
    workspaceRole: true,
    projectId: true,
    projectRole: true,
    reference: true,
    expiredAt: true,
    status: true,
    invitedByUserId: true,
    acceptedAt: true,
    acceptedByUserId: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
} satisfies Prisma.WorkspaceInviteSelect;
