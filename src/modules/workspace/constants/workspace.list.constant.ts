import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';

export const WorkspaceDefaultAvailableSearch = ['slug', 'name'];
export const WorkspaceDefaultAvailableOrderBy = ['createdAt', 'name'];

export const WorkspaceMemberDefaultAvailableOrderBy = ['joinedAt'];
export const WorkspaceMemberDefaultRole = Object.values(
    EnumWorkspaceMemberRole
);

export const WorkspaceInviteDefaultAvailableSearch = ['email', 'reference'];
export const WorkspaceInviteDefaultAvailableOrderBy = [
    'createdAt',
    'expiredAt',
];
export const WorkspaceInviteDefaultStatus = Object.values(
    EnumWorkspaceInviteStatus
);

export const WorkspaceJoinRequestDefaultAvailableOrderBy = ['createdAt'];
export const WorkspaceJoinRequestDefaultStatus = Object.values(
    EnumWorkspaceJoinRequestStatus
);
