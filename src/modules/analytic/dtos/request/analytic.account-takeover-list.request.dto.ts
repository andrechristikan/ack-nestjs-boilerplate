import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticAccountTakeoverAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

/**
 * Analytic Account Takeover List Request schema for paginated list query.
 * @public
 */
export const AnalyticAccountTakeoverListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOffsetQuerySchema.shape.orderBy.meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticAccountTakeoverAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticAccountTakeoverAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
        })
        .extend(AnalyticDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticAccountTakeoverListRequestSchema.
 * @public
 */
export type AnalyticAccountTakeoverListRequestDto = z.infer<
    typeof AnalyticAccountTakeoverListRequestSchema
>;
