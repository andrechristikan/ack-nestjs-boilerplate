import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import { EnumAnalyticForgotPasswordAbuseOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticForgotPasswordAbuseListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: z
                .union([
                    z.enum(EnumAnalyticForgotPasswordAbuseOrderBy),
                    z.literal(''),
                ])
                .optional()
                .meta({
                    description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticForgotPasswordAbuseOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticForgotPasswordAbuseOrderBy.mostTokens}\`.`,
                    example: EnumAnalyticForgotPasswordAbuseOrderBy.mostTokens,
                }),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/** @public */
export type AnalyticForgotPasswordAbuseListRequestDto = z.infer<
    typeof AnalyticForgotPasswordAbuseListRequestSchema
>;
