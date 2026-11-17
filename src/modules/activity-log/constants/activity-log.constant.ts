import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const ActivityLogAnalyticListSelect = {
    id: true,
    userId: true,
    action: true,
    ipAddress: true,
    createdAt: true,
    userAgent: true,
    workspaceId: true,
} satisfies Prisma.ActivityLogSelect;

/** @public */
export const ActivityLogAnalyticCreatedAtSelect = {
    createdAt: true,
} satisfies Prisma.ActivityLogSelect;

/** @public */
export const ActivityLogActionRangeCursorScope =
    'ActivityLogActionRangeCursorScope';
