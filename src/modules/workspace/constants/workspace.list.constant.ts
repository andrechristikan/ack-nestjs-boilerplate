import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    Prisma,
} from '@generated/prisma-client/client';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';

/**
 * Fields the workspace lists search.
 * @public
 */
export const WorkspaceDefaultAvailableSearch = [
    Prisma.WorkspaceScalarFieldEnum.slug,
    Prisma.WorkspaceScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.WorkspaceScalarFieldEnum>;

/**
 * Sort fields the admin offset workspace list accepts.
 * @public
 */
export const WorkspaceDefaultAvailableOrderBy = [
    Prisma.WorkspaceScalarFieldEnum.createdAt,
    Prisma.WorkspaceScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.WorkspaceScalarFieldEnum>;

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const WorkspaceCursorAvailableOrderBy = [
    Prisma.WorkspaceScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.WorkspaceScalarFieldEnum>;

/**
 * Sort fields the admin offset and user cursor workspace-member lists accept. `joinedAt` is set by
 * the schema default and no repository rewrites it, so the key cannot move a row mid-scroll.
 * @public
 */
export const WorkspaceMemberDefaultAvailableOrderBy = [
    Prisma.WorkspaceMemberScalarFieldEnum.joinedAt,
] as const satisfies ReadonlyArray<Prisma.WorkspaceMemberScalarFieldEnum>;

/**
 * Workspace roles the workspace member list filter accepts.
 * @public
 */

export const WorkspaceMemberDefaultRole = Object.values(EnumRoleWorkspaceKey);

/**
 * Fields the workspace invite list searches.
 * @public
 */
export const WorkspaceInviteDefaultAvailableSearch = [
    Prisma.WorkspaceInviteScalarFieldEnum.email,
    Prisma.WorkspaceInviteScalarFieldEnum.reference,
] as const satisfies ReadonlyArray<Prisma.WorkspaceInviteScalarFieldEnum>;

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const WorkspaceInviteDefaultAvailableOrderBy = [
    Prisma.WorkspaceInviteScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.WorkspaceInviteScalarFieldEnum>;

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
export const WorkspaceJoinRequestDefaultAvailableOrderBy = [
    Prisma.WorkspaceJoinRequestScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.WorkspaceJoinRequestScalarFieldEnum>;

/**
 * Join-request statuses the workspace join-request list filter accepts.
 * @public
 */
export const WorkspaceJoinRequestDefaultStatus = Object.values(
    EnumWorkspaceJoinRequestStatus
);
