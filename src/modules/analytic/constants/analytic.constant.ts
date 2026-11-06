import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IAnalyticCountRange } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticMassRegistrationActions = [
    EnumActivityLogAction.userSignedUp,
    EnumActivityLogAction.userCreated,
];

/** @public */
export const AnalyticCacheEmptyToken = '_';

/** @public */
export const AnalyticDashboardPagedMetricPattern =
    '{metric}:page={page}:perPage={perPage}';

/** @public */
export const AnalyticCountRanges: IAnalyticCountRange[] = [
    { key: '1', min: 1, max: 1 },
    { key: '2', min: 2, max: 2 },
    { key: '3-5', min: 3, max: 5 },
    { key: '6+', min: 6, max: null },
];
