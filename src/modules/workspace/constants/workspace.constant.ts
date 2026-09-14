import { Prisma } from '@generated/prisma-client';

export const WorkspaceStoreKey = 'WorkspaceStore';
export const WorkspaceMemberStoreKey = 'WorkspaceMemberStore';
export const WorkspaceRoleMetaKey = 'WorkspaceRoleMetaKey';

/**
 * Matches a `Workspace` that is not soft-deleted, including documents written before this field
 * was set explicitly at create time. Prisma's MongoDB connector compiles `{ deletedAt: null }`
 * alone into a query that also requires the field to be present (an `isSet` guard), so it silently
 * excludes any document where `deletedAt` was never persisted at all — as opposed to persisted and
 * explicitly `null`. This OR restores "active" semantics for that data, top-level or nested.
 */
export const WorkspaceActiveFilter: NonNullable<
    Prisma.WorkspaceWhereInput['OR']
> = [{ deletedAt: null }, { deletedAt: { isSet: false } }];
