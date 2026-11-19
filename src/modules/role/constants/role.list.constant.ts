import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { EnumRoleType, Prisma } from '@generated/prisma-client/client';
import { EnumRoleOrderBy } from '@modules/role/enums/role.enum';

/** @public */
export const RoleDefaultAvailableSearch = [
    Prisma.RoleScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.RoleScalarFieldEnum>;

/** @public */
export const RoleOrderBy = {
    [EnumRoleOrderBy.latest]: [
        {
            [Prisma.RoleScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumRoleOrderBy.name]: [
        {
            [Prisma.RoleScalarFieldEnum.name]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.RoleScalarFieldEnum,
    EnumRoleOrderBy
>;

/** @public */
export const RoleDefaultType = Object.values(EnumRoleType);

/** @public */
export const RoleSystemListCursorScope = 'RoleSystemListCursorScope';
