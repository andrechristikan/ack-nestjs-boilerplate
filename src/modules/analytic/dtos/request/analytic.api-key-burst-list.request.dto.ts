import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticUserCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Api Key Burst List Request schema for paginated list query.
 * @public
 */
export const AnalyticApiKeyBurstListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(AnalyticUserCountAvailableOrderBy),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticApiKeyBurstListRequestSchema.
 * @public
 */
export type AnalyticApiKeyBurstListRequestDto = z.infer<
    typeof AnalyticApiKeyBurstListRequestSchema
>;
