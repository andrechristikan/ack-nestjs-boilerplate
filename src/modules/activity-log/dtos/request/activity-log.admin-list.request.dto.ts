import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';

/**
 * Activity Log Admin List Request schema for paginated list query.
 * @public
 */
export const ActivityLogAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(ActivityLogDefaultAvailableOrderBy),
    });

/**
 * Inferred DTO for ActivityLogAdminListRequestSchema.
 * @public
 */
export type ActivityLogAdminListRequestDto = z.infer<
    typeof ActivityLogAdminListRequestSchema
>;
