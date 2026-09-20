import { Prisma } from '@generated/prisma-client/client';

/**
 * Sort fields the activity-log lists accept.
 * @public
 */
export const ActivityLogDefaultAvailableOrderBy = [
    Prisma.ActivityLogScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.ActivityLogScalarFieldEnum>;
