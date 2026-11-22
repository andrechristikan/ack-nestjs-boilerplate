import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const PasswordHistoryDefaultAvailableOrderBy = [
    Prisma.PasswordHistoryScalarFieldEnum.createdAt,
    Prisma.PasswordHistoryScalarFieldEnum.expiredAt,
] as const satisfies ReadonlyArray<Prisma.PasswordHistoryScalarFieldEnum>;

/** @public */
export const PasswordHistoryCursorAvailableOrderBy = [
    Prisma.PasswordHistoryScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.PasswordHistoryScalarFieldEnum>;

/** @public */
export const PasswordHistorySharedListCursorScope =
    'PasswordHistorySharedListCursorScope';
