import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';

/**
 * Request-store key holding the project the project guard resolved.
 * @public
 */
export const ProjectStoreKey = 'ProjectStore';

/**
 * Request-store key holding the caller's project membership.
 * @public
 */
export const ProjectMemberStoreKey = 'ProjectMemberStore';

/**
 * Request-store key holding whether `ProjectRoleGuard` let the caller through on the workspace-owner bypass instead of a `ProjectMember` row.
 * @public
 */
export const ProjectWorkspaceOwnerStoreKey = 'ProjectWorkspaceOwnerStore';

/**
 * Route metadata key holding the project roles `@ProjectMemberProtected` requires.
 * @public
 */
export const ProjectRoleMetaKey = 'ProjectRoleMetaKey';

/**
 * Matches a `Project` that is not soft-deleted.
 */
export const ProjectActiveFilter: Prisma.ProjectWhereInput = {
    deletedAt: null,
};

/**
 * The only workspace role that sees and manages every project without a `ProjectMember` row.
 * @public
 */
export const ProjectWorkspaceBypassRole = EnumWorkspaceMemberRole.owner;
