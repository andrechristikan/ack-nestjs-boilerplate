import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';

/**
 * Fields the workspace lists search.
 * @public
 */
export const WorkspaceDefaultAvailableSearch = ['slug', 'name'];

/**
 * Sort fields the admin offset workspace list accepts.
 * @public
 */
export const WorkspaceDefaultAvailableOrderBy = ['createdAt', 'name'];

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const WorkspaceCursorAvailableOrderBy = ['createdAt'];

/**
 * Sort fields the admin offset and user cursor workspace-member lists accept. `joinedAt` is set by
 * the schema default and no repository rewrites it, so the key cannot move a row mid-scroll.
 * @public
 */
export const WorkspaceMemberDefaultAvailableOrderBy = ['joinedAt'];

/**
 * Workspace roles the workspace member list filter accepts.
 * @public
 */
export const WorkspaceMemberDefaultRole = Object.values(
    EnumWorkspaceMemberRole
);

/**
 * Fields the workspace invite list searches.
 * @public
 */
export const WorkspaceInviteDefaultAvailableSearch = ['email', 'reference'];

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const WorkspaceInviteDefaultAvailableOrderBy = ['createdAt'];

/**
 * Invite statuses the workspace invite list filter accepts.
 * @public
 */
export const WorkspaceInviteDefaultStatus = Object.values(
    EnumWorkspaceInviteStatus
);

/**
 * Sort fields the workspace join-request list accepts.
 * @public
 */
export const WorkspaceJoinRequestDefaultAvailableOrderBy = ['createdAt'];

/**
 * Join-request statuses the workspace join-request list filter accepts.
 * @public
 */
export const WorkspaceJoinRequestDefaultStatus = Object.values(
    EnumWorkspaceJoinRequestStatus
);
