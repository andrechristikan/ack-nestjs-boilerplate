import { Prisma } from '@generated/prisma-client';

export const WorkspaceStoreKey = 'WorkspaceStore';
export const WorkspaceMemberStoreKey = 'WorkspaceMemberStore';
export const WorkspaceRoleMetaKey = 'WorkspaceRoleMetaKey';

/**
 * Matches a `Workspace` that is not soft-deleted.
 */
export const WorkspaceActiveFilter: Prisma.WorkspaceWhereInput = {
    deletedAt: null,
};
