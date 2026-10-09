import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticNearLockoutAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';

/**
 * Analytic Near Lockout List Request schema for paginated list query.
 * @public
 */
export const AnalyticNearLockoutListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOffsetQuerySchema.shape.orderBy.meta({
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticNearLockoutAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${AnalyticNearLockoutAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    });

/**
 * Inferred DTO for AnalyticNearLockoutListRequestSchema.
 * @public
 */
export type AnalyticNearLockoutListRequestDto = z.infer<
    typeof AnalyticNearLockoutListRequestSchema
>;
