import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { NotificationDefaultAvailableOrderBy } from '@modules/notification/constants/notification.list.constant';

/**
 * Notification List Request schema for paginated list query.
 * @public
 */
export const NotificationListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: PaginationCursorQuerySchema.shape.orderBy.meta({
        description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${NotificationDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
        example: `${NotificationDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
    }),
});

/**
 * Inferred DTO for NotificationListRequestSchema.
 * @public
 */
export type NotificationListRequestDto = z.infer<
    typeof NotificationListRequestSchema
>;
