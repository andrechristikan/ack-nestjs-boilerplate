import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticForgotPasswordAbuseAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/** @public */
export const AnalyticForgotPasswordAbuseListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: z
                .union([
                    z.templateLiteral([
                        z.enum(AnalyticForgotPasswordAbuseAvailableOrderBy),
                        ':',
                        z.enum(EnumPaginationOrderDirectionType),
                    ]),
                    z.literal(''),
                ])
                .optional()
                .meta({
                    description: `Order by field in \`field:direction\` format (e.g. \`${AnalyticForgotPasswordAbuseAvailableOrderBy[0]}:desc\`). Available fields: ${AnalyticForgotPasswordAbuseAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}.`,
                    example: `${AnalyticForgotPasswordAbuseAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
                }),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/** @public */
export type AnalyticForgotPasswordAbuseListRequestDto = z.infer<
    typeof AnalyticForgotPasswordAbuseListRequestSchema
>;
