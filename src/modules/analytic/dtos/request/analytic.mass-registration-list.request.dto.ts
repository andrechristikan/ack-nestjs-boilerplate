import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticKeyCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Mass Registration List Request schema for paginated list query.
 * @public
 */
export const AnalyticMassRegistrationListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(AnalyticKeyCountAvailableOrderBy),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticMassRegistrationListRequestSchema.
 * @public
 */
export type AnalyticMassRegistrationListRequestDto = z.infer<
    typeof AnalyticMassRegistrationListRequestSchema
>;
