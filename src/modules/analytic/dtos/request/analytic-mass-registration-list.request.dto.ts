import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticKeyCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Mass Registration List Request schema for paginated list query.
 * @public
 */
export const AnalyticMassRegistrationListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticKeyCountAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticKeyCountAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    }).extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticMassRegistrationListRequestSchema.
 * @public
 */
export type AnalyticMassRegistrationListRequestDto = z.infer<
    typeof AnalyticMassRegistrationListRequestSchema
>;
