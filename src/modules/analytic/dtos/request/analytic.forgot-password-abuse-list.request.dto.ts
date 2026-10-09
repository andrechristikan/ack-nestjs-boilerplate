import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticForgotPasswordAbuseAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Forgot Password Abuse List Request schema for paginated list query.
 * @public
 */
export const AnalyticForgotPasswordAbuseListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(
                AnalyticForgotPasswordAbuseAvailableOrderBy
            ),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticForgotPasswordAbuseListRequestSchema.
 * @public
 */
export type AnalyticForgotPasswordAbuseListRequestDto = z.infer<
    typeof AnalyticForgotPasswordAbuseListRequestSchema
>;
