import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import {
    EnumWorkspaceCursorOrderBy,
    EnumWorkspaceInviteOrderBy,
    EnumWorkspaceJoinRequestOrderBy,
    EnumWorkspaceMemberOrderBy,
    EnumWorkspaceOrderBy,
} from '@modules/workspace/enums/workspace.enum';

/** @public */
export const WorkspaceDefaultAvailableSearch = [
    Prisma.WorkspaceScalarFieldEnum.slug,
    Prisma.WorkspaceScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.WorkspaceScalarFieldEnum>;

/** @public */
export const WorkspaceOrderBy = {
    [EnumWorkspaceOrderBy.latest]: [
        {
            [Prisma.WorkspaceScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumWorkspaceOrderBy.name]: [
        {
            [Prisma.WorkspaceScalarFieldEnum.name]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.WorkspaceScalarFieldEnum,
    EnumWorkspaceOrderBy
>;

/** @public */
export const WorkspaceCursorOrderBy = {
    [EnumWorkspaceCursorOrderBy.latest]: [
        {
            [Prisma.WorkspaceScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.WorkspaceScalarFieldEnum,
    EnumWorkspaceCursorOrderBy
>;

/** @public */
export const WorkspaceMemberOrderBy = {
    [EnumWorkspaceMemberOrderBy.latest]: [
        {
            [Prisma.WorkspaceMemberScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumWorkspaceMemberOrderBy.recentlyJoined]: [
        {
            [Prisma.WorkspaceMemberScalarFieldEnum.joinedAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.WorkspaceMemberScalarFieldEnum,
    EnumWorkspaceMemberOrderBy
>;

/** @public */
export const WorkspaceInviteOrderBy = {
    [EnumWorkspaceInviteOrderBy.latest]: [
        {
            [Prisma.WorkspaceInviteScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.WorkspaceInviteScalarFieldEnum,
    EnumWorkspaceInviteOrderBy
>;

/** @public */
export const WorkspaceJoinRequestOrderBy = {
    [EnumWorkspaceJoinRequestOrderBy.latest]: [
        {
            [Prisma.WorkspaceJoinRequestScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.WorkspaceJoinRequestScalarFieldEnum,
    EnumWorkspaceJoinRequestOrderBy
>;

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
export const WorkspaceInviteDefaultStatus = Object.values(
    EnumWorkspaceInviteStatus
);

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
