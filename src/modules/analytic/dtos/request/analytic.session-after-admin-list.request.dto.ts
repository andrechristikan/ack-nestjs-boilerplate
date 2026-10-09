import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticSessionAfterAdminAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

/**
 * Analytic Session After Admin List Request schema for paginated list query.
 * @public
 */
export const AnalyticSessionAfterAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(
                AnalyticSessionAfterAdminAvailableOrderBy
            ),
        })
        .extend(AnalyticDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticSessionAfterAdminListRequestSchema.
 * @public
 */
export type AnalyticSessionAfterAdminListRequestDto = z.infer<
    typeof AnalyticSessionAfterAdminListRequestSchema
>;
