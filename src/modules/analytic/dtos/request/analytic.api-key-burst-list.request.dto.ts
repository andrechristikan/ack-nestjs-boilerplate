import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticUserCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Api Key Burst List Request schema for paginated list query.
 * @public
 */
export const AnalyticApiKeyBurstListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticUserCountAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticUserCountAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    }).extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticApiKeyBurstListRequestSchema.
 * @public
 */
export type AnalyticApiKeyBurstListRequestDto = z.infer<
    typeof AnalyticApiKeyBurstListRequestSchema
>;
