import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticNearLockoutAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';

/**
 * Analytic Near Lockout List Request schema for paginated list query.
 * @public
 */
export const AnalyticNearLockoutListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(AnalyticNearLockoutAvailableOrderBy),
    });

/**
 * Inferred DTO for AnalyticNearLockoutListRequestSchema.
 * @public
 */
export type AnalyticNearLockoutListRequestDto = z.infer<
    typeof AnalyticNearLockoutListRequestSchema
>;
