import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';

export const WorkspaceDefaultAvailableSearch = ['slug', 'name'];
export const WorkspaceDefaultAvailableOrderBy = ['createdAt', 'name'];

/** Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows. */
export const WorkspaceCursorAvailableOrderBy = ['createdAt'];

/**
 * Cursor-route allow-list. `joinedAt` is set by the schema default and no repository rewrites it,
 * so the key cannot move a row mid-scroll.
 */
export const WorkspaceMemberDefaultAvailableOrderBy = ['joinedAt'];
export const WorkspaceMemberDefaultRole = Object.values(
    EnumWorkspaceMemberRole
);

export const WorkspaceInviteDefaultAvailableSearch = ['email', 'reference'];
/** Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows. */
export const WorkspaceInviteDefaultAvailableOrderBy = ['createdAt'];
export const WorkspaceInviteDefaultStatus = Object.values(
    EnumWorkspaceInviteStatus
);

export const WorkspaceJoinRequestDefaultAvailableOrderBy = ['createdAt'];
export const WorkspaceJoinRequestDefaultStatus = Object.values(
    EnumWorkspaceJoinRequestStatus
);
