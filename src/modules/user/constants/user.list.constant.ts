import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { EnumUserStatus, Prisma } from '@generated/prisma-client/client';
import { EnumUserOrderBy } from '@modules/user/enums/user.enum';

/** @public */
export const UserDefaultAvailableSearch = [
    Prisma.UserScalarFieldEnum.name,
    Prisma.UserScalarFieldEnum.username,
    Prisma.UserScalarFieldEnum.email,
] as const satisfies ReadonlyArray<Prisma.UserScalarFieldEnum>;

/** @public */
export const UserOrderBy = {
    [EnumUserOrderBy.latest]: [
        {
            [Prisma.UserScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumUserOrderBy.name]: [
        {
            [Prisma.UserScalarFieldEnum.name]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.UserScalarFieldEnum,
    EnumUserOrderBy
>;

/** @public */
export const UserDefaultStatus = Object.values(EnumUserStatus);
