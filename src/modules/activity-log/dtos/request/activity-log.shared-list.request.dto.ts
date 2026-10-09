import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';

/**
 * Activity Log Shared List Request schema for paginated list query.
 * @public
 */
export const ActivityLogSharedListRequestSchema =
    PaginationCursorQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(ActivityLogDefaultAvailableOrderBy),
    });

/**
 * Inferred DTO for ActivityLogSharedListRequestSchema.
 * @public
 */
export type ActivityLogSharedListRequestDto = z.infer<
    typeof ActivityLogSharedListRequestSchema
>;
