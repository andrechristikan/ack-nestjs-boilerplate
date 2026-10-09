import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticImpossibleTravelAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticOptionalDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';

/**
 * Analytic Impossible Travel List Request schema for paginated list query.
 * @public
 */
export const AnalyticImpossibleTravelListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(
                AnalyticImpossibleTravelAvailableOrderBy
            ),
        })
        .extend(AnalyticOptionalDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticImpossibleTravelListRequestSchema.
 * @public
 */
export type AnalyticImpossibleTravelListRequestDto = z.infer<
    typeof AnalyticImpossibleTravelListRequestSchema
>;
