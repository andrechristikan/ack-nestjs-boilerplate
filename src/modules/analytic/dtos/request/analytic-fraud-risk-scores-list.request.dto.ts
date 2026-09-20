import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticFraudRiskScoreAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticFraudRiskScoresRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores.request.dto';

/**
 * Analytic Fraud Risk Scores List Request schema for paginated list query.
 * @public
 */
export const AnalyticFraudRiskScoresListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticFraudRiskScoreAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticFraudRiskScoreAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    }).extend(AnalyticFraudRiskScoresRequestSchema.shape);

/**
 * Inferred DTO for AnalyticFraudRiskScoresListRequestSchema.
 * @public
 */
export type AnalyticFraudRiskScoresListRequestDto = z.infer<
    typeof AnalyticFraudRiskScoresListRequestSchema
>;
