import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    EnumProjectCursorOrderBy,
    EnumProjectMemberOrderBy,
    EnumProjectOrderBy,
} from '@modules/project/enums/project.enum';

/** @public */
export const ProjectDefaultAvailableSearch = [
    Prisma.ProjectScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ProjectScalarFieldEnum>;

/** @public */
export const ProjectOrderBy = {
    [EnumProjectOrderBy.latest]: [
        {
            [Prisma.ProjectScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumProjectOrderBy.name]: [
        {
            [Prisma.ProjectScalarFieldEnum.name]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.ProjectScalarFieldEnum,
    EnumProjectOrderBy
>;

/** @public */
export const ProjectCursorOrderBy = {
    [EnumProjectCursorOrderBy.latest]: [
        {
            [Prisma.ProjectScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.ProjectScalarFieldEnum,
    EnumProjectCursorOrderBy
>;

/** @public */
export const ProjectMemberOrderBy = {
    [EnumProjectMemberOrderBy.latest]: [
        {
            [Prisma.ProjectMemberScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumProjectMemberOrderBy.recentlyJoined]: [
        {
            [Prisma.ProjectMemberScalarFieldEnum.joinedAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.ProjectMemberScalarFieldEnum,
    EnumProjectMemberOrderBy
>;

/** @public */
export const ProjectUserListCursorScope = 'ProjectUserListCursorScope';

/** @public */
export const ProjectMemberUserListCursorScope =
    'ProjectMemberUserListCursorScope';
