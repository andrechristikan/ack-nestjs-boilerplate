import { Prisma } from '@generated/prisma-client/client';

/**
 * Sort fields the activity-log lists accept.
 * @public
 */
export const ActivityLogDefaultAvailableOrderBy = [
    Prisma.ActivityLogScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.ActivityLogScalarFieldEnum>;

/**
 * Cursor scope of the shared user activity-log list.
 * @public
 */
export const ActivityLogSharedUserListCursorScope =
    'ActivityLogSharedUserListCursorScope';

/**
 * Cursor scope of the shared workspace activity-log list.
 * @public
 */
export const ActivityLogSharedWorkspaceListCursorScope =
    'ActivityLogSharedWorkspaceListCursorScope';
