import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const SessionDefaultAvailableOrderBy = [
    Prisma.SessionScalarFieldEnum.createdAt,
    Prisma.SessionScalarFieldEnum.updatedAt,
] as const satisfies ReadonlyArray<Prisma.SessionScalarFieldEnum>;

/** @public */
export const SessionCursorAvailableOrderBy = [
    Prisma.SessionScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.SessionScalarFieldEnum>;

/** @public */
export const SessionSharedListCursorScope = 'SessionSharedListCursorScope';
