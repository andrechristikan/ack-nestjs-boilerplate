import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    EnumSessionCursorOrderBy,
    EnumSessionOrderBy,
} from '@modules/session/enums/session.enum';

/** @public */
export const SessionOrderBy = {
    [EnumSessionOrderBy.latest]: [
        {
            [Prisma.SessionScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumSessionOrderBy.recentlyUpdated]: [
        {
            [Prisma.SessionScalarFieldEnum.updatedAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.SessionScalarFieldEnum,
    EnumSessionOrderBy
>;

/** @public */
export const SessionCursorOrderBy = {
    [EnumSessionCursorOrderBy.latest]: [
        {
            [Prisma.SessionScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.SessionScalarFieldEnum,
    EnumSessionCursorOrderBy
>;

/** @public */
export const SessionSharedListCursorScope = 'SessionSharedListCursorScope';
