import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import { EnumActivityLogOrderBy } from '@modules/activity-log/enums/activity-log.enum';

/** @public */
export const ActivityLogOrderBy = {
    [EnumActivityLogOrderBy.latest]: [
        {
            [Prisma.ActivityLogScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.ActivityLogScalarFieldEnum,
    EnumActivityLogOrderBy
>;

/** @public */
export const ActivityLogSharedUserListCursorScope =
    'ActivityLogSharedUserListCursorScope';

/** @public */
export const ActivityLogSharedWorkspaceListCursorScope =
    'ActivityLogSharedWorkspaceListCursorScope';
