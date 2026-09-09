import { EnumWorkspaceMemberRole, Prisma } from '@generated/prisma-client';

export const ProjectStoreKey = 'ProjectStore';
export const ProjectMemberStoreKey = 'ProjectMemberStore';
/** Whether `ProjectRoleGuard` let the caller through on the workspace-owner bypass instead of a `ProjectMember` row. */
export const ProjectWorkspaceOwnerStoreKey = 'ProjectWorkspaceOwnerStore';
export const ProjectRoleMetaKey = 'ProjectRoleMetaKey';

/**
 * Matches a `Project` that is not soft-deleted.
 */
export const ProjectActiveFilter: Prisma.ProjectWhereInput = {
    deletedAt: null,
};

/** The only workspace role that sees and manages every project without a `ProjectMember` row. */
export const ProjectWorkspaceBypassRole = EnumWorkspaceMemberRole.owner;
