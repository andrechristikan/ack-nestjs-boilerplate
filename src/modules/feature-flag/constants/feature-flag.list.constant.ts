import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import { EnumFeatureFlagOrderBy } from '@modules/feature-flag/enums/feature-flag.enum';

/** @public */
export const FeatureFlagDefaultAvailableSearch = [
    Prisma.FeatureFlagScalarFieldEnum.key,
] as const satisfies ReadonlyArray<Prisma.FeatureFlagScalarFieldEnum>;

/** @public */
export const FeatureFlagOrderBy = {
    [EnumFeatureFlagOrderBy.latest]: [
        {
            [Prisma.FeatureFlagScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumFeatureFlagOrderBy.key]: [
        {
            [Prisma.FeatureFlagScalarFieldEnum.key]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.FeatureFlagScalarFieldEnum,
    EnumFeatureFlagOrderBy
>;

/** @public */
export const FeatureFlagSystemListCursorScope =
    'FeatureFlagSystemListCursorScope';
