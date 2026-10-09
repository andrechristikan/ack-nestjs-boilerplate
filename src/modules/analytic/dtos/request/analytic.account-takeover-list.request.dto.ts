import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticAccountTakeoverAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

/**
 * Analytic Account Takeover List Request schema for paginated list query.
 * @public
 */
export const AnalyticAccountTakeoverListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(
                AnalyticAccountTakeoverAvailableOrderBy
            ),
        })
        .extend(AnalyticDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticAccountTakeoverListRequestSchema.
 * @public
 */
export type AnalyticAccountTakeoverListRequestDto = z.infer<
    typeof AnalyticAccountTakeoverListRequestSchema
>;
