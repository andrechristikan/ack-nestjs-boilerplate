import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { NotificationDefaultAvailableOrderBy } from '@modules/notification/constants/notification.list.constant';

/**
 * Notification List Request schema for paginated list query.
 * @public
 */
export const NotificationListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: PaginationOrderBySchema(NotificationDefaultAvailableOrderBy),
});

/**
 * Inferred DTO for NotificationListRequestSchema.
 * @public
 */
export type NotificationListRequestDto = z.infer<
    typeof NotificationListRequestSchema
>;
