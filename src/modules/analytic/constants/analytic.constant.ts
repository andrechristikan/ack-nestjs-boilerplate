import { EnumActivityLogAction } from '@generated/prisma-client/client';

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
