import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const NotificationDefaultAvailableOrderBy = [
    Prisma.NotificationScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.NotificationScalarFieldEnum>;

/** @public */
export const NotificationSharedListCursorScope =
    'NotificationSharedListCursorScope';
