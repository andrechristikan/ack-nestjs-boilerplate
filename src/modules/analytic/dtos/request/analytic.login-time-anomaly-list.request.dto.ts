import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
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
            orderBy: z
                .union([
                    z.templateLiteral([
                        z.enum(AnalyticLoginTimeAnomalyAvailableOrderBy),
                        ':',
                        z.enum(EnumPaginationOrderDirectionType),
                    ]),
                    z.array(
                        z.templateLiteral([
                            z.enum(AnalyticLoginTimeAnomalyAvailableOrderBy),
                            ':',
                            z.enum(EnumPaginationOrderDirectionType),
                        ])
                    ),
                    z.literal(''),
                ])
                .optional()
                .meta({
                    description: `Order by field in \`field:direction\` format (e.g. \`${AnalyticLoginTimeAnomalyAvailableOrderBy[0]}:desc\`). Available fields: ${AnalyticLoginTimeAnomalyAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                    example: `${AnalyticLoginTimeAnomalyAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
                }),
        })
        .extend(AnalyticOptionalDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticLoginTimeAnomalyListRequestSchema.
 * @public
 */
export type AnalyticLoginTimeAnomalyListRequestDto = z.infer<
    typeof AnalyticLoginTimeAnomalyListRequestSchema
>;
