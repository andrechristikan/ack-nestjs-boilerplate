import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    EnumPasswordHistoryCursorOrderBy,
    EnumPasswordHistoryOrderBy,
} from '@modules/password-history/enums/password-history.enum';

/** @public */
export const PasswordHistoryOrderBy = {
    [EnumPasswordHistoryOrderBy.latest]: [
        {
            [Prisma.PasswordHistoryScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumPasswordHistoryOrderBy.recentlyExpired]: [
        {
            [Prisma.PasswordHistoryScalarFieldEnum.expiredAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.PasswordHistoryScalarFieldEnum,
    EnumPasswordHistoryOrderBy
>;

/** @public */
export const PasswordHistoryCursorOrderBy = {
    [EnumPasswordHistoryCursorOrderBy.latest]: [
        {
            [Prisma.PasswordHistoryScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.PasswordHistoryScalarFieldEnum,
    EnumPasswordHistoryCursorOrderBy
>;

/** @public */
export const PasswordHistorySharedListCursorScope =
    'PasswordHistorySharedListCursorScope';
