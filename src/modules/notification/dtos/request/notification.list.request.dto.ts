import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumNotificationOrderBy } from '@modules/notification/enums/notification.enum';

/** @public */
export const NotificationListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: z
        .union([z.enum(EnumNotificationOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumNotificationOrderBy).join(', ')}. An empty or absent value uses \`${EnumNotificationOrderBy.latest}\`.`,
            example: EnumNotificationOrderBy.latest,
        }),
});

/** @public */
export type NotificationListRequestDto = z.infer<
    typeof NotificationListRequestSchema
>;
