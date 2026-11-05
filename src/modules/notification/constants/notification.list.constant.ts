import { Prisma } from '@generated/prisma-client/client';

/**
 * Sort fields the notification list accepts.
 * @public
 */
export const NotificationDefaultAvailableOrderBy = [
    Prisma.NotificationScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.NotificationScalarFieldEnum>;

/**
 * Cursor scope of the shared notification list.
 * @public
 */
export const NotificationSharedListCursorScope =
    'NotificationSharedListCursorScope';
