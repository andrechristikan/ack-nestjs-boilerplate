import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticForgotPasswordAbuseAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Forgot Password Abuse List Request schema for paginated list query.
 * @public
 */
export const AnalyticForgotPasswordAbuseListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticForgotPasswordAbuseAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticForgotPasswordAbuseAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    }).extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticForgotPasswordAbuseListRequestSchema.
 * @public
 */
export type AnalyticForgotPasswordAbuseListRequestDto = z.infer<
    typeof AnalyticForgotPasswordAbuseListRequestSchema
>;
