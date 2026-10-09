import { Prisma } from '@generated/prisma-client/client';

/**
 * Request-store key holding the activity logs staged for flush.
 * @public
 */
export const ActivityLogStageStoreKey = 'ActivityLogStageStoreKey';

/**
 * Columns an analytic read of the activity log returns.
 * @public
 */
export const ActivityLogAnalyticListSelect = {
    id: true,
    userId: true,
    action: true,
    ipAddress: true,
    createdAt: true,
    userAgent: true,
    workspaceId: true,
} satisfies Prisma.ActivityLogSelect;
