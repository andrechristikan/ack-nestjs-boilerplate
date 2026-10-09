import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticFraudRiskScoreAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticFraudRiskScoresRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores.request.dto';

/**
 * Analytic Fraud Risk Scores List Request schema for paginated list query.
 * @public
 */
export const AnalyticFraudRiskScoresListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(
                AnalyticFraudRiskScoreAvailableOrderBy
            ),
        })
        .extend(AnalyticFraudRiskScoresRequestSchema.shape);

/**
 * Inferred DTO for AnalyticFraudRiskScoresListRequestSchema.
 * @public
 */
export type AnalyticFraudRiskScoresListRequestDto = z.infer<
    typeof AnalyticFraudRiskScoresListRequestSchema
>;
