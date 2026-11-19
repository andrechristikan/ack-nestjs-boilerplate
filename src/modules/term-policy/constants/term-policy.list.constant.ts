import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';
import {
    EnumTermPolicyAcceptanceOrderBy,
    EnumTermPolicyOrderBy,
} from '@modules/term-policy/enums/term-policy.enum';

/** @public */
export const TermPolicyDefaultStatus = Object.values(EnumTermPolicyStatus);

/** @public */
export const TermPolicyDefaultType = Object.values(EnumTermPolicyType);

/** @public */
export const TermPolicyOrderBy = {
    [EnumTermPolicyOrderBy.latest]: [
        {
            [Prisma.TermPolicyScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumTermPolicyOrderBy.recentlyPublished]: [
        {
            [Prisma.TermPolicyScalarFieldEnum.publishedAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumTermPolicyOrderBy.latestVersion]: [
        {
            [Prisma.TermPolicyScalarFieldEnum.version]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.TermPolicyScalarFieldEnum,
    EnumTermPolicyOrderBy
>;

/** @public */
export const TermPolicyAcceptanceOrderBy = {
    [EnumTermPolicyAcceptanceOrderBy.latest]: [
        {
            [Prisma.TermPolicyUserAcceptanceScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.TermPolicyUserAcceptanceScalarFieldEnum,
    EnumTermPolicyAcceptanceOrderBy
>;

/** @public */
export const TermPolicyPublicListCursorScope =
    'TermPolicyPublicListCursorScope';

/** @public */
export const TermPolicyAcceptanceSharedListCursorScope =
    'TermPolicyAcceptanceSharedListCursorScope';
