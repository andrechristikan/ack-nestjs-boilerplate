import { EnumWorkspaceMemberRole, Prisma } from '@generated/prisma-client';

export const ProjectStoreKey = 'ProjectStore';
export const ProjectMemberStoreKey = 'ProjectMemberStore';
/** Whether `ProjectRoleGuard` let the caller through on the workspace-owner bypass instead of a `ProjectMember` row. */
export const ProjectWorkspaceOwnerStoreKey = 'ProjectWorkspaceOwnerStore';
export const ProjectRoleMetaKey = 'ProjectRoleMetaKey';

/**
 * Matches a `Project` that is not soft-deleted, including documents written before this field
 * was set explicitly at create time. Prisma's MongoDB connector compiles `{ deletedAt: null }`
 * alone into a query that also requires the field to be present (an `isSet` guard), so it silently
 * excludes any document where `deletedAt` was never persisted at all — as opposed to persisted and
 * explicitly `null`. This OR restores "active" semantics for that data, top-level or nested.
 */
export const ProjectActiveFilter: NonNullable<
    Prisma.ProjectWhereInput['OR']
> = [{ deletedAt: null }, { deletedAt: { isSet: false } }];

/** The only workspace role that sees and manages every project without a `ProjectMember` row. */
export const ProjectWorkspaceBypassRole = EnumWorkspaceMemberRole.owner;
