import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticSessionAfterAdminAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

/**
 * Analytic Session After Admin List Request schema for paginated list query.
 * @public
 */
export const AnalyticSessionAfterAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticSessionAfterAdminAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticSessionAfterAdminAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    }).extend(AnalyticDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticSessionAfterAdminListRequestSchema.
 * @public
 */
export type AnalyticSessionAfterAdminListRequestDto = z.infer<
    typeof AnalyticSessionAfterAdminListRequestSchema
>;
