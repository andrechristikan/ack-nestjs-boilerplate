import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticImpossibleTravelAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticOptionalDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';

/**
 * Analytic Impossible Travel List Request schema for paginated list query.
 * @public
 */
export const AnalyticImpossibleTravelListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticImpossibleTravelAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticImpossibleTravelAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    }).extend(AnalyticOptionalDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticImpossibleTravelListRequestSchema.
 * @public
 */
export type AnalyticImpossibleTravelListRequestDto = z.infer<
    typeof AnalyticImpossibleTravelListRequestSchema
>;
