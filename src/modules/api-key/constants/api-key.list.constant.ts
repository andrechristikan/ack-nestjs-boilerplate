import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { EnumApiKeyType, Prisma } from '@generated/prisma-client/client';
import { EnumApiKeyOrderBy } from '@modules/api-key/enums/api-key.enum';

/** @public */
export const ApiKeyDefaultAvailableSearch = [
    Prisma.ApiKeyScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ApiKeyScalarFieldEnum>;

/** @public */
export const ApiKeyOrderBy = {
    [EnumApiKeyOrderBy.latest]: [
        {
            [Prisma.ApiKeyScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumApiKeyOrderBy.name]: [
        {
            [Prisma.ApiKeyScalarFieldEnum.name]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.ApiKeyScalarFieldEnum,
    EnumApiKeyOrderBy
>;

/** @public */
export const ApiKeyDefaultType = Object.values(EnumApiKeyType);
