import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import { EnumNotificationOrderBy } from '@modules/notification/enums/notification.enum';

/** @public */
export const NotificationOrderBy = {
    [EnumNotificationOrderBy.latest]: [
        {
            [Prisma.NotificationScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.NotificationScalarFieldEnum,
    EnumNotificationOrderBy
>;

/** @public */
export const NotificationSharedListCursorScope =
    'NotificationSharedListCursorScope';
