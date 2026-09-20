import { Prisma } from '@generated/prisma-client/client';

/**
 * Sort fields the admin offset session list accepts.
 * @public
 */
export const SessionDefaultAvailableOrderBy = [
    Prisma.SessionScalarFieldEnum.createdAt,
    Prisma.SessionScalarFieldEnum.updatedAt,
] as const satisfies ReadonlyArray<Prisma.SessionScalarFieldEnum>;

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const SessionCursorAvailableOrderBy = [
    Prisma.SessionScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.SessionScalarFieldEnum>;
