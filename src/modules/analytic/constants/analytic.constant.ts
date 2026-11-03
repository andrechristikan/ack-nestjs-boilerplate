import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IAnalyticCountRange } from '@modules/analytic/interfaces/analytic.interface';

/**
 * Activity actions that register an account from a client, counted per IP for mass registration.
 * @public
 */
export const AnalyticMassRegistrationActions = [
    EnumActivityLogAction.userSignedUp,
    EnumActivityLogAction.userCreated,
];

/**
 * Cache-key token that stands for an open date bound or an absent window.
 * @public
 */
export const AnalyticCacheEmptyToken = '_';

/**
 * Cache metric pattern for one page of a paginated dashboard metric.
 * @public
 */
export const AnalyticDashboardPagedMetricPattern =
    '{metric}:page={page}:perPage={perPage}';

/**
 * Ranges a per-user count distribution (concurrent sessions, devices) is bucketed into; the last range is open-ended.
 * @public
 */
export const AnalyticCountRanges: IAnalyticCountRange[] = [
    { key: '1', min: 1, max: 1 },
    { key: '2', min: 2, max: 2 },
    { key: '3-5', min: 3, max: 5 },
    { key: '6+', min: 6, max: null },
];
