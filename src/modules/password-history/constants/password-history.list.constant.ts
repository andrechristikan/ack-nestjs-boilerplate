import { Prisma } from '@generated/prisma-client/client';

/**
 * Sort fields the admin offset password-history list accepts.
 * @public
 */
export const PasswordHistoryDefaultAvailableOrderBy = [
    Prisma.PasswordHistoryScalarFieldEnum.createdAt,
    Prisma.PasswordHistoryScalarFieldEnum.expiredAt,
] as const satisfies ReadonlyArray<Prisma.PasswordHistoryScalarFieldEnum>;

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const PasswordHistoryCursorAvailableOrderBy = [
    Prisma.PasswordHistoryScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.PasswordHistoryScalarFieldEnum>;
