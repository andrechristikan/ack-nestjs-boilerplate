import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticLoginTimeAnomalyAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticOptionalDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';

/**
 * Analytic Login Time Anomaly List Request schema for paginated list query.
 * @public
 */
export const AnalyticLoginTimeAnomalyListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(
                AnalyticLoginTimeAnomalyAvailableOrderBy
            ),
        })
        .extend(AnalyticOptionalDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticLoginTimeAnomalyListRequestSchema.
 * @public
 */
export type AnalyticLoginTimeAnomalyListRequestDto = z.infer<
    typeof AnalyticLoginTimeAnomalyListRequestSchema
>;
