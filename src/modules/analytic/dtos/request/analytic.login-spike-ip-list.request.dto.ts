import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticLoginSpikeIpAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Login Spike Ip List Request schema for paginated list query.
 * @public
 */
export const AnalyticLoginSpikeIpListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(
                AnalyticLoginSpikeIpAvailableOrderBy
            ),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticLoginSpikeIpListRequestSchema.
 * @public
 */
export type AnalyticLoginSpikeIpListRequestDto = z.infer<
    typeof AnalyticLoginSpikeIpListRequestSchema
>;
