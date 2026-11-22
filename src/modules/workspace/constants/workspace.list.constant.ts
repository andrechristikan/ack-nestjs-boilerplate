import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';

/** @public */
export const WorkspaceDefaultAvailableSearch = [
    Prisma.WorkspaceScalarFieldEnum.slug,
    Prisma.WorkspaceScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.WorkspaceScalarFieldEnum>;

/** @public */
export const WorkspaceDefaultAvailableOrderBy = [
    Prisma.WorkspaceScalarFieldEnum.createdAt,
    Prisma.WorkspaceScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.WorkspaceScalarFieldEnum>;

/** @public */
export const WorkspaceCursorAvailableOrderBy = [
    Prisma.WorkspaceScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.WorkspaceScalarFieldEnum>;

/** @public */
export const WorkspaceMemberDefaultAvailableOrderBy = [
    Prisma.WorkspaceMemberScalarFieldEnum.joinedAt,
] as const satisfies ReadonlyArray<Prisma.WorkspaceMemberScalarFieldEnum>;

/** @public */
export const WorkspaceMemberDefaultRole = Object.values(
    EnumWorkspaceMemberRole
);

/** @public */
export const WorkspaceInviteDefaultAvailableSearch = [
    Prisma.WorkspaceInviteScalarFieldEnum.email,
    Prisma.WorkspaceInviteScalarFieldEnum.reference,
] as const satisfies ReadonlyArray<Prisma.WorkspaceInviteScalarFieldEnum>;

/** @public */
export const WorkspaceInviteDefaultAvailableOrderBy = [
    Prisma.WorkspaceInviteScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.WorkspaceInviteScalarFieldEnum>;

/** @public */
export const WorkspaceInviteDefaultStatus = Object.values(
    EnumWorkspaceInviteStatus
);

/** @public */
export const WorkspaceJoinRequestDefaultAvailableOrderBy = [
    Prisma.WorkspaceJoinRequestScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.WorkspaceJoinRequestScalarFieldEnum>;

/** @public */
export const WorkspaceJoinRequestDefaultStatus = Object.values(
    EnumWorkspaceJoinRequestStatus
);

/** @public */
export const WorkspaceUserListCursorScope = 'WorkspaceUserListCursorScope';

/** @public */
export const WorkspaceMemberUserListCursorScope =
    'WorkspaceMemberUserListCursorScope';

/** @public */
export const WorkspaceInviteUserListCursorScope =
    'WorkspaceInviteUserListCursorScope';

/** @public */
export const WorkspaceJoinRequestUserListCursorScope =
    'WorkspaceJoinRequestUserListCursorScope';
