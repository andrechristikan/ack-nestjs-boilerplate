import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const ActivityLogDefaultAvailableOrderBy = [
    Prisma.ActivityLogScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.ActivityLogScalarFieldEnum>;

/** @public */
export const ActivityLogSharedUserListCursorScope =
    'ActivityLogSharedUserListCursorScope';

/** @public */
export const ActivityLogSharedWorkspaceListCursorScope =
    'ActivityLogSharedWorkspaceListCursorScope';
