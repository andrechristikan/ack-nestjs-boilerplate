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
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: z
                .union([
                    z.templateLiteral([
                        z.enum(AnalyticFraudRiskScoreAvailableOrderBy),
                        ':',
                        z.enum(EnumPaginationOrderDirectionType),
                    ]),
                    z.array(
                        z.templateLiteral([
                            z.enum(AnalyticFraudRiskScoreAvailableOrderBy),
                            ':',
                            z.enum(EnumPaginationOrderDirectionType),
                        ])
                    ),
                    z.literal(''),
                ])
                .optional()
                .meta({
                    description: `Order by field in \`field:direction\` format (e.g. \`${AnalyticFraudRiskScoreAvailableOrderBy[0]}:desc\`). Available fields: ${AnalyticFraudRiskScoreAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                    example: `${AnalyticFraudRiskScoreAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
                }),
        })
        .extend(AnalyticFraudRiskScoresRequestSchema.shape);

/**
 * Inferred DTO for AnalyticFraudRiskScoresListRequestSchema.
 * @public
 */
export type AnalyticFraudRiskScoresListRequestDto = z.infer<
    typeof AnalyticFraudRiskScoresListRequestSchema
>;
