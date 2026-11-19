import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import type {
    IAnalyticLoginSpikeIp,
    IAnalyticNearLockout,
} from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type {
    IAnalyticAccountTakeover,
    IAnalyticCredentialStuffing,
    IAnalyticForgotPasswordAbuse,
    IAnalyticMassRegistration,
    IAnalyticSessionAfterAdmin,
} from '@modules/analytic/interfaces/analytic.fraud.interface';
import {
    EnumAnalyticAccountTakeoverOrderBy,
    EnumAnalyticCountOrderBy,
    EnumAnalyticCredentialStuffingOrderBy,
    EnumAnalyticForgotPasswordAbuseOrderBy,
    EnumAnalyticImpossibleTravelOrderBy,
    EnumAnalyticKeyCountOrderBy,
    EnumAnalyticLoginSpikeIpOrderBy,
    EnumAnalyticNearLockoutOrderBy,
    EnumAnalyticSessionAfterAdminOrderBy,
    EnumAnalyticSnapshotOrderBy,
} from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticNearLockoutOrderBy = {
    [EnumAnalyticNearLockoutOrderBy.latest]: [
        { createdAt: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticNearLockoutOrderBy.id]: [
        { id: EnumPaginationOrderDirectionType.desc },
    ],
} as const satisfies IPaginationOrderByPresets<
    keyof IAnalyticNearLockout,
    EnumAnalyticNearLockoutOrderBy
>;

/** @public */
export const AnalyticLoginSpikeIpOrderBy = {
    [EnumAnalyticLoginSpikeIpOrderBy.mostUsers]: [
        { uniqueUsers: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticLoginSpikeIpOrderBy.mostAttempts]: [
        { attempts: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticLoginSpikeIpOrderBy.ipAddress]: [
        { ipAddress: EnumPaginationOrderDirectionType.asc },
    ],
} as const satisfies IPaginationOrderByPresets<
    keyof IAnalyticLoginSpikeIp,
    EnumAnalyticLoginSpikeIpOrderBy
>;

/** @public */
export const AnalyticCredentialStuffingOrderBy = {
    [EnumAnalyticCredentialStuffingOrderBy.mostUsers]: [
        { uniqueUsers: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticCredentialStuffingOrderBy.mostFailures]: [
        { failCount: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticCredentialStuffingOrderBy.ipAddress]: [
        { ipAddress: EnumPaginationOrderDirectionType.asc },
    ],
} as const satisfies IPaginationOrderByPresets<
    keyof IAnalyticCredentialStuffing,
    EnumAnalyticCredentialStuffingOrderBy
>;

/** @public */
export const AnalyticAccountTakeoverOrderBy = {
    [EnumAnalyticAccountTakeoverOrderBy.latest]: [
        { passwordChangedAt: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticAccountTakeoverOrderBy.userId]: [
        { userId: EnumPaginationOrderDirectionType.asc },
    ],
} as const satisfies IPaginationOrderByPresets<
    keyof IAnalyticAccountTakeover,
    EnumAnalyticAccountTakeoverOrderBy
>;

/** @public */
export const AnalyticSessionAfterAdminOrderBy = {
    [EnumAnalyticSessionAfterAdminOrderBy.latest]: [
        { revokedAt: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticSessionAfterAdminOrderBy.recentLogin]: [
        { loginAt: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticSessionAfterAdminOrderBy.userId]: [
        { userId: EnumPaginationOrderDirectionType.asc },
    ],
} as const satisfies IPaginationOrderByPresets<
    keyof IAnalyticSessionAfterAdmin,
    EnumAnalyticSessionAfterAdminOrderBy
>;

/** @public */
export const AnalyticKeyCountOrderBy = {
    [EnumAnalyticKeyCountOrderBy.mostCount]: [
        { count: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticKeyCountOrderBy.key]: [
        { key: EnumPaginationOrderDirectionType.asc },
    ],
} as const satisfies IPaginationOrderByPresets<
    keyof IAnalyticMassRegistration,
    EnumAnalyticKeyCountOrderBy
>;

/** @public */
export const AnalyticForgotPasswordAbuseOrderBy = {
    [EnumAnalyticForgotPasswordAbuseOrderBy.mostTokens]: [
        { tokenCount: EnumPaginationOrderDirectionType.desc },
    ],
    [EnumAnalyticForgotPasswordAbuseOrderBy.userId]: [
        { userId: EnumPaginationOrderDirectionType.asc },
    ],
} as const satisfies IPaginationOrderByPresets<
    keyof IAnalyticForgotPasswordAbuse,
    EnumAnalyticForgotPasswordAbuseOrderBy
>;

/** @public */
export const AnalyticCountOrderBy = {
    [EnumAnalyticCountOrderBy.mostCount]: [
        { count: EnumPaginationOrderDirectionType.desc },
    ],
} as const satisfies IPaginationOrderByPresets<
    keyof IAnalyticWorkspaceCount,
    EnumAnalyticCountOrderBy
>;

/** @public */
export const AnalyticSnapshotOrderBy = {
    [EnumAnalyticSnapshotOrderBy.highestValue]: [
        {
            [Prisma.AnalyticSnapshotItemScalarFieldEnum.value]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumAnalyticSnapshotOrderBy.key]: [
        {
            [Prisma.AnalyticSnapshotItemScalarFieldEnum.key]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.AnalyticSnapshotItemScalarFieldEnum,
    EnumAnalyticSnapshotOrderBy
>;

/** @public */
export const AnalyticImpossibleTravelOrderBy = {
    [EnumAnalyticImpossibleTravelOrderBy.highestValue]: [
        {
            [Prisma.AnalyticSnapshotItemScalarFieldEnum.value]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumAnalyticImpossibleTravelOrderBy.recent]: [
        {
            [Prisma.AnalyticSnapshotItemScalarFieldEnum.occurredAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumAnalyticImpossibleTravelOrderBy.key]: [
        {
            [Prisma.AnalyticSnapshotItemScalarFieldEnum.key]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.AnalyticSnapshotItemScalarFieldEnum,
    EnumAnalyticImpossibleTravelOrderBy
>;
